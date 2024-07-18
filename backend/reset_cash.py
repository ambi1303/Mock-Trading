# Import necessary modules
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config  # Adjust based on your configuration

# Initialize Flask application
app = Flask(__name__)
app.config.from_object(Config)

# Initialize SQLAlchemy
db = SQLAlchemy(app)

# Models (adjust based on your actual models)
class Portfolio(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    cash = db.Column(db.Float, default=10000.0)
    stocks = db.Column(db.PickleType, default={})
    transactions = db.Column(db.PickleType, default=[])

# Function to reset cash to 10000 for all portfolios
def reset_cash():
    with app.app_context():  # Use the Flask application context
        try:
            # Query all portfolios
            portfolios = Portfolio.query.all()

            # Update cash to 10000 for each portfolio
            for portfolio in portfolios:
                portfolio.cash = 10000.0

            # Commit changes to the database
            db.session.commit()
            print("Cash reset successfully.")

        except Exception as e:
            db.session.rollback()
            print(f"Error resetting cash: {str(e)}")

        finally:
            db.session.close()

# Run the script to reset cash
if __name__ == '__main__':
    reset_cash()
