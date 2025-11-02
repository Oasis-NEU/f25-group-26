import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import './CreateReview.css';

const CreateReview = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [rating, setRating] = useState(0);
  const [studySpotName, setStudySpotName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      console.log('Attempting to fetch locations...');
      const { data, error } = await supabase
        .from('Locations')
        .select('location_id, "building/area"')
        .order('"building/area"');

      console.log('Locations response:', { data, error });

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.warn('No locations found in database');
        setError('No locations found. Please add locations to the database first.');
        return;
      }
      
      setLocations(data || []);
      console.log('Successfully loaded locations:', data);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setError(`Failed to load locations: ${error.message}. Please check the console for details.`);
    }
  };

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

  const handleSubmit = async () => {
    if (!rating || !selectedLocationId || !studySpotName || !reviewText) {
      setError('Please fill in all required fields (rating, location, study spot name, and review text)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // First, ensure we have the user's record in the Users table
      let userId = user.id;
      
      // Check if user exists in Users table
      const { data: existingUser, error: userCheckError } = await supabase
        .from('Users')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      // If user doesn't exist, create them
      if (!existingUser || userCheckError) {
        const { data: newUser, error: userError } = await supabase
          .from('Users')
          .insert({
            user_id: user.id,
            email: user.email,
            username: user.email.split('@')[0],
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (userError && userError.code !== '23505') { // Ignore duplicate key error
          throw userError;
        }
      }

      // Check if a StudySpot with this name and location already exists
      const { data: existingSpot, error: spotCheckError } = await supabase
        .from('StudySpot')
        .select('spot_id')
        .eq('name', studySpotName)
        .eq('location_id', selectedLocationId)
        .single();

      let spotId;

      if (existingSpot) {
        // Use existing spot
        spotId = existingSpot.spot_id;
      } else {
        // Create new StudySpot
        const { data: newSpot, error: spotError } = await supabase
          .from('StudySpot')
          .insert({
            name: studySpotName,
            location_id: selectedLocationId,
            average_rating: rating,
            total_reviews: 0,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (spotError) throw spotError;
        spotId = newSpot.spot_id;
      }

      // Create the review
      const { data: reviewData, error: reviewError } = await supabase
        .from('Reviews')
        .insert({
          user_id: user.id,
          spot_id: spotId,
          rating: rating,
          review_text: reviewText,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (reviewError) throw reviewError;

      // If there's an uploaded image, save it to Photos table
      if (uploadedImage && reviewData) {
        // For now, we'll store the base64 data URL
        // In production, you'd want to upload to Supabase Storage first
        const { error: photoError } = await supabase
          .from('Photos')
          .insert({
            review_id: reviewData.review_id,
            photo_url: uploadedImage,
            uploaded_at: new Date()
          });

        if (photoError) {
          console.error('Error uploading photo:', photoError);
          // Don't throw here - the review was created successfully
        }
      }

      // Update the average rating for the study spot
      await updateSpotAverageRating(spotId);

      // Navigate back to reviews feed
      navigate('/reviews');
    } catch (error) {
      console.error('Error creating review:', error);
      setError(error.message || 'Failed to create review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateSpotAverageRating = async (spotId) => {
    try {
      // Get all ratings for this spot
      const { data: reviews, error } = await supabase
        .from('Reviews')
        .select('rating')
        .eq('spot_id', spotId);

      if (error) throw error;

      if (reviews && reviews.length > 0) {
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        
        await supabase
          .from('StudySpot')
          .update({ 
            average_rating: Math.round(avgRating * 10) / 10,
            total_reviews: reviews.length
          })
          .eq('spot_id', spotId);
      }
    } catch (error) {
      console.error('Error updating average rating:', error);
    }
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
            disabled={loading}
          >
            {loading ? 'posting...' : 'post review'}
          </button>
        </div>
        
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            padding: '15px',
            marginBottom: '20px',
            color: '#dc2626'
          }}>
            {error}
          </div>
        )}
        
        <div className="create-review-card">
          <div className="review-form-content">
            <div className="form-left">
              <div className="user-info">
                <div className="user-avatar">
                  <span className="avatar-icon">👤</span>
                </div>
                <span className="username">@{user?.email?.split('@')[0] || 'username'}</span>
              </div>
              
              <div className="rating-selector">
                <p style={{ color: 'white', marginBottom: '10px' }}>Rating: *</p>
                {renderStars()}
              </div>
              
              <div className="image-upload-section">
                {uploadedImage ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <img 
                      src={uploadedImage} 
                      alt="Upload preview" 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        borderRadius: '20px'
                      }} 
                    />
                    <button
                      onClick={() => setUploadedImage(null)}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '30px',
                        height: '30px',
                        cursor: 'pointer'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="upload-placeholder">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      hidden
                    />
                    <span>📷</span>
                    <span>Click to upload image</span>
                  </label>
                )}
              </div>
            </div>
            
            <div className="form-right">
              <input
                type="text"
                placeholder="Study Spot Name (e.g., 'Third Floor Reading Room') *"
                value={studySpotName}
                onChange={(e) => setStudySpotName(e.target.value)}
                className="spot-name-input"
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '2px solid transparent',
                  borderRadius: '15px',
                  padding: '18px 24px',
                  fontSize: '20px',
                  fontWeight: '600',
                  marginBottom: '25px'
                }}
              />
              
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="spot-name-input"
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '2px solid transparent',
                  borderRadius: '15px',
                  padding: '18px 24px',
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '25px',
                  cursor: 'pointer'
                }}
              >
                <option value="">Select a Location/Building *</option>
                {locations.map(location => (
                  <option key={location.location_id} value={location.location_id}>
                    {location['building/area']}
                  </option>
                ))}
              </select>
              
              <textarea
                placeholder="Write your review here... *"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="review-textarea"
              />
              
              <p style={{ 
                fontSize: '14px', 
                color: '#666', 
                marginTop: '10px' 
              }}>
                * Required fields
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateReview;