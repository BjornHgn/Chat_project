from flask import Blueprint, request, jsonify
import jwt
import datetime
import uuid
from werkzeug.security import generate_password_hash, check_password_hash
from models.user import User, db
from models.message import Message
from encryption.utils import generate_keypair, serialize_public_key

# Create the auth blueprint
auth_bp = Blueprint('auth', __name__)

# In-memory session storage (replace with Redis in production)
sessions = {}

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        return jsonify({'error': 'Username already exists'}), 400
    
    # Generate keypair for E2EE
    private_key, public_key = generate_keypair()
    
    # Create new user
    password_hash = generate_password_hash(password)
    user = User(username, password_hash, serialize_public_key(public_key))
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({
        'message': 'User registered successfully',
        'public_key': user.public_key
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    user = User.query.filter_by(username=username).first()
    
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Update last login
    user.last_login = datetime.datetime.utcnow()
    db.session.commit()
    
    # Generate JWT token
    token = jwt.encode({
        'user_id': user.id,
        'username': user.username,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, 'your-secret-key')  # Use SECRET_KEY from environment in production
    
    # Create a session for WebSocket authentication
    session_id = str(uuid.uuid4())
    sessions[session_id] = user.id
    
    return jsonify({
        'token': token,
        'session_id': session_id,
        'user_id': user.id,
        'username': user.username
    }), 200

@auth_bp.route('/users', methods=['GET'])
def get_users():
    # This would be protected with JWT in production
    users = User.query.all()
    user_list = [user.to_dict() for user in users]
    
    return jsonify(user_list), 200

@auth_bp.route('/refresh', methods=['POST'])
def refresh_token():
    # Get token from Authorization header
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing or invalid token'}), 401
    
    token = auth_header.split(' ')[1]
    
    try:
        # Verify the token
        payload = jwt.decode(token, 'your-secret-key', algorithms=['HS256'])
        user_id = payload.get('user_id')
        
        # Check if user exists
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Generate new token
        new_token = jwt.encode({
            'user_id': user.id,
            'username': user.username,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, 'your-secret-key')
        
        # Create a new session for WebSocket authentication
        session_id = str(uuid.uuid4())
        sessions[session_id] = user.id
        
        return jsonify({
            'token': new_token,
            'session_id': session_id
        }), 200
        
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token has expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Invalid token'}), 401
    
@auth_bp.route('/users/<user_id>', methods=['GET'])
def get_user_detail(user_id):
    """Get a specific user's details including public key"""
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    return jsonify(user.to_dict()), 200

@auth_bp.route('/keys/update', methods=['POST'])
def update_public_key():
    """Update a user's public key"""
    # Get token from Authorization header
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing or invalid token'}), 401
    
    token = auth_header.split(' ')[1]
    
    try:
        # Verify the token
        payload = jwt.decode(token, 'your-secret-key', algorithms=['HS256'])
        user_id = payload.get('user_id')
        
        # Check if user exists
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Get the public key from request body
        data = request.get_json()
        public_key = data.get('public_key')
        
        if not public_key:
            return jsonify({'error': 'Public key is required'}), 400
            
        # Update user's public key
        user.public_key = public_key
        db.session.commit()
        
        return jsonify({'message': 'Public key updated successfully'}), 200
        
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token has expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Invalid token'}), 401

@auth_bp.route('/history/<recipient_id>', methods=['GET'])
def get_message_history(recipient_id):
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    # Verify both users exist
    user = User.query.get(user_id)
    recipient = User.query.get(recipient_id)
    
    if not user or not recipient:
        return jsonify({'error': 'Invalid user or recipient ID'}), 404
    
    # Explicitly log what we're querying for
    print(f"Fetching message history between user {user_id} and {recipient_id}")
    
    # Query database for messages between users (in either direction)
    messages = Message.query.filter(
        ((Message.sender_id == user_id) & (Message.recipient_id == recipient_id)) | 
        ((Message.sender_id == recipient_id) & (Message.recipient_id == user_id))
    ).order_by(Message.timestamp).all()
    
    # Convert to dictionary format
    message_list = []
    for message in messages:
        message_dict = message.to_dict()
        # Make sure recipient_id is included
        if 'recipient_id' not in message_dict:
            message_dict['recipient_id'] = message.recipient_id
        message_list.append(message_dict)
    
    print(f"Found {len(message_list)} messages")
    return jsonify(message_list), 200