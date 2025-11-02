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
  const [loading, setLoading] = useState(true);
  
  // Get username from email (part before @)
  const username = user?.email ? user.email.split('@')[0] : 'username';
  
  useEffect(() => {
    // Load user profile data from Supabase if you have a profiles table
    const loadProfile = async () => {
      if (!user) return;
      
      try {
        // If you have a profiles table in Supabase, uncomment this:
        /*
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setBio(data.bio || 'add bio here!');
          setFavoriteSpotName(data.favorite_spot_name || '');
          setFavoriteSpotId(data.favorite_spot_id || '');
          setProfilePic(data.avatar_url || null);
        }
        */
        setLoading(false);
      } catch (error) {
        console.error('Error loading profile:', error);
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [user]);
  
  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      // If you have a profiles table in Supabase, uncomment this:
      /*
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          bio: bio,
          favorite_spot_name: favoriteSpotName,
          favorite_spot_id: favoriteSpotId,
          avatar_url: profilePic,
          updated_at: new Date().toISOString(),
        });
      
      if (error) {
        console.error('Error saving profile:', error);
        alert('Failed to save profile');
      } else {
        alert('Profile saved successfully!');
      }
      */
      
      // For now, just close edit mode
      setIsEditing(false);
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
      
      // If you want to upload to Supabase Storage:
      /*
      const uploadAvatar = async () => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file);
        
        if (!uploadError) {
          const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          
          setProfilePic(data.publicUrl);
        }
      };
      uploadAvatar();
      */
    }
  };

  const userReviews = [
    { id: 1, image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300', spotId: 'snell-3' },
    { id: 2, image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=300', spotId: 'isec-1' },
    { id: 3, image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=300', spotId: 'bookstore' }
  ];

  if (loading) {
    return <div className="loading-container">Loading profile...</div>;
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
            {userReviews.map(review => (
              <div 
                key={review.id}
                className="profile-review-tile"
                onClick={() => navigate(`/studyspot/${review.spotId}`)}
              >
                <img src={review.image} alt="Study spot" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;