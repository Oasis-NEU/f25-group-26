import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import ReviewsFeed from './pages/ReviewsFeed';
import ProfilePage from './pages/ProfilePage';
import CreateReview from './pages/CreateReview';
import SearchPage from './pages/SearchPage';
import StudySpotDetail from './pages/StudySpotDetail';
import './App.css';

const LandingPage = () => {
  const navigate = useNavigate();
  
  const handleLoginClick = () => {
    navigate('/login');
  };

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
            src="https://www.usnews.com/object/image/00000174-c726-dd7c-a577-f7ee65ec0000/c21roadbos-northeastern-editorial.bos_northeastern.JPG?update-time=1601069085351&size=responsive640" 
            alt="Study Space Scene" 
            className="scene-image"
          />
        </div>

        <div className="info-section">
          <div className="info-card">
            <h2>About Us</h2>
            <p>Learn more about StudySphere and our mission to help students find the perfect study spaces.</p>
          </div>
          <div className="info-card">
            <h2>Descriptions</h2>
            <p>Discover various study spaces with detailed descriptions and amenities.</p>
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