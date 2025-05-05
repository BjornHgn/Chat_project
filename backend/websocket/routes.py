from flask import Blueprint, request, jsonify
import datetime
import uuid
from models.message import Message
from models.user import db, User

messages_bp = Blueprint('messages', __name__)

@messages_bp.route('/history/<recipient_id>', methods=['GET'])
def get_message_history(recipient_id):
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    # Verify both users exist
    user = User.query.get(user_id)
    recipient = User.query.get(recipient_id)
    
    if not user or not recipient:
        return jsonify({'error': 'Invalid user or recipient ID'}), 404
    
    # Query database for messages between users (in either direction)
    messages = Message.query.filter(
        ((Message.sender_id == user_id) & (Message.recipient_id == recipient_id)) | 
        ((Message.sender_id == recipient_id) & (Message.recipient_id == user_id))
    ).order_by(Message.timestamp).all()
    
    # Convert to dictionary format
    message_list = [message.to_dict() for message in messages]
    
    return jsonify(message_list), 200

def store_message_in_db(data):
    """Store encrypted message in database"""
    try:
        sender_id = data.get('sender_id')
        recipient_id = data.get('recipient_id')
        encrypted_message = data.get('encrypted_message')
        
        # Validate required fields
        if not sender_id:
            print("ERROR: sender_id is missing or null")
            return False
            
        if not recipient_id:
            print("ERROR: recipient_id is missing or null")
            return False
            
        if not encrypted_message:
            print("ERROR: encrypted_message is missing or null")
            return False
        
        print(f"Creating message with sender_id: {sender_id}, recipient_id: {recipient_id}")
        
        # Create new message
        message = Message(
            id=str(uuid.uuid4()),
            sender_id=sender_id,
            recipient_id=recipient_id,
            encrypted_message=encrypted_message
        )
        
        # Save to database
        db.session.add(message)
        db.session.commit()
        
        return True
    except Exception as e:
        print(f"Error storing message: {str(e)}")
        db.session.rollback()
        return False