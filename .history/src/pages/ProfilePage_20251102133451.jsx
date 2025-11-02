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
  const [favoriteSpotName, setFavoriteSpotName] = useState('');
  const [favoriteSpotId, setFavoriteSpotId] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [userReviews, setUserReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
      // Check if user exists in Users table
      const { data: userData, error: userError } = await supabase
        .from('Users')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (!userData && !userError) {
        // Create user profile if it doesn't exist
        await supabase
          .from('Users')
          .insert({
            user_id: user.id,
            email: user.email,
            username: user.email.split('@')[0],
            created_at: new Date().toISOString()
          });
      }
      
      // If you have additional profile data in a profiles table, load it here
      setLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      setLoading(false);
    }
  };
  
  const fetchUserReviews = async () => {
    if (!user) return;
    
    try {
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
        .eq('user_id', user.id)
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
          spotName: review.StudySpot?.name || 'Unknown Location',
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
    if (!user) return;
    
    try {
      // Save profile data
      // If you have a profiles table, you can save bio and favorite spot there
      setIsEditing(false);
      
      // For now, just show a success message
      alert('Profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
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
                  <input
                    type="text"
                    value={favoriteSpotName}
                    onChange={(e) => setFavoriteSpotName(e.target.value)}
                    className="spot-name-input"
                    placeholder="Enter spot name"
                  />
                </>
              ) : (
                <>
                  {favoriteSpotName && (
                    <>
                      <span className="bullet">•</span>
                      <span 
                        className="clickable-spot"
                        onClick={() => navigate(`/studyspot/${favoriteSpotId || 'snell-3'}`)}
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

          <div className="profile-reviews-grid">
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
                >
                  <img 
                    src={review.image} 
                    alt={review.spotName}
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