import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import InstructionModal from '../components/InstructionModal';
import ScreenShare from '../components/ScreenShare';
import SessionChat from '../components/SessionChat';
import { useSocket } from '../hooks/useSocket';


export default function BuilderRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [shouldStart, setShouldStart] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stream, setStream] = useState(null);
  const [copied, setCopied] = useState(false);

  const { messages, viewers, connected, sendMessage, kickViewer, socket } = useSocket(sessionId, 'Host', 'builder');


  const handleConfirm = () => {
    setShowModal(false);
    setShouldStart(true);
  };

  const handleStreamReady = (mediaStream) => {
    setStream(mediaStream);
    setIsLive(true);
    setIsPaused(false);
    if (socket) {
      socket.emit('session_resumed', { sessionId });
    }

  };

  const handleStreamEnd = () => {
    setIsLive(false);
    setIsPaused(false);
    setShouldStart(false);
    setStream(null);
    // Removed setShowModal(true);
    if (socket) {
      socket.emit('session_paused', { sessionId });
    }
  };

  const handleCopyLink = () => {
    const shareableLink = window.location.origin + '/s/' + sessionId;
    navigator.clipboard.writeText(shareableLink).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  const handleEndSession = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    const apiUrl = import.meta.env.VITE_API_URL || '';
    fetch(apiUrl + '/api/session/' + sessionId, { method: 'DELETE' })
      .then(() => {
        navigate('/');
      })
      .catch(err => {
        console.error('Error ending session:', err);
        navigate('/'); // Still navigate home even if API call fails for a cleaner UX
      });
  };
  const handlePauseToggle = () => {
    if (stream) {
      const newState = !isPaused;
      stream.getVideoTracks().forEach(track => track.enabled = !isPaused);
      setIsPaused(newState);
      if (socket) {
        socket.emit(newState ? 'session_paused' : 'session_resumed', { sessionId });
      }
    }
  };




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
    topBarRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    vibelinkText: {
      fontWeight: 'bold',
      fontSize: '1.5rem',
      color: '#00bcd4',
    },
    sessionIdText: {
      color: '#aaa',
      fontSize: '0.8em',
    },
    endSessionButton: {
      backgroundColor: '#dc2626',
      color: 'white',
      border: 'none',
      padding: '0.5rem 1rem',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '0.9em',
      fontWeight: 'bold',
    },
    mainContent: {
      paddingTop: '80px', // To clear the fixed top bar
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      width: '100%', // Take full width when not live
    },
    liveContent: {
      paddingTop: '80px', // To clear the fixed top bar
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'row', // Two columns when live
      width: '100%',
      overflow: 'hidden', // Prevent overflow issues
    },
    streamColumn: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      overflowY: 'auto',
    },
    chatColumn: {
      width: '320px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    },
    statusMessage: {
      color: '#aaa',
      fontSize: '1.1em',
      marginTop: '2rem',
    },
    liveBadge: {
      backgroundColor: '#052e16',
      color: '#4ade80',
      padding: '0.4rem 1rem',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: 'bold',
      marginBottom: '1.5rem',
    },
    viewerCount: {
      color: '#aaa',
      marginTop: '1rem',
      fontSize: '0.9em',
    },
    shareLinkSection: {
      marginTop: '1.5rem',
      width: '100%',
      maxWidth: '500px',
    },
    shareLinkLabel: {
      color: '#aaa',
      fontSize: '0.9em',
      marginBottom: '0.5rem',
      textAlign: 'left',
    },
    shareLinkUrl: {
      backgroundColor: '#1a1a1a',
      border: '1px solid #333',
      padding: '0.75rem 1rem',
      borderRadius: '8px',
      fontFamily: 'monospace',
      color: '#06b6d4',
      wordBreak: 'break-all',
      marginBottom: '1rem',
      textAlign: 'left',
    },
    copyButton: {
      backgroundColor: '#06b6d4',
      color: 'white',
      border: 'none',
      padding: '0.5rem 1.5rem',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '0.9em',
      fontWeight: 'bold',
      width: '100%',
    },
    copyButtonCopied: {
      backgroundColor: '#4ade80',
      color: '#0d0d0d',
    },
    shareLinkCard: {
      backgroundColor: '#1a1a1a',
      borderRadius: '12px',
      padding: '1.5rem',
      margin: '2rem auto',
      maxWidth: '600px',
      width: '100%',
      textAlign: 'center',
      border: '1px solid #222',
      boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
    },
    pauseButton: {
      backgroundColor: '#6b7280',
      color: 'white',
      border: 'none',
      padding: '0.5rem 1rem',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '0.9em',
      fontWeight: 'bold',
      marginLeft: '10px',
    },
    resumeButton: {
      backgroundColor: '#22c55e',
      color: 'white',
      border: 'none',
      padding: '0.5rem 1rem',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '0.9em',
      fontWeight: 'bold',
      marginLeft: '10px',
    },
    pausedBadge: {
      backgroundColor: '#f59e0b',
      color: 'white',
      padding: '0.5rem 1rem',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: 'bold',
      marginTop: '1rem',
    },
    liveBadge: {
      backgroundColor: '#ef4444',
      color: 'white',
      padding: '0.5rem 1rem',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: 'bold',
      marginTop: '1rem',
    },
    viewerCount: {
      color: '#cbd5e0',
      marginTop: '0.5rem',
      fontSize: '0.9rem',
    },
  };

  return (
    <div style={styles.container}>
      {showModal && <InstructionModal onConfirm={handleConfirm} />}

      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <span style={styles.vibelinkText}>VibeLink</span>
          <span style={styles.sessionIdText}>Session ID: {sessionId}</span>
        </div>
        <div style={styles.topBarRight}>
          {isLive && (
            <button
              onClick={handlePauseToggle}
              style={isPaused ? styles.resumeButton : styles.pauseButton}
            >
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
          )}
          <button onClick={handleEndSession} style={styles.endSessionButton}>
            End Session
          </button>
        </div>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.shareLinkCard}>
          <p style={styles.shareLinkLabel}>Your session link — share this with your community:</p>
          <div style={styles.shareLinkUrl}>
            {window.location.origin}/s/{sessionId}
          </div>
          <button
            onClick={handleCopyLink}
            style={{...styles.copyButton, ...(copied ? styles.copyButtonCopied : {})}}
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        {!isLive && (
          <div style={styles.preLiveContent}>
            <button
              onClick={() => setShowModal(true)}
              style={styles.startButton}
            >
              Start Screen Share
            </button>
            <p style={styles.viewerInstructionText}>Viewers join via the link above. Start sharing when ready.</p>
          </div>
        )}

        {isLive && (
          <div style={styles.liveContent}>
            <div style={styles.streamColumn}>
              <div style={{width: '100%', height: 'auto', aspectRatio: '16/9', backgroundColor: 'black', marginBottom: '1rem'}}>
                {shouldStart && (
                  <ScreenShare
                    shouldStart={shouldStart}
                    onStreamReady={handleStreamReady}
                    onStreamEnd={handleStreamEnd}
                  />
                )}
              </div>
              {isPaused ? (
                <div style={styles.pausedBadge}>⏸ Session Paused</div>
              ) : (
                <div style={styles.liveBadge}>🔴 You're live</div>
              )}
              <p style={styles.viewerCount}>{viewers.length} people watching</p>
            </div>
            <div style={styles.chatColumn}>
              <SessionChat messages={messages} onSendMessage={sendMessage} currentUserName="Host" isConnected={connected} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

