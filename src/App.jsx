import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import ReviewsFeed from './pages/ReviewsFeed';
import ProfilePage from './pages/ProfilePage';
import CreateReview from './pages/CreateReview';
import SearchPage from './pages/SearchPage';
import StudySpotDetail from './pages/StudySpotDetail';
import LocationDetail from './pages/LocationDetail';
import { supabase } from './supabaseClient'; // Make sure this import exists
import './App.css';

// Auth Callback Component for handling OAuth and magic link redirects
const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle the OAuth/magic link callback
    const handleAuthCallback = async () => {
      // Get the session from the URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      
      if (accessToken) {
        // Successfully authenticated, redirect to main app
        navigate('/reviews');
      } else {
        // Check for errors in URL params
        const params = new URLSearchParams(window.location.search);
        const error = params.get('error');
        const errorDescription = params.get('error_description');
        
        if (error) {
          console.error('Auth error:', error, errorDescription);
          navigate('/login', { 
            state: { 
              error: errorDescription || 'Authentication failed. Please try again.' 
            } 
          });
        } else {
          // No token and no error, redirect to login
          navigate('/login');
        }
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <p>Completing sign in...</p>
    </div>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  
  const handleLoginClick = () => {
    navigate('/login');
  };

  const creators = [
    {name: "Amy Tran", image: "src/assets/AmyTran.jpeg", linkedin: "https://www.linkedin.com/in/amy-tran-1a7196273/"},
    {name: "Ashley Zheng", image: "src/assets/AshleyZheng.png", linkedin: "https://www.linkedin.com/in/ashleyxzheng/"},
    {name: "Isabel Larenas", image: "src/assets/IsabelLarenas.jpg", linkedin: "https://www.linkedin.com/in/isabellarenas/"},
    {name: "Maya Borkar", image: "src/assets/MayaBorkar.png", linkedin: "https://www.linkedin.com/in/maya-borkar/"},
    {name: "Tim Bernardo", image: "src/assets/TimBernardo.png", linkedin: "https://www.linkedin.com/in/timothybernardo/"},
    {name: "James Khadan", image: "src/assets/JamesKhadan.jpeg", linkedin: "https://www.linkedin.com/in/jameskhadan/"}
  ];

  return (
    <>
      <header>
        <nav>
          <div className="logo">StudySphere</div>
          <button onClick={handleLoginClick} className="login-btn">Login</button>
        </nav>
      </header>

      <main className="hero-section">
        <h1 className="hero-title">Welcome to StudySphere</h1>
        <p className="hero-subtitle">Find Your Perfect Study Space</p>
        
        <div className="scene-container">
          <img 
            src="src/assets/KrentzmanQuad.jpg" 
            alt="Study Space Scene" 
            className="scene-image"
          />
        </div>

        <div className="info-section">
          <div className="info-card">
            <h2>About Us</h2>
            <p>StudySphere is a project we made to help students find the perfect study spaces throughout Northeastern University.</p>
          </div>
          <div className="info-card">
            <h2>Descriptions</h2>
            <p>Discover various study spaces with detailed descriptions and amenities found by other Northeastern students.</p>
          </div>
        </div>

        <div className="creators-section">
          <h2>The Creators</h2>
          <div className="creators-grid">
            {creators.map((creator, index) => (
              <a 
                key={index} 
                href={creator.linkedin} 
                target="_blank" 
                rel="noopener noreferrer"
                className="creator-card"
              >
                <div className="creator-image">
                  {creator.image ? (
                    <img src={creator.image} alt={creator.name} />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  )}
                </div>
                <div className="creator-name">{creator.name}</div>
              </a>
            ))}
          </div>
        </div>
      </main>
    </>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/location/:id" element={<ProtectedRoute><LocationDetail /></ProtectedRoute>} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reviews" element={<ProtectedRoute><ReviewsFeed /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/create-review" element={<ProtectedRoute><CreateReview /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
          <Route path="/studyspot/:id" element={<ProtectedRoute><StudySpotDetail /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;