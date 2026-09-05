import React, { useState } from 'react';
import XAuthButton from './XAuthButton';

export default function JoinScreen({ sessionId, onJoin }) {
  const [inputName, setInputName] = useState('');

  const handleJoin = () => {
    onJoin(inputName.trim() || 'Guest');
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
    dividerRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      width: '100%',
      maxWidth: '400px',
      margin: '1.5rem 0 0.5rem',
    },
    dividerLine: {
      flex: 1,
      height: '1px',
      background: '#333',
    },
    dividerText: {
      color: '#666',
      fontSize: '0.85em',
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

      <XAuthButton sessionId={sessionId} style={{ width: '100%', maxWidth: '400px', padding: '1rem' }} />

      <div style={styles.dividerRow}>
        <span style={styles.dividerLine} />
        <span style={styles.dividerText}>or</span>
        <span style={styles.dividerLine} />
      </div>

      <input
        type="text"
        placeholder="Your name (optional — leave blank for Guest)"
        value={inputName}
        onChange={(e) => setInputName(e.target.value)}
        style={styles.nameInput}
      />
      <button onClick={handleJoin} style={styles.joinButton}>
        Continue as Guest →
      </button>
    </div>
  );
}
