import React, { useState, useEffect, useRef } from 'react';
import CryptoJS from 'crypto-js';

function Chat({ user, socket, apiUrl }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isAnonymousMode, setIsAnonymousMode] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Fetch available users
    fetchUsers();
    
    // Listen for incoming messages - move this to a separate useEffect
  }, []);
  
  // Add a new useEffect for message handling
  useEffect(() => {
    // Clear previous listeners to prevent duplicates
    socket.off('message');
    
    // Listen for incoming messages
    socket.on('message', (data) => {
      console.log("Received message:", data);
      
      // Always process messages from the currently selected user or to you from any user
      if (data.sender_id === selectedUser?.id || 
          (data.recipient_id === user.id && data.sender_id !== user.id)) {
        // Decrypt the message
        const decryptedMessage = decryptMessage(data.encrypted_message);
        
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: data.id || Date.now().toString(),
            sender_id: data.sender_id,
            text: decryptedMessage,
            timestamp: data.timestamp || new Date().toISOString(),
          },
        ]);
      }
    });
    
    return () => {
      socket.off('message');
    };
  }, [selectedUser, user.id]);

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [messages]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/users`);
      if (response.ok) {
        const data = await response.json();
        // Filter out current user
        setUsers(data.filter((u) => u.id !== user.id));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const selectUser = async (selectedUser) => {
    setSelectedUser(selectedUser);
    
    // Clear messages when switching users
    setMessages([]);
    
    // Only fetch message history if not in anonymous mode
    if (!isAnonymousMode) {
      try {
        const response = await fetch(
          `${apiUrl}/api/messages/history/${selectedUser.id}?user_id=${user.id}`
        );
        
        if (response.ok) {
          const data = await response.json();
          
          // Decrypt messages
          const decryptedMessages = data.map((msg) => ({
            id: msg.id,
            sender_id: msg.sender_id,
            text: decryptMessage(msg.encrypted_message),
            timestamp: msg.timestamp,
          }));
          
          setMessages(decryptedMessages);
        }
      } catch (error) {
        console.error('Error fetching message history:', error);
      }
    }
  };

  const encryptMessage = (text) => {
    // This is a simplified example. In a real app, you'd use proper E2EE
    return CryptoJS.AES.encrypt(text, 'secret-key').toString();
  };

  const decryptMessage = (encryptedText) => {
    // This is a simplified example. In a real app, you'd use proper E2EE
    return CryptoJS.AES.decrypt(encryptedText, 'secret-key').toString(CryptoJS.enc.Utf8);
  };

const sendMessage = () => {
  if (!message.trim() || !selectedUser) return;
  
  // Add debug logs
  console.log("Current user:", user);
  console.log("Selected user:", selectedUser);
  
  // Encrypt the message
  const encryptedMessage = encryptMessage(message);
  
  // Prepare message data
  const messageData = {
    sender_id: user.user_id || user.id, // Try both possible fields
    recipient_id: selectedUser.id,
    encrypted_message: encryptedMessage,
    store_history: !isAnonymousMode, // Don't store if in anonymous mode
  };
  
  console.log("Sending message data:", messageData);
  
  // Send through WebSocket
  socket.emit('message', messageData);
    
    // Add to local messages
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: Date.now().toString(),
        sender_id: user.id,
        text: message,
        timestamp: new Date().toISOString(),
      },
    ]);
    
    // Clear input
    setMessage('');
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
                  className={`message ${msg.sender_id === user.id ? 'sent' : 'received'}`}
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