#shared_data.py
import pandas as pd

CSV_FILE_PATH = 'test.csv'
STOCK_PRICES = []
current_row_index = 0

def initialize_stock_data():
    global STOCK_PRICES
    try:
        stock_data = pd.read_csv(CSV_FILE_PATH)
        for index, row in stock_data.iterrows():
            STOCK_PRICES.append(row.to_dict())
    except FileNotFoundError:
        print(f"File not found: {CSV_FILE_PATH}")
    return STOCK_PRICES

def update_stock_prices():
    import time
    global current_row_index
    while True:
        time.sleep(10)
        current_row_index = (current_row_index + 1) % len(STOCK_PRICES)
