from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
import time
import csv
import threading
import json


# Initialize the Flask application
app = Flask(__name__)

# Enable CORS for all routes
CORS(app, resources={r"/api/*": {"origins": "http://localhost:4200"}})

# Configuration (ensure you have a 'config.py' file defining your configurations)
app.config.from_object('config.Config')

# Initialize the database and JWT manager
db = SQLAlchemy(app)
jwt = JWTManager(app)

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

class Portfolio(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'portfolio'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    cash = db.Column(db.Float, default=10000.0)
    stocks = db.Column(db.JSON, default=lambda:json.dumps({}))
    stock_purchases = db.Column(db.JSON, default=lambda:json.dumps({}))
    transactions = db.Column(db.JSON, default=lambda:json.dumps([]))

# Shared data
STOCK_PRICES = []
current_row_index = 0
GLOBAL_TIMESTAMP=0;
PRICE_UPDATE_INTERVAL=15;


def read_stock_prices_from_csv():
    global STOCK_PRICES
    with open('test.csv', newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        STOCK_PRICES = [row for row in reader]

def update_stock_prices():
    global current_row_index,GLOBAL_TIMESTAMP
    while True:
        current_time=time.time()
        if current_time - GLOBAL_TIMESTAMP >= PRICE_UPDATE_INTERVAL:
            read_stock_prices_from_csv()
            current_row_index += 1
            if current_row_index >= len(STOCK_PRICES):
                current_row_index = 0
            GLOBAL_TIMESTAMP=current_time
        time.sleep(1)

# Start a separate thread to update stock prices
update_thread = threading.Thread(target=update_stock_prices, daemon=True)
update_thread.start()

# Route to get stock prices from CSV
@app.route('/api/stock_prices', methods=['GET'])
def get_stock_prices():
    global STOCK_PRICES,current_row_index,GLOBAL_TIMESTAMP
    return jsonify({
        'prices':STOCK_PRICES[current_row_index],
        'timestamp':GLOBAL_TIMESTAMP
        }), 200

# Registration route
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'Email already exists'}), 409
    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'Username already exists'}), 409

    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
    new_user = User(username=username, email=email, password=hashed_password)
    db.session.add(new_user)
    db.session.commit()

    # Create a portfolio for the new user with the default cash value
    new_portfolio = Portfolio(user_id=new_user.id)
    db.session.add(new_portfolio)
    db.session.commit()

    #Generate a token for the new user
    access_token=create_access_token(identity=new_user.id)

    return jsonify({
        'message': 'User registered successfully',
        'access_token': access_token
        }), 201

# Login route
@app.route('/api/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return '', 204
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password, password):
        return jsonify({'message': 'Invalid credentials'}), 401

    access_token = create_access_token(identity=user.id)
    return jsonify(access_token=access_token), 200

# Fetch portfolio route (requires JWT)
@app.route('/api/portfolio', methods=['GET'])
@jwt_required()
def get_portfolio():
    try:
        print("Request headers:",request.headers)
        user_id = get_jwt_identity()
        print(f"Fetching portfolio for user_id:{{user_id}}")
        portfolio = Portfolio.query.filter_by(user_id=user_id).first()
        if not portfolio:
            return jsonify({'error': 'Portfolio not found for this user'}), 404
        
        stocks = json.loads(portfolio.stocks) if portfolio.stocks else {}
        stock_purchases = json.loads(portfolio.stock_purchases) if portfolio.stock_purchases else {}
        transactions = json.loads(portfolio.transactions) if portfolio.transactions else []
        
        response_data={
            'cash': portfolio.cash,
            'stocks': portfolio.stocks,
            'stock_purchases': portfolio.stock_purchases,
            'transactions': portfolio.transactions
        }
        print(f"Portfolio data:{response_data}")
        return jsonify(response_data),200
    
    except Exception as e:
        print(f"Error fetching portfolio: {str(e)}")
        return jsonify({'error': 'Internal Server Error.'}), 500

# Route to sell stocks (requires JWT)
@app.route('/api/sell', methods=['POST'])
@jwt_required()
def sell_stock():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()    
        symbol = data.get('symbol')
        quantity = data.get('quantity')
    
        if not symbol or not quantity:
            return jsonify({'message': 'Symbol and quantity are required.'}), 400

        try:
            quantity = int(quantity)
        except ValueError:
            return jsonify({'message': 'Quantity must be a valid integer.'}), 400

        if quantity <= 0:
            return jsonify({'message': 'Quantity must be greater than zero.'}), 400

        portfolio = Portfolio.query.filter_by(user_id=user_id).first()
        
        if not portfolio:
            return jsonify({'message': 'Portfolio not found.'}), 404
        
        # Load JSON data
        stocks = json.loads(portfolio.stocks)
        stock_purchases=json.loads(portfolio.stock_purchases)
        transactions = json.loads(portfolio.transactions)
        
        print(f"User {user_id} attempting to sell {quantity} of {symbol}")
        print(f"Current portfolio: {stocks}")

        if symbol not in stocks or stocks[symbol] < quantity:
            return jsonify({'message': 'Insufficient stocks to sell.'}), 400

        stock_price = float(STOCK_PRICES[current_row_index].get(symbol,0))
        total_gain = quantity * stock_price
        remaining_quantity=quantity
        updated_purchases=[]

        for purchase in stock_purchases[symbol]:
            if remaining_quantity==0:
                updated_purchases.append(purchase)
            elif purchase['quantity']<=remaining_quantity:
                total_gain+=purchase['quantity'] * (stock_price -purchase['price'])
                remaining_quantity-=purchase['quantity']
            else:
                total_gain+=remaining_quantity * (stock_price -purchase['price'])
                purchase['quantity']-=remaining_quantity
                updated_purchases.append(purchase)
                remaining_quantity=0

        # Update cash and stocks in portfolio
        portfolio.cash += total_gain
        stocks[symbol] -= quantity

        if stocks[symbol] == 0:
            del stocks[symbol]
            del stock_purchases[symbol]
        else:
            stock_purchases[symbol]=updated_purchases

        # Record the transaction
        transaction = {
            'type': 'sell',
            'symbol': symbol,
            'quantity': quantity,
            'price': stock_price,
            'timestamp': time.time()
        }
        transactions.append(transaction)
        
        # Save updated JSON data
        portfolio.stocks = json.dumps(stocks)
        portfolio.stock_purchases=json.dumps(stock_purchases)
        portfolio.transactions = json.dumps(transactions)
        
        db.session.commit()

        return jsonify({
            'message': 'Stock sold successfully.',
            'balance': portfolio.cash,
            'stocks': stocks,
            'stock_purchases':stock_purchases,
            'price': stock_price,
            'transactions':transactions
        }), 200

    except Exception as e:
        print(f"Error in sell_stock endpoint: {str(e)}")
        return jsonify({'message': f'Internal Server Error: {str(e)}'}), 500

# Route to buy stocks (requires JWT)
@app.route('/api/buy', methods=['POST'])
@jwt_required()
def buy_stock():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        symbol = data['symbol']
        quantity = int(data['quantity'])

        if quantity <= 0:
            return jsonify({'error': 'Quantity must be greater than zero.'}), 400

        portfolio = Portfolio.query.filter_by(user_id=user_id).first()

        if not portfolio:
            return jsonify({'error': 'Portfolio not found.'}), 404

        # Load JSON data
        stocks = json.loads(portfolio.stocks)
        stock_purchases = json.loads(portfolio.stock_purchases)  # Changed from avg_prices
        transactions = json.loads(portfolio.transactions)

        stock_price = float(STOCK_PRICES[current_row_index].get(symbol, 0))
        total_cost = quantity * stock_price

        if portfolio.cash < total_cost:
            return jsonify({'error': 'Insufficient funds to buy stock.'}), 400
        
        # Update cash and stocks in portfolio
        portfolio.cash -= total_cost
        if symbol in stocks:
            stocks[symbol] += quantity
        else:
            stocks[symbol] = quantity

        # Update stock_purchases
        if symbol not in stock_purchases:
            stock_purchases[symbol] = []
        stock_purchases[symbol].append({
            'quantity': quantity,
            'price': stock_price
        })

        # Record the transaction
        transaction = {
            'type': 'buy',
            'symbol': symbol,
            'quantity': quantity,
            'price': stock_price,
            'timestamp': time.time()
        }
        transactions.append(transaction)
        
        # Save updated JSON data
        portfolio.stocks = json.dumps(stocks)
        portfolio.stock_purchases = json.dumps(stock_purchases)
        portfolio.transactions = json.dumps(transactions)
        
        db.session.commit()

        return jsonify({
            'message': 'Stock bought successfully.',
            'balance': portfolio.cash,
            'stocks': stocks,
            'stock_purchases': stock_purchases,
            'price': stock_price,
            'transactions': transactions
        }), 200

    except Exception as e:
        print(f"Error in buy_stock endpoint: {str(e)}")
        return jsonify({'error': 'Internal Server Error.'}), 500
    
#api for the global timestamp
@app.route('/api/current_timestamp',methods=['GET'])
def get_current_timestamp():
    global GLOBAL_TIMESTAMP
    return jsonify({
        'timestamp': GLOBAL_TIMESTAMP
    }),200

# Fetch user portfolio by user_id
@app.route('/api/portfolio/<user_id>', methods=['GET'])
def get_user_portfolio(user_id):
    portfolio = Portfolio.query.filter_by(user_id=user_id).first()
    if not portfolio:
        return jsonify({'error': 'User not found.'}), 404
    return jsonify({
        'cash': portfolio.cash,
        'stocks': portfolio.stocks,
        'transactions': portfolio.transactions
    }), 200

# Ensure database tables are created
with app.app_context():
    db.create_all()

# Verify routes are registered
if __name__ == '__main__':
    print(app.url_map)
    app.run(debug=True)
