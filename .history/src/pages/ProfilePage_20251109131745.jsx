import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('add bio here!');
  const [profilePic, setProfilePic] = useState(null);
  const [userReviews, setUserReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  
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
        .select('user_id, bio, profile_picture_url')
        .eq('email', user.email)
        .maybeSingle();
      
      let currentUserId;
      
      if (!userData) {
        // Create user if doesn't exist
        const { data: maxUserData } = await supabase
          .from('Users')
          .select('user_id')
          .order('user_id', { ascending: false })
          .limit(1);
        
        const nextUserId = maxUserData && maxUserData.length > 0 ? maxUserData[0].user_id + 1 : 1;
        
        const { data: newUser, error: insertError } = await supabase
          .from('Users')
          .insert({
            user_id: nextUserId,
            email: user.email,
            username: user.email.split('@')[0],
            password_hash: 'SUPABASE_AUTH',
            bio: 'add bio here!',
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Error creating user:', insertError);
        } else {
          currentUserId = nextUserId;
          setBio('add bio here!');
        }
      } else {
        currentUserId = userData.user_id;
        // Load existing bio and profile picture
        if (userData.bio) {
          setBio(userData.bio);
        }
        if (userData.profile_picture_url) {
          setProfilePic(userData.profile_picture_url);
        }
      }
      
      setUserId(currentUserId);
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
        // Get the first available image
        let image = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300';
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
          spotName: review.StudySpot?.name || 'Unknown Study Spot',
          locationName: review.StudySpot?.Locations?.['building/area'] || 'Unknown Location',
          rating: review.rating,
          reviewText: review.review_text
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
    if (!user || !userId) return;
    
    try {
      console.log('Saving profile for user_id:', userId);
      console.log('Bio to save:', bio);
      console.log('Profile pic to save:', profilePic);
      
      // Build the update object dynamically
      const updateData = {
        bio: bio
      };
      
      // Only add profile_picture_url if it exists
      if (profilePic) {
        updateData.profile_picture_url = profilePic;
      }
      
      // Update the Users table
      const { data, error } = await supabase
        .from('Users')
        .update(updateData)
        .eq('user_id', userId);
      
      console.log('Update result:', data);
      
      if (error) {
        console.error('Update error details:', error);
        throw error;
      }
      
      setIsEditing(false);
      alert('Profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile: ' + error.message);
    }
  };

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      
      // Try to create/use a profiles folder in ReviewPhotos bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ReviewPhotos')
        .upload(`profiles/${fileName}`, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        // Fallback to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfilePic(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('ReviewPhotos')
          .getPublicUrl(`profiles/${fileName}`);
        
        console.log('Profile picture URL:', urlData.publicUrl);
        setProfilePic(urlData.publicUrl);
      }
    } catch (error) {
      console.error('Error handling profile picture:', error);
      // Fallback to base64 for display
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result);
      };
      reader.readAsDataURL(file);
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

          <div className="profile-bio-section" style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '25px',
            padding: '30px',
            marginBottom: '35px'
          }}>
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

          <div className="profile-reviews-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '15px'
          }}>
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
                  className="profile-review-tile"
                  onClick={() => navigate(`/studyspot/${review.spotId}`)}
                  title={`${review.spotName} - ${review.rating} stars`}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <img 
                    src={review.image} 
                    alt={review.spotName}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300';
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                    padding: '20px 15px 15px',
                    borderRadius: '0 0 20px 20px'
                  }}>
                    <div style={{ 
                      color: 'white', 
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '5px'
                    }}>
                      {review.spotName}
                    </div>
                    <div style={{ color: '#ffd700', fontSize: '12px' }}>
                      {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
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