import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [favoriteLocationId, setFavoriteLocationId] = useState('');
  const [favoriteLocationName, setFavoriteLocationName] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [userReviews, setUserReviews] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  
  // Get username from email (part before @)
  const username = user?.email ? user.email.split('@')[0] : 'username';
  
  useEffect(() => {
    if (user) {
      loadProfile();
      fetchUserReviews();
      fetchLocations();
    }
  }, [user]);
  
  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('Locations')
        .select('location_id, "building/area"')
        .order('"building/area"');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };
  
  const loadProfile = async () => {
    if (!user) return;
    
    try {
      // First, check if user exists in Users table
      const { data: userData, error: userCheckError } = await supabase
        .from('Users')
        .select('*')
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
        
        const { data: newUser, error: createError } = await supabase
          .from('Users')
          .insert({
            user_id: nextUserId,
            email: user.email,
            username: user.email.split('@')[0],
            password_hash: 'SUPABASE_AUTH',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError && createError.code !== '23505') throw createError;
        userId = nextUserId;
      } else {
        userId = userData.user_id;
      }

      // Load profile data
      const { data: profileInfo, error: profileError } = await supabase
        .from('UserProfiles')
        .select(`
          bio,
          favorite_location_id,
          profile_picture_url,
          Locations (
            location_id,
            "building/area"
          )
        `)
        .eq('user_id', userId)
        .maybeSingle();

      if (profileInfo) {
        setProfileData(profileInfo);
        setBio(profileInfo.bio || '');
        setProfilePic(profileInfo.profile_picture_url);
        
        if (profileInfo.favorite_location_id && profileInfo.Locations) {
          setFavoriteLocationId(profileInfo.favorite_location_id);
          setFavoriteLocationName(profileInfo.Locations['building/area']);
        }
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
      // First get the user_id from Users table
      const { data: userData } = await supabase
        .from('Users')
        .select('user_id')
        .eq('email', user.email)
        .single();

      if (!userData) return;

      // Fetch all reviews by this user
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
            location_id
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
          spotId: review.spot_id,
          rating: review.rating,
          username: username,
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
      // Get user_id from Users table
      const { data: userData } = await supabase
        .from('Users')
        .select('user_id')
        .eq('email', user.email)
        .single();

      if (!userData) return;

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('UserProfiles')
        .select('profile_id')
        .eq('user_id', userData.user_id)
        .maybeSingle();

      const profileData = {
        user_id: userData.user_id,
        bio: bio,
        favorite_location_id: favoriteLocationId || null,
        updated_at: new Date().toISOString()
      };

      if (existingProfile) {
        // Update existing profile
        await supabase
          .from('UserProfiles')
          .update(profileData)
          .eq('user_id', userData.user_id);
      } else {
        // Create new profile
        await supabase
          .from('UserProfiles')
          .insert({
            ...profileData,
            created_at: new Date().toISOString()
          });
      }
      
      setIsEditing(false);
      
      // Update the display name for favorite location
      if (favoriteLocationId) {
        const selectedLoc = locations.find(l => l.location_id === parseInt(favoriteLocationId));
        if (selectedLoc) {
          setFavoriteLocationName(selectedLoc['building/area']);
        }
      }
      
      alert('Profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    }
  };

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (file && user) {
      setUploadingPic(true);
      
      try {
        // Get user_id
        const { data: userData } = await supabase
          .from('Users')
          .select('user_id')
          .eq('email', user.email)
          .single();

        if (!userData) return;

        // Upload to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${userData.user_id}_${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('ProfilePictures')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('ProfilePictures')
          .getPublicUrl(fileName);

        const photoUrl = urlData.publicUrl;
        setProfilePic(photoUrl);

        // Update or create profile with new picture URL
        const { data: existingProfile } = await supabase
          .from('UserProfiles')
          .select('profile_id')
          .eq('user_id', userData.user_id)
          .maybeSingle();

        if (existingProfile) {
          await supabase
            .from('UserProfiles')
            .update({ 
              profile_picture_url: photoUrl,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userData.user_id);
        } else {
          await supabase
            .from('UserProfiles')
            .insert({
              user_id: userData.user_id,
              profile_picture_url: photoUrl,
              created_at: new Date().toISOString()
            });
        }
      } catch (error) {
        console.error('Error uploading profile picture:', error);
        alert('Failed to upload profile picture');
      } finally {
        setUploadingPic(false);
      }
    }
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

  // Full review modal view
  if (selectedReview) {
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
            ← Back to Profile
          </button>

          <div className="review-card-full" style={{
            background: 'linear-gradient(135deg, #6b5b95 0%, #8b7fb8 100%)',
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
                  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)',
                  overflow: 'hidden'
                }}>
                  {profilePic ? (
                    <img 
                      src={profilePic} 
                      alt="Profile" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: '24px' }}>👤</span>
                  )}
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
                disabled={uploadingPic}
              />
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="profile-pic" />
              ) : (
                <span className="avatar-icon-large">👤</span>
              )}
              <div className="upload-overlay">
                <span className="camera-icon">📷</span>
                <span className="upload-text">
                  {uploadingPic ? 'Uploading...' : 'Change Photo'}
                </span>
              </div>
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
            <div className="favorite-spot-line">
              <span className="fixed-text">Favorite Location</span>
              {isEditing ? (
                <>
                  <span className="bullet">•</span>
                  <select
                    value={favoriteLocationId}
                    onChange={(e) => setFavoriteLocationId(e.target.value)}
                    className="spot-name-input"
                    style={{
                      cursor: 'pointer',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.9)'
                    }}
                  >
                    <option value="">Select a location</option>
                    {locations.map(location => (
                      <option key={location.location_id} value={location.location_id}>
                        {location['building/area']}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  {favoriteLocationName && (
                    <>
                      <span className="bullet">•</span>
                      <span 
                        className="clickable-spot"
                        onClick={() => navigate(`/location/${favoriteLocationId}`)}
                      >
                        {favoriteLocationName}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
            
            {isEditing ? (
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="edit-textarea"
                placeholder="Add your bio here..."
              />
            ) : (
              <p className="bio-text">{bio || 'Add bio here!'}</p>
            )}
          </div>

          {/* Instagram Grid for Reviews */}
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
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;