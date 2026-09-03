import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import SessionChat from '../components/SessionChat';
import JoinScreen from '../components/JoinScreen';
export default function ViewerRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [hasJoined, setHasJoined] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [sessionActive, setSessionActive] = useState(null); // null = loading, true = active, false = ended
  const videoRef = useRef(null);

  const { messages, viewers, connected, sendMessage, remoteStream, sessionPaused } = useSocket(sessionId, displayName, 'viewer', hasJoined);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    fetch(apiUrl + `/api/session/${sessionId}/status`)
      .then(res => res.json())
      .then(data => {
        if (data.active) {
          setSessionActive(true);
        } else {
          setSessionActive(false);
        }
      })
      .catch(err => {
        console.error('Error checking session status:', err);
        setSessionActive(false);
      });
  }, [sessionId]);

  useEffect(() => {
    if (remoteStream && videoRef.current) {
      videoRef.current.srcObject = remoteStream;
      videoRef.current.play().catch(e => console.log('autoplay blocked:', e));
    }
  }, [remoteStream]);

  const styles = {
    container: {
      height: '100vh',
      backgroundColor: '#0d0d0d',
      color: 'white',
      fontFamily: 'sans-serif',
      display: 'flex',
      flexDirection: 'column',
    },
    topBar: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: '#111',
      padding: '1rem 1.5rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 999,
    },
    topBarLeft: {
      display: 'flex',
      alignItems: 'baseline',
      gap: '10px',
    },
    vibelinkText: {
      fontWeight: 'bold',
      fontSize: '1.2em',
    },
    topBarRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    loadingScreen: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#0d0d0d',
      color: 'white',
      fontSize: '1.5em',
    },
    goHomeButton: {
      backgroundColor: '#06b6d4',
      color: 'white',
      border: 'none',
      padding: '0.75rem 1.5rem',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '1em',
      fontWeight: 'bold',
      marginTop: '1.5rem',
    },
    streamColumn: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      overflowY: 'auto',
      textAlign: 'center',
      position: 'relative',
    },
    videoWrapper: {
      position: 'relative',
      width: '100%',
      maxWidth: '800px',
      aspectRatio: '16 / 9',
      backgroundColor: 'black',
      borderRadius: '8px',
      overflow: 'hidden',
    },
    chatColumn: {
      width: '320px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    },
    statusMessage: {
      color: '#aaa',
      fontSize: '1.5em',
      marginTop: '2rem',
    },
    placeholderText: {
    liveBadge: {
      backgroundColor: '#ef4444',
      color: 'white',
      padding: '0.4rem 1rem',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: 'bold',
    },
    pausedOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '8px',
      zIndex: 10,
    },
    pausedText: {
      color: 'white',
      fontSize: '1.8em',
      fontWeight: 'bold',
    },
      color: '#666',
      fontSize: '1.2em',
      marginTop: '1rem',
    }
  };

  return (
    <div style={styles.container}>
      {sessionActive === null && (
        <div style={styles.loadingScreen}>
          <p>Loading session status...</p>
        </div>
      )}

      {sessionActive === false && (
        <div style={styles.loadingScreen}>
          <p style={styles.statusMessage}>Session has ended or does not exist.</p>
          <button onClick={() => navigate('/')} style={styles.goHomeButton}>
            Go Home
          </button>
        </div>
      )}

      {sessionActive === true && !hasJoined && (
        <JoinScreen sessionId={sessionId} onJoin={(name) => { setDisplayName(name); setHasJoined(true); }} />
      )}

      {sessionActive === true && hasJoined && (
        <>
          <div style={styles.topBar}>
            <div style={styles.topBarLeft}>
              <span style={styles.vibelinkText}>VibeLink</span>
            </div>
            <div style={styles.topBarRight}>
              <div style={styles.liveBadge}>🔴 Live</div>
            </div>
          </div>

          <div style={styles.mainContent}>
            <div style={styles.streamColumn}>
              <div style={styles.videoWrapper}>
                {remoteStream ? (
                  <video ref={videoRef} autoPlay playsInline muted controls style={{width: '100%', borderRadius: '8px'}} />
                ) : (
                  <p style={styles.placeholderText}>Waiting for builder to go live...</p>
                )}
                {sessionPaused && (
                  <div style={styles.pausedOverlay}>
                    <p style={styles.pausedText}>⏸ Stream paused by host</p>
                  </div>
                )}
              </div>
            </div>
            <div style={styles.chatColumn}>
              <SessionChat messages={messages} onSendMessage={sendMessage} currentUserName={displayName} isConnected={connected} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
