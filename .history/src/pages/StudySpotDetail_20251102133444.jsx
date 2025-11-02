import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import './StudySpotDetail.css';

const StudySpotDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [spotData, setSpotData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchSpotData();
      fetchSpotReviews();
    }
  }, [id]);

  const fetchSpotData = async () => {
    try {
      // Fetch study spot details
      const { data, error } = await supabase
        .from('StudySpot')
        .select(`
          spot_id,
          name,
          average_rating,
          total_reviews,
          location_id,
          Locations (
            building_area
          ),
          SpotHours (
            open_time,
            close_time,
            is_closed
          )
        `)
        .eq('spot_id', id)
        .single();

      if (error) throw error;

      // Transform the data
      const transformed = {
        name: data.name,
        hours: formatHours(data.SpotHours),
        address: data.Locations?.building_area || 'Address not available',
        averageRating: data.average_rating || 0,
        totalReviews: data.total_reviews || 0,
        // You can add a default set of images or fetch from Photos table
        images: [
          'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400',
          'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400',
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'
        ]
      };

      setSpotData(transformed);
    } catch (error) {
      console.error('Error fetching spot data:', error);
      setError(error.message);
    }
  };

  const fetchSpotReviews = async () => {
    try {
      // Fetch all reviews for this spot
      const { data, error } = await supabase
        .from('Reviews')
        .select(`
          review_id,
          rating,
          review_text,
          created_at,
          user_id,
          Users (
            username,
            email
          ),
          Photos (
            photo_id,
            photo_url,
            photo2_url
          )
        `)
        .eq('spot_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the reviews
      const transformedReviews = data.map(review => ({
        id: review.review_id,
        username: review.Users?.username || review.Users?.email?.split('@')[0] || 'anonymous',
        rating: review.rating,
        reviewText: review.review_text,
        createdAt: review.created_at,
        images: getReviewImages(review.Photos)
      }));

      setReviews(transformedReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReviewImages = (photos) => {
    if (!photos || photos.length === 0) return [];
    
    const images = [];
    photos.forEach(photo => {
      if (photo.photo_url) images.push(photo.photo_url);
      if (photo.photo2_url) images.push(photo.photo2_url);
    });
    
    return images;
  };

  const formatHours = (spotHours) => {
    if (!spotHours || spotHours.length === 0) return 'Hours not available';
    
    const hours = spotHours[0];
    if (hours.is_closed) return 'Closed';
    
    if (hours.open_time && hours.close_time) {
      const formatTime = (time) => {
        if (!time) return '';
        const [hour, minute] = time.split(':');
        const h = parseInt(hour);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
        return `${displayHour}:${minute} ${ampm}`;
      };
      
      return `${formatTime(hours.open_time)} - ${formatTime(hours.close_time)}`;
    }
    
    return '24/7';
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

  if (loading) {
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
            <h2 style={{ color: 'white', textAlign: 'center' }}>Loading...</h2>
          </div>
        </main>
      </div>
    );
  }

  if (!spotData) {
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
            <h2 style={{ color: 'white', textAlign: 'center' }}>Study spot not found</h2>
          </div>
        </main>
      </div>
    );
  }

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
              <p>average rating ({spotData.totalReviews} reviews)</p>
              <div className="stars">{renderStars(spotData.averageRating)}</div>
            </div>
          </div>
          
          <div className="spot-images">
            {spotData.images.map((image, idx) => (
              <img key={idx} src={image} alt={`Study spot ${idx + 1}`} />
            ))}
          </div>

          <div className="reviews-section">
            <h3 style={{ 
              color: 'white', 
              marginBottom: '30px',
              fontSize: '24px'
            }}>
              Reviews for this spot
            </h3>
            
            {reviews.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: 'rgba(255, 255, 255, 0.8)',
                padding: '40px'
              }}>
                <p>No reviews yet for this study spot.</p>
                <button
                  onClick={() => navigate('/create-review')}
                  style={{
                    marginTop: '20px',
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
                  Be the first to review
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {reviews.map(review => (
                  <div 
                    key={review.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '15px',
                      padding: '25px',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginBottom: '15px',
                      gap: '15px'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(135deg, #2d2d2d, #1a1a1a)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <span>👤</span>
                      </div>
                      <div>
                        <div style={{ color: 'white', fontWeight: '600' }}>
                          @{review.username}
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>
                          {new Date(review.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '15px' }}>
                      {renderStars(review.rating)}
                    </div>
                    
                    <p style={{ 
                      color: 'rgba(255, 255, 255, 0.9)', 
                      lineHeight: '1.6',
                      marginBottom: review.images.length > 0 ? '20px' : '0'
                    }}>
                      {review.reviewText}
                    </p>
                    
                    {review.images.length > 0 && (
                      <div style={{ 
                        display: 'flex', 
                        gap: '10px',
                        flexWrap: 'wrap'
                      }}>
                        {review.images.map((img, idx) => (
                          <img 
                            key={idx}
                            src={img} 
                            alt={`Review image ${idx + 1}`}
                            style={{
                              width: '150px',
                              height: '150px',
                              objectFit: 'cover',
                              borderRadius: '10px'
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudySpotDetail;