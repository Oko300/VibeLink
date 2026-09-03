import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import XAuthButton from '../components/XAuthButton';
import { useAuth } from '../hooks/useAuth';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const startSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(apiUrl + '/api/session/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ displayName: user ? user.username : 'Anonymous' }),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      localStorage.setItem('vibelink_builder_token', data.builderToken);
      navigate(`/builder/${data.sessionId}`);
    } catch (err) {
      setError('Failed to start session. Please try again.');
      console.error('Error starting session:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.authContainer}>
        <XAuthButton />
      </div>
      <h1 style={styles.heading}>VibeLink</h1>
      <p style={styles.tagline}>Drop a link. Let your community watch the AI build with you in real time.</p>
      <button
        onClick={startSession}
        disabled={loading}
        style={styles.button}
      >
        {loading ? 'Starting session...' : 'Start Live Session'}
      </button>
      {error && <p style={styles.errorText}>{error}</p>}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#0d0d0d',
    color: 'white',
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center',
    padding: '20px',
  },
  heading: {
    fontSize: '3em',
    marginBottom: '10px',
  },
  tagline: {
    fontSize: '1.2em',
    marginBottom: '40px',
    maxWidth: '600px',
  },
  button: {
    padding: '15px 30px',
    fontSize: '1.2em',
    backgroundColor: '#61dafb',
    color: '#0d0d0d',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background-color 0.3s ease',
  },
  errorText: {
    color: 'red',
    marginTop: '20px',
    authContainer: {
      position: 'absolute',
      top: '20px',
      right: '20px',
    },
  }
};
