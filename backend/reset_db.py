from flask import Flask
from models import db, User, Portfolio

# Create the Flask application
app = Flask(__name__)

# Configure your database URI here
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'  # You can change this to your preferred database
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize the app with the extension
db.init_app(app)

# Now use the app context
with app.app_context():
    db.drop_all()
    db.create_all()
    print("Database tables created.")