import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './CreateReview.css';

const CreateReview = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [rating, setRating] = useState(0);
  const [studySpotName, setStudySpotName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);

  const handleLogout = () => {
    signOut();
    navigate('/');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    console.log({ rating, studySpotName, reviewText, uploadedImage });
    navigate('/reviews');
  };

  const renderStars = () => {
    return [...Array(5)].map((_, i) => (
      <span 
        key={i} 
        className={i < rating ? "star filled" : "star"}
        onClick={() => setRating(i + 1)}
        style={{ cursor: 'pointer' }}
      >
        ★
      </span>
    ));
  };

  return (
    <div className="create-review-container">
      <header className="create-review-header">
        <h1 className="logo" onClick={() => navigate('/')}>StudySphere</h1>
        <nav className="nav-links">
          <button className="nav-link" onClick={() => navigate('/reviews')}>Reviews</button>
          <button className="nav-link" onClick={() => navigate('/profile')}>Profile</button>
          <button className="nav-link" onClick={() => navigate('/search')}>Search</button>
        </nav>
        <button onClick={handleLogout} className="logout-btn">Log-Out</button>
      </header>

      <main className="create-review-main">
        <div className="page-header">
          <h2 className="page-title">Create Review</h2>
          <button 
            className="post-review-btn"
            onClick={handleSubmit}
          >
            post review
          </button>
        </div>
        
        <div className="create-review-card">
          <div className="review-form-content">
            <div className="form-left">
              <div className="user-info">
                <div className="user-avatar">
                  <span className="avatar-icon">👤</span>
                </div>
                <span className="username">@{user?.username || 'username'}</span>
              </div>
              
              <div className="rating-selector">
                {renderStars()}
              </div>
              
              <div className="image-upload-section">
                {uploadedImage ? (
                  <img src={uploadedImage} alt="Upload preview" className="preview-image" />
                ) : (
                  <label className="upload-placeholder">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      hidden
                    />
                    <span>📷 Click to upload image</span>
                  </label>
                )}
              </div>
            </div>
            
            <div className="form-right">
              <input
                type="text"
                placeholder="StudySpot Name"
                value={studySpotName}
                onChange={(e) => setStudySpotName(e.target.value)}
                className="spot-name-input"
              />
              
              <textarea
                placeholder="Write your review here..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="review-textarea"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateReview;