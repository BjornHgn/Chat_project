from flask_socketio import ConnectionRefusedError

def authenticate_socket(session_id, sessions):
    """Authenticate WebSocket connection using session ID"""
    if session_id not in sessions:
        raise ConnectionRefusedError('Unauthorized')
    return sessions[session_id]