import React from 'react';

export default function InstructionModal({ onConfirm }) {
  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    card: {
      backgroundColor: '#1a1a1a',
      borderRadius: '12px',
      padding: '2rem',
      maxWidth: '480px',
      color: 'white',
      textAlign: 'center',
      boxShadow: '0 4px 60px rgba(0,0,0,0.3)',
    },
    emoji: {
      fontSize: '3em',
      marginBottom: '1rem',
    },
    heading: {
      fontSize: '2em',
      marginBottom: '1rem',
      fontWeight: 'bold',
    },
    bodyText: {
      fontSize: '1.1em',
      marginBottom: '2rem',
      lineHeight: '1.6',
    },
    button: {
      padding: '15px 30px',
      fontSize: '1.2em',
      backgroundColor: '#06b6d4',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: 'bold',
      width: '100%',
      transition: 'background-color 0.3s ease',
    },
    buttonHover: {
      backgroundColor: '#0e7490', // A darker teal for hover effect
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.emoji}>🖥</div>
        <h2 style={styles.heading}>Share Your Entire Screen</h2>
        <p style={styles.bodyText}>
          To let viewers see your full build environment (VS Code, Claude Desktop, terminal, browser), select <strong>Entire Screen</strong> in the next popup.
          <br /><br />
          Selecting just a Tab or Window will limit what viewers can see.
          <br /><br />
          On Windows/Mac: You may see a system permission request — click Allow to continue.
        </p>
        <button
          onClick={onConfirm}
          style={styles.button}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = styles.buttonHover.backgroundColor}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = styles.button.backgroundColor}
        >
          Got it — Start Sharing
        </button>
      </div>
    </div>
  );
}
