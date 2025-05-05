from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from flask_migrate import Migrate
import os
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
    print(f"Client connecting with session_id: {session_id}")
    
    if session_id:
        from auth.routes import sessions
        user_id = sessions.get(session_id)
        if user_id:
            join_room(user_id)
            print(f"User {user_id} joined room {user_id}")
        else:
            print(f"Invalid session ID: {session_id}")
    else:
        print("No session ID provided")

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('message')
def handle_message(data):
    print(f"Received message data: {data}")
    print(f"Data type: {type(data)}")
    
    # Try to get sender_id from session if not in data
    if not data.get('sender_id'):
        session_id = request.args.get('session_id')
        if session_id:
            from auth.routes import sessions
            user_id = sessions.get(session_id)
            if user_id:
                data['sender_id'] = user_id
                print(f"Retrieved sender_id from session: {user_id}")
            else:
                print(f"No user_id found for session_id: {session_id}")
        else:
            print("No session_id in request")
    
    print(f"sender_id after checking session: {data.get('sender_id')}")
    
    # Process and forward encrypted messages
    recipient_id = data.get('recipient_id')
    if recipient_id:
        # Store message if requested (non-anonymous mode)
        if data.get('store_history', False):
            print("Storing message in database...")
            success = store_message_in_db(data)
            print(f"Message storage result: {'Success' if success else 'Failed'}")
            
        # Forward the encrypted message to recipient
        socketio.emit('message', data, room=recipient_id)

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
# Modify the last line where you run the app:

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)