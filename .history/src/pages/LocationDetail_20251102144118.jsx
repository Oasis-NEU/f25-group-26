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
        let image = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400';
        if (review.Photos && review.Photos.length > 0) {
          if (review.Photos[0].photo_url) {
            image = review.Photos[0].photo_url;
          } else if (review.Photos[0].photo2_url) {
            image = review.Photos[0].photo2_url;
          }
        }

        return {
          id: review.review_id,
          image: image,
          spotName: review.StudySpot?.name || 'Unknown Spot',
          spotId: review.spot_id,
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
                  onClick={() => navigate(`/studyspot/${review.spotId}`)}
                >
                  <img 
                    src={review.image} 
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