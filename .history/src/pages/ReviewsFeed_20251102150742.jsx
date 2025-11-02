import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import './ReviewsFeed.css';

const ReviewsFeed = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  // Helper function to extract images from photos
  const getReviewImages = (photos) => {
    if (!photos || photos.length === 0) {
      return ['https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600'];
    }

    const images = [];
    photos.forEach(photo => {
      if (photo.photo_url) images.push(photo.photo_url);
      if (photo.photo2_url) images.push(photo.photo2_url);
    });

    return images.length > 0 ? images : ['https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600'];
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch reviews with ALL related data in ONE query
      const { data, error } = await supabase
        .from('Reviews')
        .select(`
          review_id,
          rating,
          review_text,
          created_at,
          user_id,
          spot_id,
          Users (
            username,
            email
          ),
          StudySpot (
            name,
            average_rating,
            location_id
          ),
          Photos (
            photo_id,
            photo_url,
            photo2_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      console.log('Fetched reviews:', data);

      // Transform the data to match component structure
      const transformedReviews = (data || []).map(review => ({
        id: review.review_id,
        username: review.Users?.username || review.Users?.email?.split('@')[0] || 'anonymous',
        rating: review.rating,
        images: getReviewImages(review.Photos),
        studySpotName: review.StudySpot?.name || 'Unknown Location',
        review: review.review_text,
        spotId: review.spot_id,
        createdAt: review.created_at
      }));

      console.log('Transformed reviews:', transformedReviews);
      setReviews(transformedReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    signOut();
    navigate('/');
  };

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

  if (loading) {
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
          <h2 className="page-title">Loading reviews...</h2>
        </main>
      </div>
    );
  }

  if (error) {
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
          <h2 className="page-title">Error loading reviews</h2>
          <p style={{ textAlign: 'center', color: '#6b5b95' }}>{error}</p>
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button 
              onClick={fetchReviews}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6b5b95',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

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
          {reviews.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px',
              backgroundColor: 'rgba(107, 91, 149, 0.1)',
              borderRadius: '20px'
            }}>
              <h3 style={{ color: '#6b5b95', marginBottom: '20px' }}>No reviews yet!</h3>
              <p style={{ color: '#8b7fb8', marginBottom: '30px' }}>Be the first to review a study spot</p>
              <button 
                onClick={() => navigate('/create-review')}
                style={{
                  padding: '12px 30px',
                  backgroundColor: '#6b5b95',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Create First Review
              </button>
            </div>
          ) : (
            reviews.map(review => (
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
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600';
                      }}
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
                    onClick={() => review.spotId && navigate(`/studyspot/${review.spotId}`)}
                  >
                    {review.studySpotName}
                  </h3>
                  <div className="review-text">
                    <p>{review.review || 'No review text provided.'}</p>
                    {review.createdAt && (
                      <p style={{ 
                        fontSize: '12px', 
                        color: '#999', 
                        marginTop: '15px' 
                      }}>
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default ReviewsFeed;