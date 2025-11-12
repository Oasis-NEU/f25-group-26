import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import './LocationDetail.css';

const LocationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [locationData, setLocationData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchLocationData();
      fetchLocationReviews();
    }
  }, [id]);

  const fetchLocationData = async () => {
    try {
      const { data, error } = await supabase
        .from('Locations')
        .select('location_id, "building/area"')
        .eq('location_id', id)
        .single();

      if (error) throw error;

      setLocationData({
        name: data['building/area'],
        id: data.location_id
      });
    } catch (error) {
      console.error('Error fetching location data:', error);
      setError(error.message);
    }
  };

  const fetchLocationReviews = async () => {
    try {
      // Get all study spots in this location
      const { data: spotsData, error: spotsError } = await supabase
        .from('StudySpot')
        .select('spot_id')
        .eq('location_id', id);

      if (spotsError) throw spotsError;

      const spotIds = spotsData.map(spot => spot.spot_id);

      if (spotIds.length === 0) {
        setReviews([]);
        setLoading(false);
        return;
      }

      // Fetch all reviews for these study spots
      const { data: reviewsData, error: reviewsError } = await supabase
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
            spot_id,
            name
          ),
          Photos (
            photo_url,
            photo2_url
          )
        `)
        .in('spot_id', spotIds)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;

      // Transform reviews into grid items
      const transformedReviews = reviewsData.map(review => {
        // Get all images from the review
        const images = [];
        if (review.Photos && review.Photos.length > 0) {
          if (review.Photos[0].photo_url) images.push(review.Photos[0].photo_url);
          if (review.Photos[0].photo2_url) images.push(review.Photos[0].photo2_url);
        }
        
        // Use first image for thumbnail, or default
        const thumbnailImage = images.length > 0 ? images[0] : 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400';

        return {
          id: review.review_id,
          images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600'],
          thumbnailImage: thumbnailImage,
          spotName: review.StudySpot?.name || 'Unknown Spot',
          spotId: review.StudySpot?.spot_id || review.spot_id,
          rating: review.rating,
          username: review.Users?.username || review.Users?.email?.split('@')[0] || 'anonymous',
          reviewText: review.review_text,
          createdAt: review.created_at
        };
      });

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

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <span 
        key={i} 
        style={{ 
          color: i < Math.floor(rating) ? '#ffd700' : 'rgba(255, 255, 255, 0.3)',
          fontSize: '14px'
        }}
      >
        ★
      </span>
    ));
  };

  const renderStarsLarge = (rating) => {
    return [...Array(5)].map((_, i) => (
      <span 
        key={i} 
        style={{ 
          color: i < Math.floor(rating) ? '#ffd700' : 'rgba(255, 255, 255, 0.2)',
          fontSize: '28px',
          marginRight: '5px'
        }}
      >
        ★
      </span>
    ));
  };

  // If a review is selected, show it in full-screen modal
  if (selectedReview) {
    return (
      <div className="location-container">
        <header className="location-header">
          <h1 className="logo" onClick={() => navigate('/')}>StudySphere</h1>
          <nav className="nav-links">
            <button className="nav-link" onClick={() => navigate('/reviews')}>Reviews</button>
            <button className="nav-link" onClick={() => navigate('/profile')}>Profile</button>
            <button className="nav-link" onClick={() => navigate('/search')}>Search</button>
          </nav>
          <button onClick={handleLogout} className="logout-btn">Log-Out</button>
        </header>

        <main className="location-main">
          <button 
            onClick={() => setSelectedReview(null)}
            style={{
              background: 'linear-gradient(135deg, #e8a5b6, #d6889c)',
              color: 'white',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '30px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '20px',
              transition: 'all 0.3s ease'
            }}
          >
            ← Back to Grid
          </button>

          <div className="review-card-full" style={{
            background: 'linear-gradient(135deg, #275dad 0%, #99b2dd 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '30px',
            padding: '35px',
            display: 'flex',
            gap: '35px',
            boxShadow: '0 10px 40px rgba(107, 91, 149, 0.25)'
          }}>
            <div style={{ width: '45%' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '15px',
                marginBottom: '20px'
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  background: 'linear-gradient(135deg, #2d2d2d, #1a1a1a)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)'
                }}>
                  <span style={{ fontSize: '24px' }}>👤</span>
                </div>
                <span style={{
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>@{selectedReview.username}</span>
              </div>

              <div style={{ marginBottom: '20px' }}>
                {renderStarsLarge(selectedReview.rating)}
              </div>

              <div style={{
                width: '100%',
                height: '320px',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
              }}>
                <img 
                  src={selectedReview.images[0]} 
                  alt="Review"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600';
                  }}
                />
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                background: 'var(--light-purple)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '30px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <h3 
                  style={{
                    color: 'white',
                    fontSize: '28px',
                    fontWeight: '700',
                    marginBottom: '25px',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/studyspot/${selectedReview.spotId}`)}
                >
                  {selectedReview.spotName}
                </h3>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '15px',
                  padding: '25px',
                  flex: 1,
                  overflowY: 'auto'
                }}>
                  <p style={{
                    color: '#2d3748',
                    lineHeight: '1.8',
                    fontSize: '16px'
                  }}>
                    {selectedReview.reviewText}
                  </p>
                  {selectedReview.createdAt && (
                    <p style={{ 
                      fontSize: '12px', 
                      color: '#999', 
                      marginTop: '15px' 
                    }}>
                      {new Date(selectedReview.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="location-container">
        <header className="location-header">
          <h1 className="logo" onClick={() => navigate('/')}>StudySphere</h1>
          <nav className="nav-links">
            <button className="nav-link" onClick={() => navigate('/reviews')}>Reviews</button>
            <button className="nav-link" onClick={() => navigate('/profile')}>Profile</button>
            <button className="nav-link" onClick={() => navigate('/search')}>Search</button>
          </nav>
          <button onClick={handleLogout} className="logout-btn">Log-Out</button>
        </header>
        <main className="location-main">
          <div className="location-content">
            <h2 style={{ color: 'white', textAlign: 'center' }}>Loading...</h2>
          </div>
        </main>
      </div>
    );
  }

  if (!locationData) {
    return (
      <div className="location-container">
        <header className="location-header">
          <h1 className="logo" onClick={() => navigate('/')}>StudySphere</h1>
          <nav className="nav-links">
            <button className="nav-link" onClick={() => navigate('/reviews')}>Reviews</button>
            <button className="nav-link" onClick={() => navigate('/profile')}>Profile</button>
            <button className="nav-link" onClick={() => navigate('/search')}>Search</button>
          </nav>
          <button onClick={handleLogout} className="logout-btn">Log-Out</button>
        </header>
        <main className="location-main">
          <div className="location-content">
            <h2 style={{ color: 'white', textAlign: 'center' }}>Location not found</h2>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="location-container">
      <header className="location-header">
        <h1 className="logo" onClick={() => navigate('/')}>StudySphere</h1>
        <nav className="nav-links">
          <button className="nav-link" onClick={() => navigate('/reviews')}>Reviews</button>
          <button className="nav-link" onClick={() => navigate('/profile')}>Profile</button>
          <button className="nav-link" onClick={() => navigate('/search')}>Search</button>
        </nav>
        <button onClick={handleLogout} className="logout-btn">Log-Out</button>
      </header>

      <main className="location-main">
        <div className="location-content">
          <div className="location-info">
            <h2 className="location-title">{locationData.name}</h2>
            <p className="location-subtitle">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
          </div>

          {reviews.length === 0 ? (
            <div style={{ 
              textAlign: 'center',
              padding: '60px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              backdropFilter: 'blur(10px)'
            }}>
              <h3 style={{ color: 'white', marginBottom: '15px' }}>No reviews yet</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '25px' }}>
                Be the first to review a study spot at {locationData.name}!
              </p>
              <button
                onClick={() => navigate('/create-review')}
                style={{
                  padding: '12px 30px',
                  background: 'linear-gradient(135deg, #e8a5b6, #d6889c)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Create First Review
              </button>
            </div>
          ) : (
            <div className="instagram-grid">
              {reviews.map(review => (
                <div 
                  key={review.id}
                  className="grid-item"
                  onClick={() => setSelectedReview(review)}
                >
                  <img 
                    src={review.thumbnailImage} 
                    alt={review.spotName}
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400';
                    }}
                  />
                  <div className="grid-item-overlay">
                    <div className="overlay-content">
                      <div className="overlay-spot-name">{review.spotName}</div>
                      <div className="overlay-stats">
                        <div className="overlay-rating">
                          {renderStars(review.rating)}
                        </div>
                        <div className="overlay-username">@{review.username}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default LocationDetail;