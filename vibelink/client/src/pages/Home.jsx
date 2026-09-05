import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const FEATURES = [
  { icon: '🖥', title: 'Live Screen Share', text: 'They see exactly what you see' },
  { icon: '🎙', title: 'Voice + Chat', text: 'Talk and type in real time' },
  { icon: '🛡', title: 'Private & Ephemeral', text: 'Link dies when you end the session' },
];

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const startSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(apiUrl + '/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'Anonymous' }),
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
      <span style={styles.badge}>Built for Commons · VibeFi Hackathon</span>

      <h1 style={styles.heading}>VibeLink</h1>
      <p style={styles.tagline}>Drop a link. Let other builders watch your AI build live.</p>
      <p style={styles.subtext}>
        Start a live screen share of your coding environment — Claude Code, Cursor,
        VS Code, anything. Share the link in Commons chat. Other builders join
        instantly and give real advice while the AI works.
      </p>

      <button
        onClick={startSession}
        disabled={loading}
        style={{ ...styles.cta, ...(loading ? styles.ctaDisabled : {}) }}
        onMouseOver={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#4f46e5'; }}
        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = loading ? '#3730a3' : '#6366f1'; }}
      >
        {loading ? 'Starting session…' : 'Start a Live Session'}
      </button>
      {error && <p style={styles.errorText}>{error}</p>}

      <div style={styles.features}>
        {FEATURES.map((f) => (
          <div key={f.title} style={styles.pill}>
            <div style={styles.pillIcon}>{f.icon}</div>
            <div style={styles.pillTitle}>{f.title}</div>
            <div style={styles.pillText}>{f.text}</div>
          </div>
        ))}
      </div>

      <footer style={styles.footer}>
        Built for the Commons community · Powered by builders helping builders
      </footer>
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
    color: '#ffffff',
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center',
    padding: '48px 20px',
    boxSizing: 'border-box',
  },
  badge: {
    fontSize: '0.8rem',
    letterSpacing: '0.05em',
    color: '#a5b4fc',
    background: 'rgba(99, 102, 241, 0.12)',
    border: '1px solid rgba(99, 102, 241, 0.35)',
    borderRadius: '999px',
    padding: '6px 14px',
    marginBottom: '28px',
  },
  heading: {
    fontSize: 'clamp(3rem, 9vw, 5rem)',
    fontWeight: 'bold',
    margin: '0 0 12px',
    lineHeight: 1.05,
  },
  tagline: {
    fontSize: 'clamp(1.15rem, 3.5vw, 1.6rem)',
    fontWeight: 600,
    margin: '0 0 18px',
    maxWidth: '640px',
  },
  subtext: {
    fontSize: '1rem',
    lineHeight: 1.6,
    color: '#9ca3af',
    margin: '0 0 36px',
    maxWidth: '620px',
  },
  cta: {
    padding: '16px 40px',
    fontSize: '1.15rem',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
    transition: 'background-color 0.2s ease',
  },
  ctaDisabled: {
    backgroundColor: '#3730a3',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  errorText: {
    color: '#f87171',
    marginTop: '16px',
  },
  features: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '16px',
    margin: '56px 0 0',
    maxWidth: '900px',
    width: '100%',
  },
  pill: {
    flex: '1 1 240px',
    maxWidth: '280px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '14px',
    padding: '22px 20px',
  },
  pillIcon: {
    fontSize: '1.8rem',
    marginBottom: '10px',
  },
  pillTitle: {
    fontSize: '1.05rem',
    fontWeight: 'bold',
    marginBottom: '6px',
    color: '#ffffff',
  },
  pillText: {
    fontSize: '0.92rem',
    color: '#9ca3af',
    lineHeight: 1.5,
  },
  footer: {
    marginTop: '56px',
    fontSize: '0.85rem',
    color: '#6b7280',
  },
};
