// Add this at the top with your other imports
import CryptoJS from 'crypto-js';
import nacl from 'tweetnacl';
import util from 'tweetnacl-util';

// Add these variables to store key information
// Store for user keys
let keyStore = {
  // userId -> { publicKey, encryptedPrivateKey }
  users: {},
  // Current user keys
  currentUser: null
};

// Generate and store keys for a user
export const generateAndStoreKeys = async (userId, password) => {
  // Generate new key pair
  const keyPair = generateKeyPair();
  
  // Encrypt private key with password
  const encryptedPrivateKey = encryptPrivateKey(keyPair.privateKey, password);
  
  // Store keys
  keyStore.users[userId] = {
    publicKey: keyPair.publicKey,
    encryptedPrivateKey: encryptedPrivateKey
  };
  
  // Store in localStorage for persistence (encrypted)
  localStorage.setItem(`secureChat_keys_${userId}`, JSON.stringify({
    publicKey: keyPair.publicKey,
    encryptedPrivateKey: encryptedPrivateKey
  }));
  
  return keyPair.publicKey;
};

// Set current user
export const setCurrentUser = (userId, password) => {
  // Try to load from localStorage first
  const storedKeys = localStorage.getItem(`secureChat_keys_${userId}`);
  
  if (storedKeys) {
    const parsedKeys = JSON.parse(storedKeys);
    keyStore.users[userId] = parsedKeys;
    
    try {
      // Test if we can decrypt the private key (validates password)
      const privateKey = decryptPrivateKey(parsedKeys.encryptedPrivateKey, password);
      keyStore.currentUser = {
        userId,
        publicKey: parsedKeys.publicKey,
        privateKey
      };
      return true;
    } catch (error) {
      console.error('Failed to decrypt private key:', error);
      return false;
    }
  } else {
    // No keys found, generate new ones
    generateAndStoreKeys(userId, password)
      .then(publicKey => {
        const privateKey = decryptPrivateKey(keyStore.users[userId].encryptedPrivateKey, password);
        keyStore.currentUser = {
          userId,
          publicKey,
          privateKey
        };
        return true;
      })
      .catch(error => {
        console.error('Failed to generate keys:', error);
        return false;
      });
  }
};

// Get current user's keys
export const getCurrentUserKeys = () => {
  return keyStore.currentUser;
};

// Store a public key for another user
export const storePublicKey = (userId, publicKey) => {
  if (!keyStore.users[userId]) {
    keyStore.users[userId] = { publicKey };
  } else {
    keyStore.users[userId].publicKey = publicKey;
  }
};

// Get a user's public key
export const getPublicKey = (userId) => {
  return keyStore.users[userId]?.publicKey;
};

// Clear keys on logout
export const clearKeys = () => {
  keyStore.currentUser = null;
};