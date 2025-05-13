import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';
import './App.css';

const API_URL = 'http://10.33.75.205:5000';
let socket;

function App() {
const [user, setUser] = useState(null);
const [isAuthenticated, setIsAuthenticated] = useState(false);
const [showRegister, setShowRegister] = useState(false);

useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('secureChat_user');
    if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
        
        // Connect to WebSocket
        connectSocket(parsedUser.session_id, parsedUser.user_id);
    }
    return () => {
    if (socket) {
        socket.disconnect();
    }
    // Add session security enhancements
    const cleanupSessionSecurity = enhanceSessionSecurity();

    // Return combined cleanup function
    return () => {
    if (socket) {
        socket.disconnect();
    }
    cleanupSessionSecurity();
    };
    };
}, []);

const connectSocket = (sessionId, userId) => {
    socket = io(API_URL, {
    query: { 
        session_id: sessionId,
        user_id: userId
    }
    });
    
    socket.on('connect', () => {
    console.log('Connected to WebSocket server with user ID:', userId);
    });
};

const handleLogin = async (credentials) => {
    try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
    });
    
    if (!response.ok) {
        throw new Error('Login failed');
    }
    
    const data = await response.json();
    localStorage.setItem('secureChat_user', JSON.stringify(data));
    setUser(data);
    setIsAuthenticated(true);
    
      // Connect to WebSocket
    connectSocket(data.session_id, data.user_id);
    } catch (error) {
    console.error('Login error:', error);
    alert('Login failed: ' + error.message);
    }
};

const handleRegister = async (userData) => {
    try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
        throw new Error('Registration failed');
    }
    
    setShowRegister(false);
    alert('Registration successful! Please login.');
    } catch (error) {
    console.error('Registration error:', error);
    alert('Registration failed: ' + error.message);
    }
};

const handleLogout = () => {
    localStorage.removeItem('secureChat_user');
    setUser(null);
    setIsAuthenticated(false);
    
    if (socket) {
    socket.disconnect();
    }
};


const enhanceSessionSecurity = () => {
  // Add periodic token refresh
  const refreshInterval = setInterval(() => {
    if (user && user.token) {
      refreshSession(user.token);
    }
  }, 15 * 60 * 1000); // Refresh every 15 minutes
  
  return () => clearInterval(refreshInterval);
};

const refreshSession = async (token) => {
  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Token refresh failed');
    }
    
    const data = await response.json();
    
    // Update local storage and state with new token
    const updatedUser = { ...user, token: data.token, session_id: data.session_id };
    localStorage.setItem('secureChat_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    
    // Reconnect socket with new session ID if needed
    if (data.session_id && data.session_id !== user.session_id) {
      if (socket) {
        socket.disconnect();
      }
      connectSocket(data.session_id, user.id);
    }
    
    return true;
  } catch (error) {
    console.error('Session refresh error:', error);
    handleLogout();
    return false;
  }
};

return (
    <div className="App">
    <header className="App-header">
        <h1>🛡️ SecureChat</h1>
        {isAuthenticated && (
        <button onClick={handleLogout} className="logout-button">
            Logout
        </button>
        )}
    </header>
    
    <main>
        {!isAuthenticated ? (
        showRegister ? (
            <Register onRegister={handleRegister} onToggle={() => setShowRegister(false)} />
        ) : (
            <Login onLogin={handleLogin} onToggle={() => setShowRegister(true)} />
        )
        ) : (
        <Chat user={user} socket={socket} apiUrl={API_URL} />
        )}
    </main>
    </div>
);
}

export default App;