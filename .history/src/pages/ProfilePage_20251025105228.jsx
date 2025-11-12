import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('add bio here!');
  const [favoriteSpot, setFavoriteSpot] = useState('Favorite Study Spot');
  
  const handleLogout = () => {
    signOut();
    navigate('/');
  };

  const handleSaveProfile = () => {
    setIsEditing(false);
    // Save profile changes (in real app, would save to database)
  };

  const userReviews = [
    { id: 1, image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300', spotId: 'snell-3' },
    { id: 2, image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=300', spotId: 'isec-1' },
    { id: 3, image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300', spotId: 'curry' }
  ];

  return (
    <div className="profile-container">
      <header className="profile-header">
        <h1 className="logo" onClick={() => navigate('/')}>StudySphere</h1>
        <nav className="nav-links">
          <button className="nav-link" onClick={() => navigate('/reviews')}>Reviews</button>
          <button className="nav-link active">Profile</button>
          <button className="nav-link" onClick={() => navigate('/search')}>Search</button>
        </nav>
        <button onClick={handleLogout} className="logout-btn">Log-Out</button>
      </header>

      <main className="profile-main">
        <div className="profile-content-wrapper">
          <div className="profile-info-section">
            <div className="profile-avatar-large">
              <span className="avatar-icon-large">👤</span>
            </div>
            
            <div className="profile-details">
              <h2>@{user?.username || 'username'}</h2>
              <p className="email">• {user?.email || 'email address'}</p>
              
              <div className="profile-actions">
                <button 
                  className="action-btn"
                  onClick={() => navigate('/create-review')}
                >
                  new review
                </button>
                <button 
                  className="action-btn"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? 'cancel' : 'edit profile'}
                </button>
                {isEditing && (
                  <button 
                    className="action-btn save-btn"
                    onClick={handleSaveProfile}
                  >
                    save
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="profile-bio-section">
            {isEditing ? (
              <>
                <input 
                  type="text"
                  value={favoriteSpot}
                  onChange={(e) => setFavoriteSpot(e.target.value)}
                  className="edit-input"
                  placeholder="Favorite Study Spot"
                />
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="edit-textarea"
                  placeholder="Add your bio here..."
                />
              </>
            ) : (
              <>
                <h3>{favoriteSpot} •</h3>
                <p>{bio}</p>
              </>
            )}
          </div>

          <div className="profile-reviews-grid">
            {userReviews.map(review => (
              <div 
                key={review.id}
                className="profile-review-tile"
                onClick={() => navigate(`/studyspot/${review.spotId}`)}
              >
                <img src={review.image} alt="Study spot" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;