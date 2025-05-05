from flask import Blueprint, request, jsonify
import jwt
import datetime
import uuid
from werkzeug.security import generate_password_hash, check_password_hash
from models.user import User, db
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