import React, { useState } from 'react';
import zxcvbn from 'zxcvbn';

function Register({ onRegister, onToggle }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const checkPasswordStrength = (password) => {
  const result = zxcvbn(password);
    setPasswordStrength(result.score);
  };
  // Update password onChange handler
  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    checkPasswordStrength(newPassword);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    
    onRegister({ username, password });
  };

  return (
    <div className="auth-container">
      <h2>Register for SecureChat</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={handlePasswordChange}
            required
          />
        </div>
        <div className="password-strength">
        <div className={`strength-bar strength-${passwordStrength}`}></div>
        <div className="strength-text">
        {passwordStrength === 0 && 'Very Weak'}
        {passwordStrength === 1 && 'Weak'}
        {passwordStrength === 2 && 'Fair'}
        {passwordStrength === 3 && 'Good'}
        {passwordStrength === 4 && 'Strong'}
        </div>
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary">Register</button>
      </form>
      <p>
        Already have an account?{' '}
        <button onClick={onToggle} className="btn-link">
          Login
        </button>
      </p>
    </div>
  );
}

export default Register;