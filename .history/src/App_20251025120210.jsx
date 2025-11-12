import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import ReviewsFeed from './pages/ReviewsFeed';
import ProfilePage from './pages/ProfilePage';
import CreateReview from './pages/CreateReview';
import SearchPage from './pages/SearchPage';
import StudySpotDetail from './pages/StudySpotDetail';
import './App.css';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/reviews" replace /> : <LoginPage />} />
      <Route path="/reviews" element={
        <ProtectedRoute>
          <ReviewsFeed />
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      } />
      <Route path="/create-review" element={
        <ProtectedRoute>
          <CreateReview />
        </ProtectedRoute>
      } />
      <Route path="/search" element={
        <ProtectedRoute>
          <SearchPage />
        </ProtectedRoute>
      } />
      <Route path="/studyspot/:id" element={
        <ProtectedRoute>
          <StudySpotDetail />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;