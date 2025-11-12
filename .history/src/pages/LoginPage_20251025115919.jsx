import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/reviews');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const result = isSignUp 
        ? await signUp(username, password)
        : await signIn(username, password);
      
      if (!result.success) {
        setError(result.error);
      } else {
        // Navigation will happen automatically via useEffect when user state updates
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1 className="logo">StudySphere</h1>
          <button className="header-login-btn">Login</button>
        </div>
        
        <div className="login-content">
          <div className="login-form-container">
            <h2>{isSignUp ? 'Create Account' : 'Welcome Back!'}</h2>
            
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="login-input"
                required
                disabled={loading}
              />
              
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                required
                disabled={loading}
                minLength={6}
              />
              
              {error && <p className="error-text">{error}</p>}
              
              <div className="signup-link">
                {isSignUp ? 'Already have an account?' : 'Create an account'}{' '}
                <button 
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                  }}
                  className="link-button"
                  disabled={loading}
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
              </div>
              
              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Login')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;