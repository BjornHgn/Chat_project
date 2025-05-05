from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-key-please-change')
CORS(app)

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="*")

# Import routes after app initialization to avoid circular imports
from auth.routes import auth_bp
from websocket.routes import messages_bp, store_message_in_db

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(messages_bp, url_prefix='/api/messages')

# Register socket event handlers here
@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('message')
def handle_message(data):
    # Process and forward encrypted messages
    recipient_id = data.get('recipient_id')
    if recipient_id:
        # Store message if requested (non-anonymous mode)
        if data.get('store_history', False):
            store_message_in_db(data)
            
        # Forward the encrypted message to recipient
        socketio.emit('message', data, room=recipient_id)

# Main entry point
if __name__ == '__main__':
    socketio.run(app, debug=True)