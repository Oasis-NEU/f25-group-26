import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './StudySpotDetail.css';

const StudySpotDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  // Mock data store - in real app this would come from a database/API
  const studySpots = {
    'snell-3': {
      name: 'Snell Library - 3rd Floor',
      hours: '7:00 AM - 2:00 AM',
      address: '360 Huntington Ave, Boston, MA',
      averageRating: 4.5,
      images: [
        'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400',
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'
      ]
    },
    'isec-1': {
      name: 'ISEC First Floor',
      hours: '24/7',
      address: '805 Columbus Ave, Boston, MA',
      averageRating: 5,
      images: [
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400',
        'https://images.unsplash.com/photo-1519452575417-564c1401ecc0?w=400',
        'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400'
      ]
    },
    'bookstore': {
      name: 'Avenue Coffee & Books',
      hours: '7:00 AM - 10:00 PM',
      address: '342 Huntington Ave, Boston, MA',
      averageRating: 4,
      images: [
        'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400',
        'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=400',
        'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400'
      ]
    }
  };

  // Get the specific study spot data based on the ID from the URL
  const spotData = studySpots[id] || studySpots['snell-3']; // Fallback to Snell if ID not found

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