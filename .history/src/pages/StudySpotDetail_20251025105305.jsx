import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './StudySpotDetail.css';

const StudySpotDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  // Mock data - in real app would fetch based on id
  const spotData = {
    name: 'Snell Library - 3rd Floor',
    hours: '7:00 AM - 2:00 AM',
    address: '360 Huntington Ave, Boston, MA',
    averageRating: 4.5,
    images: [
      'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'
    ]
  };

  const handleLogout = () => {
    signOut();
    navigate('/');
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <span key={i} className={i < Math.floor(rating) ? "star filled" : "star"}>★</span>
    ));
  };

  return (
    <div className="studyspot-container">
      <header className="studyspot-header">
        <h1 className="logo" onClick={() => navigate('/')}>StudySphere</h1>
        <nav className="nav-links">
          <button className="nav-link" onClick={() => navigate('/reviews')}>Reviews</button>
          <button className="nav-link" onClick={() => navigate('/profile')}>Profile</button>
          <button className="nav-link" onClick={() => navigate('/search')}>Search</button>
        </nav>
        <button onClick={handleLogout} className="logout-btn">Log-Out</button>
      </header>

      <main className="studyspot-main">
        <div className="studyspot-content">
          <div className="spot-header">
            <div className="spot-info">
              <h2>{spotData.name}</h2>
              <p className="spot-hours">{spotData.hours}</p>
              <p className="spot-address">{spotData.address}</p>
            </div>
            <div className="spot-rating">
              <p>average rating</p>
              <div className="stars">{renderStars(spotData.averageRating)}</div>
            </div>
          </div>
          
          <div className="spot-images">
            {spotData.images.map((image, idx) => (
              <img key={idx} src={image} alt={`Study spot ${idx + 1}`} />
            ))}
          </div>

          <div className="reviews-section">
            <h3>Reviews for this spot will appear here</h3>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudySpotDetail;