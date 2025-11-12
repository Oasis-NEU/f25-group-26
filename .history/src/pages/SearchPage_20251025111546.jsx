import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './SearchPage.css';

const SearchPage = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const studySpots = [
    {
      id: 'snell-3',
      name: 'Snell Library - 3rd Floor',
      hours: '7:00 AM - 2:00 AM',
      image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=150'
    },
    {
      id: 'isec-1',
      name: 'ISEC First Floor',
      hours: '24/7',
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=150'
    },
    {
      id: 'curry',
      name: 'Curry Student Center',
      hours: '7:00 AM - 12:00 AM',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    }
  ];

  const filteredSpots = studySpots.filter(spot =>
    spot.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = () => {
    signOut();
    navigate('/');
  };

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
            placeholder="search for the study spot here"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          
          <div className="search-results">
            {filteredSpots.map(spot => (
              <div 
                key={spot.id}
                className="spot-result"
                onClick={() => navigate(`/studyspot/${spot.id}`)}
              >
                <img src={spot.image} alt={spot.name} className="spot-thumbnail" />
                <span className="spot-name">{spot.name}</span>
                <span className="spot-hours">{spot.hours}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SearchPage;