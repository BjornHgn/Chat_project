from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
import os
import base64

def generate_keypair():
    """Generate RSA-4096 key pair for asymmetric encryption"""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=4096,
    )
    public_key = private_key.public_key()
    
    return private_key, public_key

def serialize_public_key(public_key):
    """Convert public key to PEM format for transmission"""
    pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return pem.decode('utf-8')

def encrypt_with_rsa(public_key_pem, message):
    """Encrypt a message using recipient's RSA public key"""
    public_key = serialization.load_pem_public_key(public_key_pem.encode('utf-8'))
    
    encrypted = public_key.encrypt(
        message.encode('utf-8'),
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    return base64.b64encode(encrypted).decode('utf-8')

def decrypt_with_rsa(private_key, encrypted_message):
    """Decrypt a message using recipient's RSA private key"""
    encrypted_bytes = base64.b64decode(encrypted_message.encode('utf-8'))
    
    decrypted = private_key.decrypt(
        encrypted_bytes,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    return decrypted.decode('utf-8')

def generate_aes_key():
    """Generate AES-256 key for symmetric encryption"""
    return os.urandom(32)  # 256 bits = 32 bytes

def encrypt_with_aes(key, message):
    """Encrypt message with AES-256"""
    iv = os.urandom(16)  # AES block size = 16 bytes
    
    cipher = Cipher(algorithms.AES(key), modes.GCM(iv))
    encryptor = cipher.encryptor()
    
    # Convert message to bytes if it's not already
    if isinstance(message, str):
        message = message.encode('utf-8')
    
    ciphertext = encryptor.update(message) + encryptor.finalize()
    
    # Return IV, ciphertext, and tag
    return {
        'iv': base64.b64encode(iv).decode('utf-8'),
        'ciphertext': base64.b64encode(ciphertext).decode('utf-8'),
        'tag': base64.b64encode(encryptor.tag).decode('utf-8')
    }