import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import './SearchPage.css';

const SearchPage = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [studySpots, setStudySpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStudySpots();
  }, []);

  const fetchStudySpots = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simple query - just fetch study spots
      const { data, error } = await supabase
        .from('StudySpot')
        .select('*')
        .order('name');

      if (error) throw error;

      // Transform the data with default values
      const transformedSpots = (data || []).map(spot => ({
        id: spot.spot_id,
        name: spot.name || 'Unnamed Spot',
        hours: 'Check for hours',  // Default hours text
        building: '',  // We'll update this if needed
        averageRating: spot.average_rating || 0,
        totalReviews: spot.total_reviews || 0,
        image: `https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=150&h=150&fit=crop`
      }));

      setStudySpots(transformedSpots);
    } catch (error) {
      console.error('Error fetching study spots:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredSpots = studySpots.filter(spot =>
    spot.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = () => {
    signOut();
    navigate('/');
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

  if (loading) {
    return (
      <div className="search-container">
        <header className="search-header">
          <h1 className="logo" onClick={() => navigate('/')}>StudySphere</h1>
          <nav className="nav-links">
            <button className="nav-link" onClick={() => navigate('/reviews')}>Reviews</button>
            <button className="nav-link" onClick={() => navigate('/profile')}>Profile</button>
            <button className="nav-link active">Search</button>
          </nav>
          <button onClick={handleLogout} className="logout-btn">Log-Out</button>
        </header>
        <main className="search-main">
          <div className="search-content">
            <h2 className="search-title">Loading study spots...</h2>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="search-container">
      <header className="search-header">
        <h1 className="logo" onClick={() => navigate('/')}>StudySphere</h1>
        <nav className="nav-links">
          <button className="nav-link" onClick={() => navigate('/reviews')}>Reviews</button>
          <button className="nav-link" onClick={() => navigate('/profile')}>Profile</button>
          <button className="nav-link active">Search</button>
        </nav>
        <button onClick={handleLogout} className="logout-btn">Log-Out</button>
      </header>

      <main className="search-main">
        <div className="search-content">
          <h2 className="search-title">StudySpot</h2>
          
          <input
            type="text"
            placeholder="Search for study spots by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          
          {error && (
            <div style={{ 
              color: '#ef4444', 
              textAlign: 'center', 
              marginBottom: '20px',
              padding: '10px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '10px'
            }}>
              Error: {error}
            </div>
          )}
          
          <div className="search-results">
            {filteredSpots.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: 'rgba(255, 255, 255, 0.7)',
                padding: '40px'
              }}>
                {studySpots.length === 0 
                  ? 'No study spots in database. Please add some study spots first.' 
                  : 'No study spots found matching your search.'}
              </div>
            ) : (
              filteredSpots.map(spot => (
                <div 
                  key={spot.id}
                  className="spot-result"
                  onClick={() => navigate(`/studyspot/${spot.id}`)}
                >
                  <img src={spot.image} alt={spot.name} className="spot-thumbnail" />
                  <div style={{ flex: 1 }}>
                    <span className="spot-name">{spot.name}</span>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      marginTop: '8px'
                    }}>
                      {renderStars(spot.averageRating)}
                      <span style={{ 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        fontSize: '13px' 
                      }}>
                        ({spot.totalReviews} reviews)
                      </span>
                    </div>
                  </div>
                  <span className="spot-hours">{spot.hours}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SearchPage;