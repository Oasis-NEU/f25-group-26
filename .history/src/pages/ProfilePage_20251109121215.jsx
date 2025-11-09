import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingSpot, setIsEditingSpot] = useState(false);
  const [bio, setBio] = useState('Add your bio here!');
  const [favoriteSpotName, setFavoriteSpotName] = useState('');
  const [favoriteSpotId, setFavoriteSpotId] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [userReviews, setUserReviews] = useState([]);
  const [studySpots, setStudySpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  
  // Get username from email (part before @)
  const username = user?.email ? user.email.split('@')[0] : 'username';
  
  useEffect(() => {
    if (user) {
      loadProfile();
      fetchUserReviews();
      fetchStudySpots();
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
        setProfileData(profileData);
        setBio(profileData.bio || 'Add your bio here!');
        setFavoriteSpotId(profileData.favorite_spot_id || '');
        setProfilePic(profileData.profile_picture_url || null);
        
        // If there's a favorite spot ID, fetch its name
        if (profileData.favorite_spot_id) {
          const { data: spotData } = await supabase
            .from('StudySpot')
            .select('name')
            .eq('spot_id', profileData.favorite_spot_id)
            .single();
          
          if (spotData) {
            setFavoriteSpotName(spotData.name);
          }
        }
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
  
  const fetchStudySpots = async () => {
    try {
      const { data, error } = await supabase
        .from('StudySpot')
        .select('spot_id, name')
        .order('name');
      
      if (error) throw error;
      
      setStudySpots(data || []);
    } catch (error) {
      console.error('Error fetching study spots:', error);
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
            name
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
        // Get the first available image
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
          spotId: review.spot_id,
          spotName: review.StudySpot?.name || 'Unknown Location',
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
          favorite_spot_id: favoriteSpotId || null,
          profile_picture_url: profilePic,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (error) throw error;
      
      setIsEditing(false);
      setIsEditingSpot(false);
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
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ProfilePictures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        // If bucket doesn't exist, try ReviewPhotos bucket instead
        const { data: altUploadData, error: altError } = await supabase.storage
          .from('ReviewPhotos')
          .upload(`profiles/${fileName}`, file, {
            cacheControl: '3600',
            upsert: true
          });
        
        if (altError) throw altError;
        
        const { data: urlData } = supabase.storage
          .from('ReviewPhotos')
          .getPublicUrl(`profiles/${fileName}`);
        
        setProfilePic(urlData.publicUrl);
      } else {
        const { data: urlData } = supabase.storage
          .from('ProfilePictures')
          .getPublicUrl(fileName);
        
        setProfilePic(urlData.publicUrl);
      }
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
  
  const handleSpotSelect = (e) => {
    const selectedId = e.target.value;
    setFavoriteSpotId(selectedId);
    
    const selectedSpot = studySpots.find(spot => spot.spot_id.toString() === selectedId);
    if (selectedSpot) {
      setFavoriteSpotName(selectedSpot.name);
    }
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
            <div className="favorite-spot-line">
              <span className="fixed-text">Favorite Study Spot</span>
              {isEditing ? (
                <>
                  <span className="bullet">•</span>
                  <select
                    value={favoriteSpotId}
                    onChange={handleSpotSelect}
                    className="spot-name-input"
                    style={{
                      cursor: 'pointer',
                      padding: '8px 12px',
                      fontSize: '20px'
                    }}
                  >
                    <option value="">Select a study spot</option>
                    {studySpots.map(spot => (
                      <option key={spot.spot_id} value={spot.spot_id}>
                        {spot.name}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  {favoriteSpotName && (
                    <>
                      <span className="bullet">•</span>
                      <span 
                        className="clickable-spot"
                        onClick={() => navigate(`/studyspot/${favoriteSpotId}`)}
                      >
                        {favoriteSpotName}
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
              <p className="bio-text">{bio}</p>
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
    </div>
  );
};

export default ProfilePage;