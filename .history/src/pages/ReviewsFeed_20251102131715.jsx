import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './ReviewsFeed.css';

const ReviewsFeed = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState({});

  const handleLogout = () => {
    signOut();
    navigate('/');
  };

  // Mock reviews data
  const [reviews] = useState([
    {
      id: 1,
      username: 'student123',
      rating: 4,
      images: [
        'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600'
      ],
      studySpotName: 'Snell Library - 3rd Floor',
      review: 'Great quiet study space with plenty of natural light. The desks are comfortable and there are plenty of power outlets. Gets crowded during finals week but otherwise perfect!',
      spotId: 'snell-3'
    },
    {
      id: 2,
      username: 'neu_student',
      rating: 5,
      images: [
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600'
      ],
      studySpotName: 'ISEC First Floor',
      review: 'Amazing collaborative space! Love the modern furniture and the whiteboard walls. Perfect for group projects.',
      spotId: 'isec-1'
    }
  ]);

  const nextImage = (reviewId) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [reviewId]: ((prev[reviewId] || 0) + 1) % reviews.find(r => r.id === reviewId).images.length
    }));
  };

  const prevImage = (reviewId) => {
    const review = reviews.find(r => r.id === reviewId);
    setCurrentImageIndex(prev => ({
      ...prev,
      [reviewId]: prev[reviewId] === 0 ? review.images.length - 1 : (prev[reviewId] || 0) - 1
    }));
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <span key={i} className={i < rating ? "star filled" : "star"}>★</span>
    ));
  };

  return (
    <div className="reviews-container">
      <header className="reviews-header">
        <h1 className="logo" onClick={() => navigate('/')}>StudySphere</h1>
        <nav className="nav-links">
          <button className="nav-link active">Reviews</button>
          <button className="nav-link" onClick={() => navigate('/profile')}>Profile</button>
          <button className="nav-link" onClick={() => navigate('/search')}>Search</button>
        </nav>
        <button onClick={handleLogout} className="logout-btn">Log-Out</button>
      </header>

      <main className="reviews-main">
        <h2 className="page-title">Reviews</h2>
        
        <div className="reviews-feed">
          {reviews.map(review => (
            <div key={review.id} className="review-card">
              <div className="review-left">
                <div className="user-info">
                  <div className="user-avatar">
                    <span className="avatar-icon">👤</span>
                  </div>
                  <span className="username">@{review.username}</span>
                </div>
                <div className="rating">{renderStars(review.rating)}</div>
                
                <div className="image-carousel">
                  <img 
                    src={review.images[currentImageIndex[review.id] || 0]} 
                    alt="Study spot"
                    className="review-image"
                  />
                  {review.images.length > 1 && (
                    <>
                      <button className="carousel-btn prev" onClick={() => prevImage(review.id)}>‹</button>
                      <button className="carousel-btn next" onClick={() => nextImage(review.id)}>›</button>
                      <div className="carousel-dots">
                        {review.images.map((_, idx) => (
                          <span 
                            key={idx} 
                            className={`dot ${(currentImageIndex[review.id] || 0) === idx ? 'active' : ''}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="review-right">
                <h3 
                  className="study-spot-name"
                  onClick={() => navigate(`/studyspot/${review.spotId}`)}
                >
                  {review.studySpotName}
                </h3>
                <div className="review-text">
                  <p>{review.review}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ReviewsFeed;