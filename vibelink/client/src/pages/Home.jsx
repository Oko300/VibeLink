import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HelpPanel from '../components/HelpPanel';

const FEATURES = [
  { icon: '🖥', title: 'Live Screen Share', text: 'They see exactly what you see. VS Code, Claude, everything.' },
  { icon: '🎙', title: 'Voice + Chat', text: 'Talk and type while the AI works' },
  { icon: '🛡', title: 'Private & Ephemeral', text: 'The link dies when you end the session. Nothing is stored.' },
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
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', position: 'relative', overflow: 'hidden' }}>
      {/* Subtle background glow */}
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '300px', background: 'radial-gradient(ellipse, rgba(45,212,191,0.06) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
      {/* Badge */}
      <div style={{ border: '1px solid rgba(45,212,191,0.3)', borderRadius: '20px', padding: '4px 14px', fontSize: '12px', color: '#2dd4bf', marginBottom: '32px', letterSpacing: '0.05em' }}>
        Built for Commons / VibeFi Hackathon
      </div>

      {/* Main heading */}
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(40px,8vw,80px)', fontWeight: 400, color: '#f5f0e8', textAlign: 'center', lineHeight: 1.1, marginBottom: '16px', maxWidth: '700px' }}>
        Build live. Let builders in.
      </h1>

      {/* Subtext */}
      <p style={{ fontSize: '18px', color: '#888888', textAlign: 'center', maxWidth: '480px', lineHeight: 1.6, marginBottom: '48px' }}>
        Share your screen while the AI builds. Drop the link in Commons chat. Other builders join, watch, and help live.
      </p>

      <button
        onClick={startSession}
        disabled={loading}
        style={{
          background: loading ? '#161616' : '#2dd4bf',
          color: loading ? '#888888' : '#0a0a0a',
          border: 'none',
          borderRadius: '12px',
          padding: '16px 40px',
          fontSize: '16px',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '64px'
        }}
      >
        {loading ? 'Starting...' : '→ Start Live Session'}
      </button>
      {error && <p style={{ color: '#ef4444', marginTop: '16px' }}>{error}</p>}

      {/* Feature Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '16px', maxWidth: '660px', width: '100%', marginBottom: '64px' }}>
        {FEATURES.map((f) => (
          <div key={f.title} style={{ background: '#161616', border: '1px solid #222222', borderRadius: '16px', padding: '24px 20px' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>{f.icon}</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#f5f0e8', marginBottom: '6px' }}>{f.title}</div>
            <div style={{ fontSize: '13px', color: '#888888', lineHeight: 1.5 }}>{f.text}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer style={{ fontSize: '13px', color: '#444444', textAlign: 'center' }}>
        Built for the Commons community. Powered by builders helping builders.
      <HelpPanel />
      </footer>
    </div>
  );
}


