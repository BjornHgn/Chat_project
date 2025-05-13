import CryptoJS from 'crypto-js';
import nacl from 'tweetnacl';
import util from 'tweetnacl-util';

// Generate a key pair for a user
export const generateKeyPair = () => {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: util.encodeBase64(keyPair.publicKey),
    privateKey: util.encodeBase64(keyPair.secretKey)
  };
};

// Store keys securely - encrypt with user's password
export const encryptPrivateKey = (privateKey, password) => {
  return CryptoJS.AES.encrypt(privateKey, password).toString();
};

// Decrypt private key with password
export const decryptPrivateKey = (encryptedPrivateKey, password) => {
  const decrypted = CryptoJS.AES.decrypt(encryptedPrivateKey, password);
  return decrypted.toString(CryptoJS.enc.Utf8);
};

// Generate a one-time symmetric key for this message
export const generateMessageKey = () => {
  const randomBytes = nacl.randomBytes(32);
  return util.encodeBase64(randomBytes);
};

// Encrypt a message with recipient's public key
export const encryptMessage = (message, recipientPublicKey, senderPrivateKey) => {
  // Generate a random nonce
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  
  // Convert keys from base64 to Uint8Array
  const pubKey = util.decodeBase64(recipientPublicKey);
  const privKey = util.decodeBase64(senderPrivateKey);
  
  // Convert message to Uint8Array
  const messageUint8 = util.decodeUTF8(message);
  
  // Encrypt
  const encrypted = nacl.box(messageUint8, nonce, pubKey, privKey);
  
  // Combine nonce and encrypted message
  const fullMessage = new Uint8Array(nonce.length + encrypted.length);
  fullMessage.set(nonce);
  fullMessage.set(encrypted, nonce.length);
  
  // Return as base64 string
  return util.encodeBase64(fullMessage);
};

// Decrypt a message with recipient's private key
export const decryptMessage = (encryptedMessage, senderPublicKey, recipientPrivateKey) => {
  // Convert from base64 to Uint8Array
  const messageWithNonceAsUint8Array = util.decodeBase64(encryptedMessage);
  
  // Extract nonce
  const nonce = messageWithNonceAsUint8Array.slice(0, nacl.box.nonceLength);
  
  // Extract message
  const message = messageWithNonceAsUint8Array.slice(
    nacl.box.nonceLength,
    messageWithNonceAsUint8Array.length
  );
  
  // Convert keys from base64 to Uint8Array
  const pubKey = util.decodeBase64(senderPublicKey);
  const privKey = util.decodeBase64(recipientPrivateKey);
  
  // Decrypt
  const decrypted = nacl.box.open(message, nonce, pubKey, privKey);
  
  if (!decrypted) {
    throw new Error('Could not decrypt message');
  }
  
  // Return message as string
  return util.encodeUTF8(decrypted);
};

// Create message signature
export const signMessage = (message, privateKey) => {
  const keyUint8Array = util.decodeBase64(privateKey);
  const messageUint8 = util.decodeUTF8(message);
  const signature = nacl.sign.detached(messageUint8, keyUint8Array);
  return util.encodeBase64(signature);
};

// Verify message signature
export const verifySignature = (message, signature, publicKey) => {
  const signatureUint8Array = util.decodeBase64(signature);
  const publicKeyUint8Array = util.decodeBase64(publicKey);
  const messageUint8 = util.decodeUTF8(message);
  
  return nacl.sign.detached.verify(
    messageUint8,
    signatureUint8Array,
    publicKeyUint8Array
  );
};

// Simple wrapper for compatibility with your current code
export const simplifiedEncrypt = (text) => {
  return CryptoJS.AES.encrypt(text, 'secret-key').toString();
};

export const simplifiedDecrypt = (encryptedText) => {
  return CryptoJS.AES.decrypt(encryptedText, 'secret-key').toString(CryptoJS.enc.Utf8);
};