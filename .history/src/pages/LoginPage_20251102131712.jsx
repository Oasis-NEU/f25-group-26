import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import './LoginPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check for error messages from auth callback
  useEffect(() => {
    if (location.state?.error) {
      setError(location.state.error);
    }
  }, [location]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/reviews');
    }
  }, [user, navigate]);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign up with email and password
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        });

        if (error) throw error;

        if (data?.user?.identities?.length === 0) {
          setError('An account with this email already exists. Please sign in instead.');
        } else {
          setMessage('Check your email for the confirmation link!');
          setEmail('');
          setPassword('');
        }
      } else {
        // Sign in with email and password
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) throw error;

        // Successful login - the AuthContext should handle the redirect
        navigate('/reviews');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider) => {
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) throw error;
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    if (!email) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) throw error;

      setMessage('Check your email for the login link!');
      setEmail('');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
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
            <h2>{isSignUp ? 'Create Account' : 'Welcome Back!'}</h2>
            
            <form onSubmit={handleEmailAuth}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                minLength="6"
                disabled={loading}
              />
              
              {error && <p className="error-text" style={{ color: 'red' }}>{error}</p>}
              {message && <p className="success-text" style={{ color: 'green' }}>{message}</p>}
              
              <button 
                type="submit" 
                className="login-submit-btn"
                disabled={loading}
              >
                {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Login')}
              </button>
            </form>

            {/* Magic Link Option (for login only) */}
            {!isSignUp && (
              <div style={{ margin: '10px 0' }}>
                <button
                  type="button"
                  onClick={handleMagicLink}
                  className="magic-link-btn"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'transparent',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Send Magic Link to Email
                </button>
              </div>
            )}

            {/* OAuth Providers (optional - uncomment if you've configured these in Supabase) */}
            {/* 
            <div className="oauth-divider" style={{ margin: '20px 0', textAlign: 'center' }}>
              <span>Or continue with</span>
            </div>
            
            <div className="oauth-buttons" style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleOAuthLogin('google')}
                className="oauth-btn"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Google
              </button>
              
              <button
                type="button"
                onClick={() => handleOAuthLogin('github')}
                className="oauth-btn"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                GitHub
              </button>
            </div>
            */}
            
            <div className="signup-link" style={{ marginTop: '20px', textAlign: 'center' }}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button 
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setMessage('');
                }}
                className="link-button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#007bff',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;