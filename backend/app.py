from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from flask_migrate import Migrate
import os
from dotenv import load_dotenv
from config import Config
from models.user import db

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

# Initialize database
db.init_app(app)
migrate = Migrate(app, db)

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="*")

# Import routes after app initialization to avoid circular imports
from auth.routes import auth_bp
from websocket.routes import messages_bp, store_message_in_db

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(messages_bp, url_prefix='/api/messages')

# Other code remains the same...