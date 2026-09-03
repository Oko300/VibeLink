import React, { useState, useEffect } from 'react';
import XAuthButton from './XAuthButton';
import { useAuth } from '../hooks/useAuth';

export default function JoinScreen({ sessionId, onJoin }) {
  const { user, login } = useAuth();
  const [inputName, setInputName] = useState(user?.username || '');

  useEffect(() => {
    if (user && !inputName) {
      setInputName(user.username);
    }
  }, [user]);

  const handleJoin = () => {
    onJoin(user ? user.username : inputName.trim() || 'Guest');
  };

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#0d0d0d',
      color: 'white',
      fontFamily: 'sans-serif',
      padding: '2rem',
      textAlign: 'center',
    },
    heading: {
      fontSize: '2.5em',
      marginBottom: '0.5rem',
      color: '#e0e0e0',
    },
    subheading: {
      fontSize: '1.2em',
      color: '#aaa',
      marginBottom: '1.5rem',
    },
    permissionLine: {
      fontSize: '1em',
      color: '#e0e0e0',
      marginBottom: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    shieldBadge: {
      backgroundColor: '#1a1a1a',
      border: '1px solid #333',
      padding: '0.5rem 1rem',
      borderRadius: '20px',
      color: '#aaa',
      fontSize: '13px',
      marginTop: '1rem',
      marginBottom: '2rem',
    },
    nameInput: {
      width: '100%',
      maxWidth: '400px',
      padding: '0.75rem',
      borderRadius: '8px',
      background: '#1a1a1a',
      border: '1px solid #333',
      color: 'white',
      fontSize: '16px',
      marginTop: '2rem',
      boxSizing: 'border-box',
    },
    joinButton: {
      width: '100%',
      maxWidth: '400px',
      padding: '1rem',
      borderRadius: '8px',
      background: '#06b6d4',
      color: 'white',
      fontSize: '16px',
      fontWeight: 'bold',
      border: 'none',
      cursor: 'pointer',
      marginTop: '1rem',
      transition: 'background-color 0.2s',
    },
    smallText: {
      fontSize: '0.9em',
      color: '#666',
      marginTop: '1rem',
    },
    authOption: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem',
      marginTop: '2rem',
    },
    joinAsButton: {
      width: '100%',
      maxWidth: '400px',
      padding: '1rem',
      borderRadius: '8px',
      background: '#06b6d4',
      color: 'white',
      fontSize: '16px',
      fontWeight: 'bold',
      border: 'none',
      cursor: 'pointer',
      marginTop: '1rem',
      transition: 'background-color 0.2s',
    },
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>You're invited to a live build session</h1>
      <p style={styles.subheading}>Watch the builder's screen and chat in real time</p>
      <p style={styles.permissionLine}>✅ You can: See the live screen and chat</p>
      <p style={styles.permissionLine}>❌ You cannot: Record, download, or interact</p>
      <div style={styles.shieldBadge}>
        🛡 Private session · Invite only · Session ends when host closes it
      </div>

      <p style={styles.smallText}>No account required · Built for Commons builders</p>

      {!user ? (
        <div style={styles.authOption}>
          <p>Or sign in with X to use your X username:</p>
          <XAuthButton />
          <input
            type="text"
            placeholder="Your name (optional — leave blank for Guest)"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            style={styles.nameInput}
          />
          <button onClick={handleJoin} style={styles.joinButton}>
            Join Session →
          </button>
        </div>
      ) : (
        <button onClick={handleJoin} style={styles.joinAsButton}>
          Join as @{user.username} →
        </button>
      )}
    </div>
  );
}
