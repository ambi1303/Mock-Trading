from flask import Flask, jsonify
from flask_cors import CORS
import threading
from flask_jwt_extended import jwt_required

from shared_data import initialize_stock_data, update_stock_prices, STOCK_PRICES, current_row_index

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:4200"}})

# Initialize stock data
initialize_stock_data()

# Background thread to update stock prices
thread = threading.Thread(target=update_stock_prices)
thread.start()

# Endpoint to get current stock prices
@app.route('/api/stock_prices', methods=['GET'])
@jwt_required()
def get_stock_prices():
    global current_row_index
    return jsonify(STOCK_PRICES[current_row_index])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050)
