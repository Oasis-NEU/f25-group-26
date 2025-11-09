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
  const [profilePic, setProfilePic] = useState(null);
  const [userReviews, setUserReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  
  // Get username from email (part before @)
  const username = user?.email ? user.email.split('@')[0] : 'username';
  
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);
  
  const loadProfile = async () => {
    if (!user) return;
    
    try {
      console.log('Loading profile for:', user.email);
      
      // First, check if user exists in Users table by email
      const { data: userData, error: userCheckError } = await supabase
        .from('Users')
        .select('user_id, bio, profile_picture_url')
        .eq('email', user.email)
        .single();
      
      console.log('User data found:', userData);
      
      if (userData) {
        setUserId(userData.user_id);
        // Load existing bio - use default if null/empty
        setBio(userData.bio || 'Add your bio here!');
        // Load existing profile picture
        if (userData.profile_picture_url) {
          setProfilePic(userData.profile_picture_url);
        }
        // Now fetch reviews with the user_id
        fetchUserReviews(userData.user_id);
      } else {
        // User doesn't exist, create them
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
            bio: 'Add your bio here!',
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (!insertError && newUser) {
          setUserId(nextUserId);
          setBio('Add your bio here!');
          fetchUserReviews(nextUserId);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      setLoading(false);
    }
  };
  
  const fetchUserReviews = async (userIdToUse) => {
    if (!userIdToUse) return;
    
    try {
      console.log('Fetching reviews for user_id:', userIdToUse);
      
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
        .eq('user_id', userIdToUse)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching reviews:', error);
        return;
      }
      
      // Transform the data for the grid
      const transformedReviews = (data || []).map(review => {
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
    if (!userId) {
      alert('User ID not found. Please refresh the page.');
      return;
    }
    
    try {
      console.log('Saving profile for user_id:', userId);
      console.log('Bio to save:', bio);
      
      // Update the Users table
      const { data, error } = await supabase
        .from('Users')
        .update({
          bio: bio,
          profile_picture_url: profilePic
        })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        console.error('Update error:', error);
        alert('Failed to save profile: ' + error.message);
        return;
      }
      
      console.log('Profile updated successfully:', data);
      
      // Update was successful
      setIsEditing(false);
      
      // Optional: Show success message
      alert('Profile saved successfully!');
      
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile: ' + error.message);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reload the original data
    loadProfile();
  };

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `profile_${userId}_${Date.now()}.${fileExt}`;
      
      // Upload to ReviewPhotos bucket
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
      // Fallback to base64
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
                {!isEditing ? (
                  <button 
                    className="action-btn secondary-btn"
                    onClick={() => setIsEditing(true)}
                  >
                    edit profile
                  </button>
                ) : (
                  <>
                    <button 
                      className="action-btn secondary-btn"
                      onClick={handleCancelEdit}
                    >
                      cancel
                    </button>
                    <button 
                      className="action-btn save-btn"
                      onClick={handleSaveProfile}
                    >
                      save
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="profile-bio-section" style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '25px',
            padding: '30px',
            marginBottom: '35px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.1)'
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
                  background: 'white'
                }}
              />
            ) : (
              <p className="bio-text" style={{
                color: '#4a5568',
                lineHeight: '1.8',
                fontSize: '17px',
                fontWeight: '400',
                whiteSpace: 'pre-wrap'
              }}>
                {bio || 'Add your bio here!'}
              </p>
            )}
          </div>

          <div className="profile-reviews-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
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
              userReviews.map(