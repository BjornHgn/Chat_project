from flask import Blueprint, request, jsonify
import jwt
import datetime
import uuid
from werkzeug.security import generate_password_hash, check_password_hash

# Create the auth blueprint
auth_bp = Blueprint('auth', __name__)

# In-memory user database (replace with database in production)
users = {}
# In-memory session storage (replace with Redis in production)
sessions = {}

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    if username in users:
        return jsonify({'error': 'Username already exists'}), 400
    
    # For simplicity, we're not generating actual keypairs yet
    # In a real app, you'd generate public/private keys here
    
    # Create new user
    user = {
        'id': str(uuid.uuid4()),
        'username': username,
        'password_hash': generate_password_hash(password),
        'public_key': 'dummy-public-key',  # Placeholder
        'created_at': datetime.datetime.utcnow().isoformat(),
        'last_login': None
    }
    
    users[username] = user
    
    return jsonify({
        'message': 'User registered successfully',
        'public_key': user['public_key']
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    user = users.get(username)
    
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Update last login
    user['last_login'] = datetime.datetime.utcnow().isoformat()
    
    # Generate JWT token
    token = jwt.encode({
        'user_id': user['id'],
        'username': user['username'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, 'your-secret-key')  # Use SECRET_KEY from environment in production
    
    # Create a session for WebSocket authentication
    session_id = str(uuid.uuid4())
    sessions[session_id] = user['id']
    
    return jsonify({
        'token': token,
        'session_id': session_id,
        'user_id': user['id'],
        'username': user['username']
    }), 200

@auth_bp.route('/users', methods=['GET'])
def get_users():
    # This would be protected with JWT in production
    user_list = [{
        'id': user['id'],
        'username': user['username'],
        'public_key': user['public_key'],
        'created_at': user['created_at'],
        'last_login': user['last_login']
    } for user in users.values()]
    
    return jsonify(user_list), 200