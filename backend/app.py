from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from flask_migrate import Migrate
import os
import uuid  # Add this import
import datetime  # Add this import
from dotenv import load_dotenv
from config import Config
from models.user import db
from flask_socketio import join_room, leave_room
from flask import request

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


@socketio.on('connect')
def handle_connect():
    session_id = request.args.get('session_id')
    user_id = request.args.get('user_id')
    
    print(f"Client connecting with session_id: {session_id}, user_id: {user_id}")
    
    if session_id:
        from auth.routes import sessions
        session_user_id = sessions.get(session_id)
        
        if session_user_id:
            # Join a room with the user's ID
            join_room(session_user_id)
            print(f"User {session_user_id} joined room {session_user_id}")
            
            # For redundancy, also join a room with user_id from query param if provided
            if user_id and user_id != session_user_id:
                join_room(user_id)
                print(f"User also joined room {user_id}")
            
            return True
        else:
            print(f"Invalid session ID: {session_id}")
            return False
    elif user_id:
        # Fallback if only user_id is provided
        join_room(user_id)
        print(f"User joined room {user_id} using only user_id")
        return True
    else:
        print("No session ID or user ID provided")
        return False

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('message')
def handle_message(data):
    print(f"Received message data: {data}")
    
    # Validate data
    sender_id = data.get('sender_id')
    recipient_id = data.get('recipient_id')
    
    if not sender_id or not recipient_id:
        print("Error: Missing sender_id or recipient_id")
        return
        
    print(f"Processing message from {sender_id} to {recipient_id}")
    
    # Store message if requested (non-anonymous mode)
    if data.get('store_history', False):
        print("Storing message in database...")
        success = store_message_in_db(data)
        print(f"Message storage result: {'Success' if success else 'Failed'}")
    
    # Add timestamp if not present
    if 'timestamp' not in data:
        data['timestamp'] = datetime.datetime.utcnow().isoformat()
    
    # Ensure we have an ID for the message
    if 'id' not in data:
        data['id'] = str(uuid.uuid4())
    
    # Forward the encrypted message to recipient
    print(f"Forwarding message to recipient room: {recipient_id}")
    socketio.emit('message', data, room=recipient_id)
    
    # Also send back to sender for confirmation
    print(f"Sending confirmation to sender room: {sender_id}")
    socketio.emit('message_sent', {
        'id': data.get('id', str(uuid.uuid4())),
        'recipient_id': recipient_id,
        'timestamp': data.get('timestamp')
    }, room=sender_id)

# Add this for debugging
@app.route('/debug/test_db')
def test_db():
    from models.message import Message
    try:
        db.session.query(Message).first()
        return "Database connection working"
    except Exception as e:
        return f"Database error: {str(e)}"

# Run the application
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)