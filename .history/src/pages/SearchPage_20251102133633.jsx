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
      
      // First, fetch study spots with locations
      const { data: spotsData, error: spotsError } = await supabase
        .from('StudySpot')
        .select(`
          spot_id,
          name,
          average_rating,
          total_reviews,
          location_id
        `)
        .order('name');

      if (spotsError) throw spotsError;

      // Fetch locations separately
      const { data: locationsData, error: locationsError } = await supabase
        .from('Locations')
        .select('location_id, building_area');

      if (locationsError) console.error('Error fetching locations:', locationsError);

      // Fetch hours separately
      const { data: hoursData, error: hoursError } = await supabase
        .from('SpotHours')
        .select('spot_id, open_time, close_time, is_closed');

      if (hoursError) console.error('Error fetching hours:', hoursError);

      // Create lookup maps
      const locationsMap = {};
      if (locationsData) {
        locationsData.forEach(loc => {
          locationsMap[loc.location_id] = loc.building_area;
        });
      }

      const hoursMap = {};
      if (hoursData) {
        hoursData.forEach(hour => {
          if (!hoursMap[hour.spot_id]) {
            hoursMap[hour.spot_id] = [];
          }
          hoursMap[hour.spot_id].push(hour);
        });
      }

      // Transform the data
      const transformedSpots = spotsData.map(spot => ({
        id: spot.spot_id,
        name: spot.name,
        hours: formatHours(hoursMap[spot.spot_id]),
        building: locationsMap[spot.location_id] || '',
        averageRating: spot.average_rating || 0,
        totalReviews: spot.total_reviews || 0,
        // Use a default image or you can add an image_url field to your StudySpot table
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

  const formatHours = (spotHours) => {
    if (!spotHours || spotHours.length === 0) return 'Hours not available';
    
    const hours = spotHours[0];
    if (hours.is_closed) return 'Closed';
    
    if (hours.open_time && hours.close_time) {
      // Format the time strings
      const formatTime = (time) => {
        if (!time) return '';
        const [hour, minute] = time.split(':');
        const h = parseInt(hour);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
        return `${displayHour}:${minute} ${ampm}`;
      };
      
      return `${formatTime(hours.open_time)} - ${formatTime(hours.close_time)}`;
    }
    
    return '24/7';
  };

  const filteredSpots = studySpots.filter(spot =>
    spot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    spot.building.toLowerCase().includes(searchQuery.toLowerCase())
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
            placeholder="Search for study spots by name or building..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          
          {error && (
            <div style={{ 
              color: '#ef4444', 
              textAlign: 'center', 
              marginBottom: '20px' 
            }}>
              {error}
            </div>
          )}
          
          <div className="search-results">
            {filteredSpots.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: 'rgba(255, 255, 255, 0.7)',
                padding: '40px'
              }}>
                {searchQuery ? 'No study spots found matching your search.' : 'No study spots available.'}
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
                    {spot.building && (
                      <div style={{ 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        fontSize: '14px',
                        marginTop: '4px'
                      }}>
                        {spot.building}
                      </div>
                    )}
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