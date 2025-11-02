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
      
      // Fetch all locations
      const { data: locationsData, error: locationsError } = await supabase
        .from('Locations')
        .select('location_id, "building/area"')
        .order('"building/area"');

      if (locationsError) throw locationsError;

      // For each location, get the most recent review with a photo
      const locationsWithPhotos = await Promise.all(
        (locationsData || []).map(async (location) => {
          // Get most recent review for this location
          const { data: recentReview } = await supabase
            .from('Reviews')
            .select(`
              review_id,
              created_at,
              StudySpot!inner (
                location_id
              ),
              Photos (
                photo_url,
                photo2_url
              )
            `)
            .eq('StudySpot.location_id', location.location_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get photo from the review
          let photoUrl = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=150&h=150&fit=crop';
          if (recentReview && recentReview.Photos && recentReview.Photos.length > 0) {
            const photo = recentReview.Photos[0];
            if (photo.photo_url) {
              photoUrl = photo.photo_url;
            } else if (photo.photo2_url) {
              photoUrl = photo.photo2_url;
            }
          }

          // Get count of study spots in this location
          const { count: spotCount } = await supabase
            .from('StudySpot')
            .select('spot_id', { count: 'exact', head: true })
            .eq('location_id', location.location_id);

          return {
            id: location.location_id,
            name: location['building/area'],
            image: photoUrl,
            spotCount: spotCount || 0
          };
        })
      );

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