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
      // Convert location_id to integer
      const locationIdInt = parseInt(selectedLocationId, 10);
      // First, check if user exists by their auth UUID (stored in email or separate field)
      // We'll look up the user by their email since that's unique
      console.log('Looking up user by email:', user.email);
      
      const { data: existingUser, error: userCheckError } = await supabase
        .from('Users')
        .select('user_id')
        .eq('email', user.email)
        .maybeSingle();

      console.log('Existing user check:', { existingUser, userCheckError });

      let userIdInt;

      // If user doesn't exist, create them with auto-generated ID
      if (!existingUser) {
        console.log('Creating new user...');
        
        // Get the highest user_id to generate the next one
        const { data: maxUserData } = await supabase
          .from('Users')
          .select('user_id')
          .order('user_id', { ascending: false })
          .limit(1);
        
        const nextUserId = maxUserData && maxUserData.length > 0 ? maxUserData[0].user_id + 1 : 1;
        console.log('Next user ID will be:', nextUserId);

        const { data: newUser, error: userError } = await supabase
          .from('Users')
          .insert({
            user_id: nextUserId,
            email: user.email,
            username: user.email.split('@')[0],
            password_hash: 'SUPABASE_AUTH', // Placeholder since Supabase Auth handles passwords
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        console.log('User creation result:', { newUser, userError });

        if (userError && userError.code !== '23505') { // Ignore duplicate key error
          console.error('User creation failed:', userError);
          throw userError;
        }
        
        userIdInt = nextUserId;
      } else {
        userIdInt = existingUser.user_id;
        console.log('Using existing user ID:', userIdInt);
      }

      // Check if a StudySpot with this name and location already exists
      const { data: existingSpot, error: spotCheckError } = await supabase
        .from('StudySpot')
        .select('spot_id')
        .eq('name', studySpotName)
        .eq('location_id', locationIdInt)
        .maybeSingle();

      console.log('Existing spot check:', { existingSpot, spotCheckError });

      let spotId;

      if (existingSpot) {
        // Use existing spot
        spotId = existingSpot.spot_id;
        console.log('Using existing spot:', spotId);
      } else {
        // Get the highest spot_id to generate the next one
        const { data: maxSpotData } = await supabase
          .from('StudySpot')
          .select('spot_id')
          .order('spot_id', { ascending: false })
          .limit(1);
        
        const nextSpotId = maxSpotData && maxSpotData.length > 0 ? maxSpotData[0].spot_id + 1 : 1;
        console.log('Next spot ID will be:', nextSpotId);

        // Create new StudySpot with explicit ID
        console.log('Creating new spot with location_id:', locationIdInt);
        const { data: newSpot, error: spotError } = await supabase
          .from('StudySpot')
          .insert({
            spot_id: nextSpotId,
            name: studySpotName,
            location_id: locationIdInt,
            average_rating: 0,
            total_reviews: 0
          })
          .select()
          .single();

        if (spotError) {
          console.error('Error creating spot:', spotError);
          
          // If duplicate error, try to fetch the existing spot one more time
          if (spotError.code === '23505') {
            const { data: retrySpot } = await supabase
              .from('StudySpot')
              .select('spot_id')
              .eq('name', studySpotName)
              .eq('location_id', locationIdInt)
              .single();
            
            if (retrySpot) {
              spotId = retrySpot.spot_id;
              console.log('Found duplicate spot on retry:', spotId);
            } else {
              throw spotError;
            }
          } else {
            throw spotError;
          }
        } else {
          spotId = newSpot.spot_id;
          console.log('Created new spot:', spotId);
        }
      }

      // Get the highest review_id to generate the next one
      const { data: maxReviewData } = await supabase
        .from('Reviews')
        .select('review_id')
        .order('review_id', { ascending: false })
        .limit(1);
      
      const nextReviewId = maxReviewData && maxReviewData.length > 0 ? maxReviewData[0].review_id + 1 : 1;
      console.log('Next review ID will be:', nextReviewId);

      // Create the review
      console.log('Creating review with:', {
        review_id: nextReviewId,
        user_id: userIdInt,
        spot_id: spotId,
        rating: rating,
        review_text: reviewText
      });
      
      const { data: reviewData, error: reviewError } = await supabase
        .from('Reviews')
        .insert({
          review_id: nextReviewId,
          user_id: userIdInt,
          spot_id: spotId,
          rating: rating,
          review_text: reviewText,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      console.log('Review creation result:', { reviewData, reviewError });

      if (reviewError) {
        console.error('Review creation failed:', reviewError);
        throw reviewError;
      }

      // If there's an uploaded image, save it to Photos table
      if (uploadedImage && reviewData) {
        // Get the highest photo_id to generate the next one
        const { data: maxPhotoData } = await supabase
          .from('Photos')
          .select('photo_id')
          .order('photo_id', { ascending: false })
          .limit(1);
        
        const nextPhotoId = maxPhotoData && maxPhotoData.length > 0 ? maxPhotoData[0].photo_id + 1 : 1;
        console.log('Next photo ID will be:', nextPhotoId);

        // For now, we'll store the base64 data URL
        // In production, you'd want to upload to Supabase Storage first
        const { error: photoError } = await supabase
          .from('Photos')
          .insert({
            photo_id: nextPhotoId,
            review_id: reviewData.review_id,
            photo_url: uploadedImage,
            uploaded_at: new Date().toISOString()
          });

        if (photoError) {
          console.error('Error uploading photo:', photoError);
          // Don't throw here - the review was created successfully
        } else {
          console.log('Photo uploaded successfully with ID:', nextPhotoId);
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