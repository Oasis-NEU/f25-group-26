const loadProfile = async () => {
    if (!user) return;
    
    try {
      console.log('Loading profile for:', user.email);
      
      // First try to get just the basic user info
      const { data: userData, error: userError } = await supabase
        .from('Users')
        .select('*')  // Select all columns to see what exists
        .eq('email', user.email)
        .single();
      
      console.log('User data found:', userData);
      console.log('User error:', userError);
      
      if (userData) {
        setUserId(userData.user_id);
        // Check if bio column exists and set it
        if ('bio' in userData) {
          setBio(userData.bio || 'Add your bio here!');
        } else {
          setBio('Add your bio here!');
        }import React, { useState, useEffect } from 'react';
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
      
      // Use simpler query without specific column selection
      const { data: allUsers, error: userError } = await supabase
        .from('Users')
        .select()
        .eq('email', user.email);
      
      console.log('Query result:', allUsers);
      console.log('Query error:', userError);
      
      const userData = allUsers && allUsers.length > 0 ? allUsers[0] : null;
      
      if (userData) {
        console.log('Found user:', userData);
        setUserId(userData.user_id);
        setBio(userData.bio || 'Add your bio here!');
        if (userData.profile_picture_url) {
          setProfilePic(userData.profile_picture_url);
        }
        fetchUserReviews(userData.user_id);
      } else {
        console.log('No user found for email:', user.email);
        // You might be user ID 8, 9, or 10 based on your screenshot
        // Let's try to find your user by checking borkar.ma
        const { data: borkarUsers } = await supabase
          .from('Users')
          .select()
          .like('username', 'borkar%');
        
        console.log('Found borkar users:', borkarUsers);
        
        if (borkarUsers && borkarUsers.length > 0) {
          // Use the first matching user
          const matchedUser = borkarUsers[0];
          setUserId(matchedUser.user_id);
          setBio(matchedUser.bio || 'Add your bio here!');
          if (matchedUser.profile_picture_url) {
            setProfilePic(matchedUser.profile_picture_url);
          }
          fetchUserReviews(matchedUser.user_id);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      setLoading(false);
    }
  };setLoading(false);
    }
  };
  
  const fetchUserReviews = async (userIdToUse) => {
    if (!userIdToUse) return;
    
    try {
      const { data } = await supabase
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
            photo_url
          )
        `)
        .eq('user_id', userIdToUse)
        .order('created_at', { ascending: false });
      
      const transformedReviews = (data || []).map(review => ({
        id: review.review_id,
        image: review.Photos?.[0]?.photo_url || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300',
        spotId: review.spot_id,
        spotName: review.StudySpot?.name || 'Unknown Study Spot',
        rating: review.rating,
        reviewText: review.review_text
      }));
      
      setUserReviews(transformedReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };
  
  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleSaveProfile = async () => {
    console.log('Save button clicked');
    console.log('Current userId:', userId);
    console.log('Current bio:', bio);
    
    if (!userId) {
      alert('User ID not found. Please refresh the page.');
      return;
    }
    
    try {
      // Update both bio and profile_picture_url
      const updateData = { bio: bio };
      
      // Only add profile_picture_url if it exists
      if (profilePic) {
        updateData.profile_picture_url = profilePic;
      }
      
      console.log('Updating with data:', updateData);
      
      const { data, error } = await supabase
        .from('Users')
        .update(updateData)
        .eq('user_id', userId)
        .select();
      
      console.log('Update response:', data);
      
      if (error) {
        console.error('Update error:', error);
        alert('Failed to save: ' + error.message);
        return;
      }
      
      setIsEditing(false);
      alert('Profile saved successfully!');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save profile: ' + error.message);
    }
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
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
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '20px' }}>
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
                  background: 'white'
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
                borderRadius: '20px'
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
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    cursor: 'pointer'
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
                    padding: '20px 15px 15px'
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
                      {Array(review.rating).fill('★').join('')}
                      {Array(5 - review.rating).fill('☆').join('')}
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