import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    # Flask app secret key
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-key-change-this-in-production')
    
    # Database configuration
    SQLALCHEMY_DATABASE_URI = 'postgresql://postgres:Admin@localhost/securechat'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT settings
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-this')
    JWT_ACCESS_TOKEN_EXPIRES = 3600  # 1 hour
    
    # Socket.IO settings
    CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', '*')