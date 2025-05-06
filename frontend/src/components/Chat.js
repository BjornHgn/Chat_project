import React, { useState, useEffect, useRef } from 'react';
import CryptoJS from 'crypto-js';

function Chat({ user, socket, apiUrl }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isAnonymousMode, setIsAnonymousMode] = useState(false);
  const [messageCache, setMessageCache] = useState({});
  const messagesEndRef = useRef(null);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/users`);
      if (response.ok) {
        const data = await response.json();
        // Filter out current user
        setUsers(data.filter(u => u.id !== user.id));
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    // Fetch available users
    fetchUsers();
  }, []);
  
  useEffect(() => {
    // Clear previous listeners to prevent duplicates
    socket.off('message');
    
    // Listen for incoming messages
    socket.on('message', (data) => {
      console.log("Received message:", data);
      
      // Only process messages that belong to the current conversation
      if ((data.sender_id === selectedUser?.id && data.recipient_id === user.id) || 
          (data.sender_id === user.id && data.recipient_id === selectedUser?.id)) {
        
        // Decrypt the message
        const decryptedMessage = decryptMessage(data.encrypted_message);
        
        const newMessage = {
          id: data.id || Date.now().toString(),
          sender_id: data.sender_id,
          recipient_id: data.recipient_id,
          text: decryptedMessage,
          timestamp: data.timestamp || new Date().toISOString(),
        };
        
        // Add to current messages if this is the active conversation
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        
        // Always update the cache for the conversation partner
        const conversationPartnerId = data.sender_id === user.id ? data.recipient_id : data.sender_id;
        updateMessageCache(conversationPartnerId, newMessage);
      } else if (data.recipient_id === user.id) {
        // This is a message for you, but not from your currently selected user
        // Just update the cache so it's available when you switch to that conversation
        const decryptedMessage = decryptMessage(data.encrypted_message);
        
        const newMessage = {
          id: data.id || Date.now().toString(),
          sender_id: data.sender_id,
          recipient_id: data.recipient_id,
          text: decryptedMessage,
          timestamp: data.timestamp || new Date().toISOString(),
        };
        
        // Add to the cache but not to current view
        updateMessageCache(data.sender_id, newMessage);
      }
    });
    
    return () => {
      socket.off('message');
    };
  }, [selectedUser, user.id]);

  // Modified updateMessageCache to ensure proper message ordering
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

  // Fix selectUser function to properly store and retrieve cached messages
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
      setMessages(messageCache[user.id]);
    } else {
      // Clear messages when there's no cache
      setMessages([]);
      
      // Only fetch message history if not in anonymous mode
      if (!isAnonymousMode) {
        try {
          const response = await fetch(
            `${apiUrl}/api/messages/history/${user.id}?user_id=${user.id}`
          );
          
          if (response.ok) {
            const data = await response.json();
            
            // Filter messages to only show those between current user and selected user
            const filteredData = data.filter(msg => 
              (msg.sender_id === user.id && msg.recipient_id === user.id) || 
              (msg.sender_id === user.id && msg.recipient_id === user.id)
            );
            
            // Decrypt messages
            const decryptedMessages = filteredData.map((msg) => ({
              id: msg.id,
              sender_id: msg.sender_id,
              recipient_id: msg.recipient_id || user.id, // Set recipient if missing
              text: decryptMessage(msg.encrypted_message),
              timestamp: msg.timestamp,
            }));
            
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
  };


  // Rest of your code remains the same
  const encryptMessage = (text) => {
    // This is a simplified example. In a real app, you'd use proper E2EE
    return CryptoJS.AES.encrypt(text, 'secret-key').toString();
  };

  const decryptMessage = (encryptedText) => {
    // This is a simplified example. In a real app, you'd use proper E2EE
    return CryptoJS.AES.decrypt(encryptedText, 'secret-key').toString(CryptoJS.enc.Utf8);
  };

  // ... rest of the component functions and JSX ...
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