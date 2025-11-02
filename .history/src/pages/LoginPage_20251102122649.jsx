import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = isSignUp ? signUp(username, password) : signIn(username, password);
    
    if (result.success) {
      navigate('/reviews');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1 className="logo">StudySphere</h1>
        </div>
        
        <div className="login-content">
          <div className="login-form-container">
            <h2>Welcome Back!</h2>
            
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="User"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="login-input"
              />
              
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
              />
              
              {error && <p className="error-text">{error}</p>}
              
              <div className="signup-link">
                Create an account{' '}
                <button 
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="link-button"
                >
                  Sign Up
                </button>
              </div>
              
              <button type="submit" className="login-submit-btn">
                {isSignUp ? 'Sign Up' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;