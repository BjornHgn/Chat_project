import React, { useState, useEffect, useRef } from 'react';
import CryptoJS from 'crypto-js';
import { 
  encryptMessage, 
  decryptMessage, 
  simplifiedEncrypt,
  simplifiedDecrypt
} from '../utils/encryption';
import { 
  getCurrentUserKeys,
  getPublicKey,
  storePublicKey
} from '../utils/keyManagement';

function Chat({ user, socket, apiUrl }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isAnonymousMode, setIsAnonymousMode] = useState(false);
  const [messageCache, setMessageCache] = useState({});
  const messagesEndRef = useRef(null);

  const fetchUserPublicKey = async (userId) => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/users/${userId}`);
      if (response.ok) {
        const userData = await response.json();
        if (userData.public_key) {
          storePublicKey(userId, userData.public_key);
          return userData.public_key;
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching user public key:', error);
      return null;
    }
  };

// Add this function right after fetchUsers
const selectUser = async (user) => {
  // Save current messages to cache before switching
  if (selectedUser && messages.length > 0) {
    setMessageCache(prevCache => ({
      ...prevCache,
      [selectedUser.id]: messages
    }));
  }
  
  // Set the new selected user
  setSelectedUser(user);
  
  // Check if we have cached messages for this user
  if (messageCache[user.id] && messageCache[user.id].length > 0) {
    console.log("Loading messages from cache for", user.username);
    setMessages(messageCache[user.id]);
  } else {
    // Clear messages when there's no cache
    setMessages([]);
    
    // Only fetch message history if not in anonymous mode
    if (!isAnonymousMode) {
      try {
        const currentUserId = user.user_id || user.id;
        const response = await fetch(
          `${apiUrl}/api/auth/history/${user.id}?user_id=${currentUserId}`
        );
        
        if (response.ok) {
          const data = await response.json();
          console.log("Fetched message history:", data);
          
          // Filter messages to only show those between current user and selected user
          const filteredData = data.filter(msg => 
            (msg.sender_id === currentUserId && msg.recipient_id === user.id) || 
            (msg.sender_id === user.id && msg.recipient_id === currentUserId)
          );
          
          // Decrypt messages
          const decryptedMessages = filteredData.map((msg) => {
            let decryptedText;
            try {
              decryptedText = simplifiedDecrypt(msg.encrypted_message);
            } catch (error) {
              console.error("Error decrypting message:", error);
              decryptedText = "[Encrypted message]";
            }
            
            return {
              id: msg.id,
              sender_id: msg.sender_id,
              recipient_id: msg.recipient_id || user.id,
              text: decryptedText,
              timestamp: msg.timestamp,
            };
          });
          
          console.log("Decrypted messages:", decryptedMessages);
          setMessages(decryptedMessages);
          
          // Also update cache
          setMessageCache(prevCache => ({
            ...prevCache,
            [user.id]: decryptedMessages
          }));
        }
      } catch (error) {
        console.error('Error fetching message history:', error);
      }
    }
  }
  
  // Scroll to bottom after selecting user (after messages load)
  setTimeout(scrollToBottom, 200);
};

// Add this function to handle caching messages
const updateMessageCache = (userId, newMessage) => {
  setMessageCache(prevCache => {
    // Get existing cache for this user
    const existingMessages = prevCache[userId] || [];
    
    // Check if message already exists in cache to prevent duplicates
    const messageExists = existingMessages.some(msg => msg.id === newMessage.id);
    
    if (messageExists) {
      return prevCache; // Don't update if message already exists
    }
    
    // Add new message and sort by timestamp
    const updatedMessages = [...existingMessages, newMessage]
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return {
      ...prevCache,
      [userId]: updatedMessages
    };
  });
};

// Add this function after fetchUserPublicKey and before selectUser
const fetchUsers = async () => {
  try {
    const response = await fetch(`${apiUrl}/api/auth/users`);
    if (response.ok) {
      const data = await response.json();
      // Filter out current user from the list
      const currentUserId = user.user_id || user.id;
      const filteredUsers = data.filter(u => u.id !== currentUserId);
      setUsers(filteredUsers);
      console.log("Fetched users:", filteredUsers);
    } else {
      console.error('Failed to fetch users');
    }
  } catch (error) {
    console.error('Error fetching users:', error);
  }
};

// Add this function to encrypt messages before sending
const encryptMessageForSending = async (messageText) => {
  try {
    // Get recipient's public key
    let recipientPublicKey = getPublicKey(selectedUser.id);
    
    // If we don't have it yet, fetch it
    if (!recipientPublicKey) {
      recipientPublicKey = await fetchUserPublicKey(selectedUser.id);
    }
    
    // If we have the public key, use proper E2EE
    if (recipientPublicKey) {
      const currentUserKeys = getCurrentUserKeys();
      
      if (currentUserKeys && currentUserKeys.privateKey) {
        // Use proper asymmetric encryption
        return encryptMessage(
          messageText, 
          recipientPublicKey, 
          currentUserKeys.privateKey
        );
      }
    }
    
    // Fallback to simplified encryption
    console.warn('Using simplified encryption as fallback');
    return simplifiedEncrypt(messageText);
  } catch (error) {
    console.error('Encryption error, falling back to simple encryption:', error);
    return simplifiedEncrypt(messageText);
  }
};

  useEffect(() => {
    // Fetch available users
    fetchUsers();
  }, []);
  
// Fix the useEffect hook for message reception
useEffect(() => {
  // Clear previous listeners to prevent duplicates
  socket.off('message');
  
  // Listen for incoming messages
  socket.on('message', (data) => {
    console.log("Received message:", data);
    
    // Make sure we have the current user's ID in a consistent format
    const currentUserId = user.user_id || user.id;
    
    // Check if this message is intended for the current user
    if (data.recipient_id === currentUserId) {
      try {
        // Try to decrypt with proper E2EE if available
        let decryptedText;
        try {
          const senderPublicKey = getPublicKey(data.sender_id);
          const currentUserKeys = getCurrentUserKeys();
          
          if (senderPublicKey && currentUserKeys && currentUserKeys.privateKey) {
            decryptedText = decryptMessage(
              data.encrypted_message,
              senderPublicKey,
              currentUserKeys.privateKey
            );
          } else {
            // Fallback to simplified decryption
            decryptedText = simplifiedDecrypt(data.encrypted_message);
          }
        } catch (error) {
          console.error("Decryption error:", error);
          // Fallback to simplified decryption as last resort
          decryptedText = simplifiedDecrypt(data.encrypted_message);
        }
        
        // Format the new message
        const newMessage = {
          id: data.id || Date.now().toString(),
          sender_id: data.sender_id,
          recipient_id: data.recipient_id,
          text: decryptedText,
          timestamp: data.timestamp || new Date().toISOString(),
        };
        
        console.log("Decrypted message:", newMessage);
        
        // If this is a message from the currently selected user, add it to the chat
        if (selectedUser && data.sender_id === selectedUser.id) {
          console.log("Adding message to current conversation");
          setMessages(prevMessages => [...prevMessages, newMessage]);
          
          // Scroll to the bottom to show the new message
          setTimeout(scrollToBottom, 100);
        }
        
        // Always cache the message
        updateMessageCache(data.sender_id, newMessage);
      } catch (error) {
        console.error("Error processing received message:", error);
      }
    }
  });
  
  return () => {
    socket.off('message');
  };
}, [selectedUser, user]);

// Update the sendMessage function to include both user ID formats
const sendMessage = async () => {
  if (!message.trim() || !selectedUser) return;
  
  // Get the current user ID (handling both formats)
  const currentUserId = user.user_id || user.id;
  
  // Add debug logs
  console.log("Current user:", user);
  console.log("Selected user:", selectedUser);
  
  // Create a unique message ID
  const messageId = Date.now().toString();
  
  // Encrypt the message
  const encryptedMessage = await encryptMessageForSending(message);
  
  // Prepare message data
  const messageData = {
    id: messageId,
    sender_id: currentUserId,
    recipient_id: selectedUser.id,
    encrypted_message: encryptedMessage,
    store_history: !isAnonymousMode, // Don't store if in anonymous mode
    timestamp: new Date().toISOString()
  };
  
  console.log("Sending message data:", messageData);
  
  // Add to local messages first (for immediate feedback)
  const newMessage = {
    id: messageId,
    sender_id: currentUserId,
    recipient_id: selectedUser.id,
    text: message,
    timestamp: new Date().toISOString(),
  };
  
  setMessages(prevMessages => [...prevMessages, newMessage]);
  
  // Then send through WebSocket
  socket.emit('message', messageData);
  
  // Clear input
  setMessage('');
  
  // Scroll to the bottom to show the new message
  setTimeout(scrollToBottom, 100);
};

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="chat-container">
      <div className="users-sidebar">
        <h3>Available Users</h3>
        <div className="anonymous-toggle">
          <label>
            <input
              type="checkbox"
              checked={isAnonymousMode}
              onChange={() => setIsAnonymousMode(!isAnonymousMode)}
            />
            Anonymous Mode
          </label>
        </div>
        <ul>
          {users.map((u) => (
            <li
              key={u.id}
              className={selectedUser?.id === u.id ? 'selected' : ''}
              onClick={() => selectUser(u)}
            >
              {u.username}
            </li>
          ))}
        </ul>
      </div>
      
      <div className="chat-area">
        {selectedUser ? (
          <>
            <div className="chat-header">
              <h3>Chat with {selectedUser.username}</h3>
              {isAnonymousMode && <span className="anonymous-badge">Anonymous Mode</span>}
            </div>
            
            <div className="messages">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${msg.sender_id === (user.user_id || user.id) ? 'sent' : 'received'}`}
                >
                  <div className="message-content">{msg.text}</div>
                  <div className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="message-input">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </>
        ) : (
          <div className="no-chat-selected">
            <p>Select a user to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
export default Chat;