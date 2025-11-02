import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import './SearchPage.css';

const SearchPage = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all locations with their spot counts in ONE query
      const { data: locationsData, error: locationsError } = await supabase
        .from('Locations')
        .select(`
          location_id, 
          "building/area",
          StudySpot (
            spot_id,
            Reviews (
              review_id,
              Photos (
                photo_url,
                photo2_url
              )
            )
          )
        `)
        .order('"building/area"');

      if (locationsError) throw locationsError;

      // Transform the data
      const locationsWithPhotos = (locationsData || []).map(location => {
        const studySpots = location.StudySpot || [];
        const spotCount = studySpots.length;

        // Find first photo from any review
        let photoUrl = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=150&h=150&fit=crop';
        
        for (const spot of studySpots) {
          const reviews = spot.Reviews || [];
          for (const review of reviews) {
            if (review.Photos && review.Photos.length > 0) {
              const photo = review.Photos[0];
              if (photo.photo_url) {
                photoUrl = photo.photo_url;
                break;
              } else if (photo.photo2_url) {
                photoUrl = photo.photo2_url;
                break;
              }
            }
          }
          if (photoUrl !== 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=150&h=150&fit=crop') {
            break;
          }
        }

        return {
          id: location.location_id,
          name: location['building/area'],
          image: photoUrl,
          spotCount: spotCount
        };
      });

      setLocations(locationsWithPhotos);
      
      if (locationsWithPhotos.length === 0) {
        setError('No locations found in database');
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = () => {
    signOut();
    navigate('/');
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
            <h2 className="search-title">Loading locations...</h2>
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
          <h2 className="search-title">Search Locations</h2>
          
          <input
            type="text"
            placeholder="Search for locations..."
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
            {filteredLocations.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: 'rgba(255, 255, 255, 0.7)',
                padding: '40px'
              }}>
                {searchQuery ? 'No locations found matching your search.' : 'No locations available.'}
              </div>
            ) : (
              filteredLocations.map(location => (
                <div 
                  key={location.id}
                  className="spot-result"
                  onClick={() => navigate(`/location/${location.id}`)}
                >
                  <img src={location.image} alt={location.name} className="spot-thumbnail" />
                  <div style={{ flex: 1 }}>
                    <span className="spot-name">{location.name}</span>
                    <div style={{ 
                      color: 'rgba(255, 255, 255, 0.7)', 
                      fontSize: '14px',
                      marginTop: '4px'
                    }}>
                      {location.spotCount} study spot{location.spotCount !== 1 ? 's' : ''}
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

export default SearchPage;