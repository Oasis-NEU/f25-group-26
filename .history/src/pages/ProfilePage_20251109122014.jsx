import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('Add your bio here!');
  const [profilePic, setProfilePic] = useState(null);
  const [userReviews, setUserReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  // Get username from email (part before @)
  const username = user?.email ? user.email.split('@')[0] : 'username';
  
  useEffect(() => {
    if (user) {
      loadProfile();
      fetchUserReviews();
    }
  }, [user]);
  
  const loadProfile = async () => {
    if (!user) return;
    
    try {
      // First, check if user exists in Users table by email
      const { data: userData, error: userCheckError } = await supabase
        .from('Users')
        .select('user_id')
        .eq('email', user.email)
        .maybeSingle();
      
      let userId;
      
      if (!userData) {
        // Create user if doesn't exist
        const { data: maxUserData } = await supabase
          .from('Users')
          .select('user_id')
          .order('user_id', { ascending: false })
          .limit(1);
        
        const nextUserId = maxUserData && maxUserData.length > 0 ? maxUserData[0].user_id + 1 : 1;
        
        await supabase
          .from('Users')
          .insert({
            user_id: nextUserId,
            email: user.email,
            username: user.email.split('@')[0],
            password_hash: 'SUPABASE_AUTH',
            created_at: new Date().toISOString()
          });
        
        userId = nextUserId;
      } else {
        userId = userData.user_id;
      }
      
      // Check if UserProfiles entry exists
      const { data: profileData, error: profileError } = await supabase
        .from('UserProfiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (profileData) {
        setBio(profileData.bio || 'Add your bio here!');
        setProfilePic(profileData.profile_picture_url || null);
      } else {
        // Create profile if it doesn't exist
        await supabase
          .from('UserProfiles')
          .insert({
            user_id: userId,
            bio: 'Add your bio here!',
            created_at: new Date().toISOString()
          });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      setLoading(false);
    }
  };
  
  const fetchUserReviews = async () => {
    if (!user) return;
    
    try {
      // First get the user_id
      const { data: userData } = await supabase
        .from('Users')
        .select('user_id')
        .eq('email', user.email)
        .single();
      
      if (!userData) return;
      
      // Fetch all reviews by this user with photos
      const { data, error } = await supabase
        .from('Reviews')
        .select(`
          review_id,
          rating,
          review_text,
          created_at,
          spot_id,
          StudySpot (
            name,
            location_id,
            Locations (
              "building/area"
            )
          ),
          Photos (
            photo_url,
            photo2_url
          )
        `)
        .eq('user_id', userData.user_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform the data for the grid
      const transformedReviews = data.map(review => {
        // Get all available images
        const images = [];
        if (review.Photos && review.Photos.length > 0) {
          review.Photos.forEach(photo => {
            if (photo.photo_url) images.push(photo.photo_url);
            if (photo.photo2_url) images.push(photo.photo2_url);
          });
        }
        
        // Use first image for grid display, or default
        const gridImage = images.length > 0 ? images[0] : 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400';
        
        return {
          review_id: review.review_id,
          gridImage: gridImage,
          allImages: images.length > 0 ? images : [gridImage],
          spotId: review.spot_id,
          spotName: review.StudySpot?.name || 'Unknown Study Spot',
          locationName: review.StudySpot?.Locations?.['building/area'] || 'Unknown Location',
          rating: review.rating,
          reviewText: review.review_text,
          createdAt: review.created_at
        };
      });
      
      setUserReviews(transformedReviews);
    } catch (error) {
      console.error('Error fetching user reviews:', error);
    }
  };
  
  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      // Get user_id
      const { data: userData } = await supabase
        .from('Users')
        .select('user_id')
        .eq('email', user.email)
        .single();
      
      if (!userData) {
        alert('User not found');
        return;
      }
      
      // Update or insert profile data
      const { error } = await supabase
        .from('UserProfiles')
        .upsert({
          user_id: userData.user_id,
          bio: bio,
          profile_picture_url: profilePic,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (error) throw error;
      
      setIsEditing(false);
      alert('Profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    }
  };

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      
      // Try ReviewPhotos bucket with profiles subfolder
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ReviewPhotos')
        .upload(`profiles/${fileName}`, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('ReviewPhotos')
        .getPublicUrl(`profiles/${fileName}`);
      
      setProfilePic(urlData.publicUrl);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      // Fallback to base64 for display
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const openReviewModal = (review) => {
    setSelectedReview(review);
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setSelectedReview(null);
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <span key={i} style={{ 
        color: i < rating ? '#ffd700' : 'rgba(255, 255, 255, 0.3)',
        fontSize: '24px'
      }}>
        ★
      </span>
    ));
  };

  if (loading) {
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
            <h2 style={{ color: 'white', textAlign: 'center' }}>Loading profile...</h2>
          </div>
        </main>
      </div>
    );
  }

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
            <label className="profile-avatar-large clickable-avatar">
              <input 
                type="file" 
                accept="image/*"
                onChange={handleProfilePicChange}
                hidden
                disabled={!isEditing}
              />
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="profile-pic" />
              ) : (
                <span className="avatar-icon-large">👤</span>
              )}
              {isEditing && (
                <div className="upload-overlay">
                  <span className="camera-icon">📷</span>
                  <span className="upload-text">Change Photo</span>
                </div>
              )}
            </label>
            
            <div className="profile-details">
              <h2>@{username}</h2>
              <p className="email">• {user?.email || 'email address'}</p>
              <p style={{ 
                color: 'rgba(255, 255, 255, 0.8)', 
                marginBottom: '20px' 
              }}>
                {userReviews.length} review{userReviews.length !== 1 ? 's' : ''} posted
              </p>
              
              <div className="profile-actions">
                <button 
                  className="action-btn primary-btn"
                  onClick={() => navigate('/create-review')}
                >
                  new review
                </button>
                <button 
                  className="action-btn secondary-btn"
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
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="edit-textarea"
                placeholder="Add your bio here..."
                style={{
                  width: '100%',
                  minHeight: '150px',
                  padding: '18px',
                  border: '2px solid #e2d9ec',
                  borderRadius: '20px',
                  fontSize: '17px',
                  lineHeight: '1.8',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'all 0.3s ease',
                  background: 'rgba(255, 255, 255, 0.8)'
                }}
              />
            ) : (
              <p className="bio-text" style={{
                color: '#4a5568',
                lineHeight: '1.8',
                fontSize: '17px',
                fontWeight: '400'
              }}>
                {bio}
              </p>
            )}
          </div>

          {/* Instagram-style 3-column grid for posts */}
          <div className="instagram-grid">
            {userReviews.length === 0 ? (
              <div style={{ 
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '60px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                backdropFilter: 'blur(10px)'
              }}>
                <h3 style={{ color: 'white', marginBottom: '15px' }}>No reviews yet</h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '25px' }}>
                  Share your favorite study spots with the community!
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
                  Create Your First Review
                </button>
              </div>
            ) : (
              userReviews.map(review => (
                <div 
                  key={review.review_id}
                  className="grid-item"
                  onClick={() => openReviewModal(review)}
                  style={{ cursor: 'pointer' }}
                >
                  <img 
                    src={review.gridImage} 
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
                          {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                        </div>
                        <div className="overlay-username">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Review Modal Popup */}
      {showReviewModal && selectedReview && (
        <div 
          className="review-modal-overlay"
          onClick={closeReviewModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            animation: 'fadeIn 0.3s ease'
          }}
        >
          <div 
            className="review-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, #6b5b95 0%, #8b7fb8 100%)',
              borderRadius: '30px',
              padding: '35px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              position: 'relative',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              animation: 'slideUp 0.3s ease'
            }}
          >
            {/* Close button */}
            <button
              onClick={closeReviewModal}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                fontSize: '24px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
            >
              ×
            </button>

            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
              {/* Left side - Image(s) */}
              <div style={{ flex: '1', minWidth: '300px' }}>
                <div style={{ marginBottom: '20px' }}>
                  {renderStars(selectedReview.rating)}
                </div>
                
                {/* Main image */}
                <div style={{
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
                }}>
                  <img 
                    src={selectedReview.allImages[0]} 
                    alt="Review"
                    style={{
                      width: '100%',
                      height: '400px',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600';
                    }}
                  />
                </div>
                
                {/* Show additional images if available */}
                {selectedReview.allImages.length > 1 && (
                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    marginTop: '15px',
                    overflowX: 'auto'
                  }}>
                    {selectedReview.allImages.slice(1).map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Additional ${idx + 1}`}
                        style={{
                          width: '100px',
                          height: '100px',
                          objectFit: 'cover',
                          borderRadius: '10px',
                          cursor: 'pointer'
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Right side - Review details */}
              <div style={{ flex: '1', minWidth: '300px' }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '20px',
                  padding: '25px'
                }}>
                  <h3 style={{
                    color: 'white',
                    fontSize: '28px',
                    marginBottom: '10px',
                    fontWeight: '700'
                  }}>
                    {selectedReview.spotName}
                  </h3>
                  
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '16px',
                    marginBottom: '20px'
                  }}>
                    📍 {selectedReview.locationName}
                  </p>
                  
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '15px',
                    padding: '20px',
                    marginBottom: '20px'
                  }}>
                    <p style={{
                      color: '#2d3748',
                      lineHeight: '1.8',
                      fontSize: '16px'
                    }}>
                      {selectedReview.reviewText}
                    </p>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <p style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '14px'
                    }}>
                      Posted on {new Date(selectedReview.createdAt).toLocaleDateString()}
                    </p>
                
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;