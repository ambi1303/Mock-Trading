"""
app.py - Complete Flask application for Mock-Trading, with JWT auth, 
SQLite DB, CSV-based stock updates, and buy/sell routes.
"""

import time
import csv
import json
import threading

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

# =========================
#  CONFIG
# =========================

class Config:
    SECRET_KEY = "mysecretkey"
    SQLALCHEMY_DATABASE_URI = "sqlite:///users.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = "jwtsecretkey"  # For JWT signing

# =========================
#  FLASK APP & EXTENSIONS
# =========================

app = Flask(__name__)
app.config.from_object(Config)

db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# =========================
#  MODELS
# =========================

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

class Portfolio(db.Model):
    __tablename__ = "portfolio"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    cash = db.Column(db.Float, default=10000.0)
    stocks = db.Column(db.JSON, default=lambda: json.dumps({}))
    stock_purchases = db.Column(db.JSON, default=lambda: json.dumps({}))
    transactions = db.Column(db.JSON, default=lambda: json.dumps([]))

# =========================
#  CSV BACKGROUND THREAD
# =========================

STOCK_PRICES = []
current_row_index = 0
GLOBAL_TIMESTAMP = 0
PRICE_UPDATE_INTERVAL = 15  # seconds

def read_stock_prices_from_csv():
    global STOCK_PRICES
    try:
        with open("test.csv", newline="") as csvfile:
            reader = csv.DictReader(csvfile)
            STOCK_PRICES = [row for row in reader]
    except FileNotFoundError:
        print("Warning: test.csv not found. STOCK_PRICES will remain empty.")

def update_stock_prices():
    global current_row_index, GLOBAL_TIMESTAMP
    while True:
        now = time.time()
        if now - GLOBAL_TIMESTAMP >= PRICE_UPDATE_INTERVAL:
            read_stock_prices_from_csv()
            current_row_index += 1
            if current_row_index >= len(STOCK_PRICES):
                current_row_index = 0
            GLOBAL_TIMESTAMP = now
        time.sleep(1)

# Start the background thread
update_thread = threading.Thread(target=update_stock_prices, daemon=True)
update_thread.start()

# =========================
#  CREATE DB AT STARTUP
# =========================

@app.before_first_request
def create_tables():
    db.create_all()

# =========================
#  ROUTES
# =========================

# ---------- STOCK PRICES ----------
@app.route("/api/stock_prices", methods=["GET"])
def get_stock_prices():
    """
    Returns the current row of prices from test.csv
    """
    global STOCK_PRICES, current_row_index, GLOBAL_TIMESTAMP
    if not STOCK_PRICES:
        return jsonify({"prices": {}, "timestamp": GLOBAL_TIMESTAMP}), 200
    return jsonify({
        "prices": STOCK_PRICES[current_row_index],
        "timestamp": GLOBAL_TIMESTAMP
    }), 200

# ---------- REGISTER ----------
@app.route("/api/register", methods=["POST"])
def register():
    """
    Register a new user with username, email, and password.
    Returns an access token on success.
    """
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return jsonify({"message": "Missing username, email, or password"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already exists"}), 409
    if User.query.filter_by(username=username).first():
        return jsonify({"message": "Username already exists"}), 409

    hashed_password = generate_password_hash(password, method="pbkdf2:sha256")
    new_user = User(username=username, email=email, password=hashed_password)
    db.session.add(new_user)
    db.session.commit()

    # Create a portfolio for the new user
    new_portfolio = Portfolio(user_id=new_user.id)
    db.session.add(new_portfolio)
    db.session.commit()

    # Return a JWT (cast user.id to string to avoid "Subject must be a string")
    access_token = create_access_token(identity=str(new_user.id))
    return jsonify({
        "message": "User registered successfully",
        "access_token": access_token
    }), 201

# ---------- LOGIN ----------
@app.route("/api/login", methods=["POST"])
def login():
    """
    Login using email + password.
    Returns an access token on success.
    """
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "Missing email or password"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({"message": "Invalid credentials"}), 401

    # Return a JWT (cast user.id to string)
    access_token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": access_token}), 200

# ---------- PORTFOLIO (Protected) ----------
@app.route("/api/portfolio", methods=["GET"])
@jwt_required()
def get_portfolio():
    """
    Returns the logged-in user's portfolio.
    """
    try:
        user_id_str = get_jwt_identity()  # This will be a string
        user_id = int(user_id_str)        # Convert back to int if needed

        portfolio = Portfolio.query.filter_by(user_id=user_id).first()
        if not portfolio:
            return jsonify({"error": "Portfolio not found"}), 404

        stocks = json.loads(portfolio.stocks) if portfolio.stocks else {}
        stock_purchases = json.loads(portfolio.stock_purchases) if portfolio.stock_purchases else {}
        transactions = json.loads(portfolio.transactions) if portfolio.transactions else []

        response_data = {
            "cash": portfolio.cash,
            "stocks": stocks,
            "stock_purchases": stock_purchases,
            "transactions": transactions
        }
        return jsonify(response_data), 200

    except Exception as e:
        print(f"Error fetching portfolio: {str(e)}")
        return jsonify({"error": "Internal Server Error"}), 500

# ---------- BUY STOCK (Protected) ----------
@app.route("/api/buy", methods=["POST"])
@jwt_required()
def buy_stock():
    """
    Buys the given quantity of a stock for the logged-in user.
    Body: { "symbol": "...", "quantity": <int> }
    """
    try:
        data = request.get_json()
        user_id = int(get_jwt_identity())
        symbol = data["symbol"]
        quantity = int(data["quantity"])

        if quantity <= 0:
            return jsonify({"error": "Quantity must be greater than zero."}), 400

        portfolio = Portfolio.query.filter_by(user_id=user_id).first()
        if not portfolio:
            return jsonify({"error": "Portfolio not found."}), 404

        # Load JSON data
        stocks = json.loads(portfolio.stocks)
        stock_purchases = json.loads(portfolio.stock_purchases)
        transactions = json.loads(portfolio.transactions)

        # Get the current stock price from CSV
        if not STOCK_PRICES:
            return jsonify({"error": "No stock price data available."}), 400
        current_prices = STOCK_PRICES[current_row_index]
        stock_price = float(current_prices.get(symbol, 0))

        total_cost = quantity * stock_price
        if portfolio.cash < total_cost:
            return jsonify({"error": "Insufficient funds to buy stock."}), 400

        # Update portfolio
        portfolio.cash -= total_cost
        stocks[symbol] = stocks.get(symbol, 0) + quantity

        # Update stock_purchases
        if symbol not in stock_purchases:
            stock_purchases[symbol] = []
        stock_purchases[symbol].append({
            "quantity": quantity,
            "price": stock_price
        })

        # Record the transaction
        transaction = {
            "type": "buy",
            "symbol": symbol,
            "quantity": quantity,
            "price": stock_price,
            "timestamp": time.time()
        }
        transactions.append(transaction)

        # Save updates
        portfolio.stocks = json.dumps(stocks)
        portfolio.stock_purchases = json.dumps(stock_purchases)
        portfolio.transactions = json.dumps(transactions)
        db.session.commit()

        return jsonify({
            "message": "Stock bought successfully.",
            "balance": portfolio.cash,
            "stocks": stocks,
            "stock_purchases": stock_purchases,
            "price": stock_price,
            "transactions": transactions
        }), 200

    except Exception as e:
        print(f"Error in buy_stock endpoint: {str(e)}")
        return jsonify({"error": "Internal Server Error."}), 500

# ---------- SELL STOCK (Protected) ----------
@app.route("/api/sell", methods=["POST"])
@jwt_required()
def sell_stock():
    """
    Sells the given quantity of a stock for the logged-in user.
    Body: { "symbol": "...", "quantity": <int> }
    """
    try:
        data = request.get_json()
        user_id = int(get_jwt_identity())
        symbol = data.get("symbol")
        quantity = data.get("quantity")

        if not symbol or quantity is None:
            return jsonify({"message": "Symbol and quantity are required."}), 400

        try:
            quantity = int(quantity)
        except ValueError:
            return jsonify({"message": "Quantity must be an integer."}), 400

        if quantity <= 0:
            return jsonify({"message": "Quantity must be greater than zero."}), 400

        portfolio = Portfolio.query.filter_by(user_id=user_id).first()
        if not portfolio:
            return jsonify({"message": "Portfolio not found."}), 404

        # Load JSON data
        stocks = json.loads(portfolio.stocks)
        stock_purchases = json.loads(portfolio.stock_purchases)
        transactions = json.loads(portfolio.transactions)

        if symbol not in stocks or stocks[symbol] < quantity:
            return jsonify({"message": "Insufficient stocks to sell."}), 400

        if not STOCK_PRICES:
            return jsonify({"error": "No stock price data available."}), 400
        current_prices = STOCK_PRICES[current_row_index]
        stock_price = float(current_prices.get(symbol, 0))

        total_gain = quantity * stock_price
        remaining_quantity = quantity
        updated_purchases = []

        # FIFO logic for removing shares from earliest purchase
        for purchase in stock_purchases.get(symbol, []):
            if remaining_quantity == 0:
                updated_purchases.append(purchase)
            elif purchase["quantity"] <= remaining_quantity:
                total_gain += purchase["quantity"] * (stock_price - purchase["price"])
                remaining_quantity -= purchase["quantity"]
            else:
                total_gain += remaining_quantity * (stock_price - purchase["price"])
                purchase["quantity"] -= remaining_quantity
                updated_purchases.append(purchase)
                remaining_quantity = 0

        # Update portfolio
        portfolio.cash += total_gain
        stocks[symbol] -= quantity
        if stocks[symbol] == 0:
            del stocks[symbol]
            del stock_purchases[symbol]
        else:
            stock_purchases[symbol] = updated_purchases

        # Record the transaction
        transaction = {
            "type": "sell",
            "symbol": symbol,
            "quantity": quantity,
            "price": stock_price,
            "timestamp": time.time()
        }
        transactions.append(transaction)

        portfolio.stocks = json.dumps(stocks)
        portfolio.stock_purchases = json.dumps(stock_purchases)
        portfolio.transactions = json.dumps(transactions)
        db.session.commit()

        return jsonify({
            "message": "Stock sold successfully.",
            "balance": portfolio.cash,
            "stocks": stocks,
            "stock_purchases": stock_purchases,
            "price": stock_price,
            "transactions": transactions
        }), 200

    except Exception as e:
        print(f"Error in sell_stock endpoint: {str(e)}")
        return jsonify({"message": f"Internal Server Error: {str(e)}"}), 500

# ---------- TIMESTAMP (Unprotected) ----------
@app.route("/api/current_timestamp", methods=["GET"])
def get_current_timestamp():
    """
    Returns the current GLOBAL_TIMESTAMP used for price rotation.
    """
    global GLOBAL_TIMESTAMP
    return jsonify({"timestamp": GLOBAL_TIMESTAMP}), 200

# ---------- GET PORTFOLIO BY USER_ID (Unprotected or Protected?) ----------
@app.route("/api/portfolio/<int:user_id>", methods=["GET"])
def get_user_portfolio(user_id):
    """
    Returns the portfolio for a given user_id.
    """
    portfolio = Portfolio.query.filter_by(user_id=user_id).first()
    if not portfolio:
        return jsonify({"error": "User not found."}), 404
    return jsonify({
        "cash": portfolio.cash,
        "stocks": portfolio.stocks,
        "transactions": portfolio.transactions
    }), 200

# =========================
#  MAIN
# =========================

if __name__ == "__main__":
    print("Registered Routes:")
    print(app.url_map)
    app.run(debug=True)
