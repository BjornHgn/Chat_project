from flask import Blueprint, request, jsonify
import datetime
import uuid

messages_bp = Blueprint('messages', __name__)

# In-memory message store (for users who opt-in to history)
message_store = {}

@messages_bp.route('/history/<recipient_id>', methods=['GET'])
def get_message_history(recipient_id):
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    conversation_id = sorted([user_id, recipient_id])
    conversation_key = f"{conversation_id[0]}:{conversation_id[1]}"
    
    messages = message_store.get(conversation_key, [])
    
    return jsonify(messages), 200

def store_message_in_db(data):
    """Store encrypted message in database (only if not in anonymous mode)"""
    sender_id = data.get('sender_id')
    recipient_id = data.get('recipient_id')
    encrypted_message = data.get('encrypted_message')
    
    conversation_id = sorted([sender_id, recipient_id])
    conversation_key = f"{conversation_id[0]}:{conversation_id[1]}"
    
    if conversation_key not in message_store:
        message_store[conversation_key] = []
    
    message_store[conversation_key].append({
        'id': str(uuid.uuid4()),
        'sender_id': sender_id,
        'encrypted_message': encrypted_message,
        'timestamp': datetime.datetime.utcnow().isoformat()
    })