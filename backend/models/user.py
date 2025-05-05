import uuid
from datetime import datetime

class User:
    def __init__(self, username, password_hash, public_key=None):
        self.id = str(uuid.uuid4())
        self.username = username
        self.password_hash = password_hash
        self.public_key = public_key
        self.created_at = datetime.utcnow()
        self.last_login = None
        
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'public_key': self.public_key,
            'created_at': self.created_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None
        }