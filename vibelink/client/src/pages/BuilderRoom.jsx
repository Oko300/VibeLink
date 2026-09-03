import React, { useState, useEffect } from 'react';
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

  const { messages, viewers, connected, sendMessage, setLocalStream, sessionPaused, socket } = useSocket(sessionId, 'Host', 'builder', true);

  // Handlers
  const handleStartSharing = () => {
    setShowModal(true);
  };

  const handleConfirm = () => {
    setShowModal(false);
    setShouldStart(true);
  };

  const handleStreamReady = (mediaStream) => {
    setStream(mediaStream);
    setIsLive(true);
    setLocalStream(mediaStream); // Pass the stream to useSocket
  };

  const handleStreamEnd = () => {
    setIsLive(false);
    setShouldStart(false);
    setStream(null);
    // NO setShowModal here
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

  const handlePause = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.enabled = false);
      setIsPaused(true);
      socket && socket.emit('session_paused', { sessionId });
    }
  };

  const handleResume = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.enabled = true);
      setIsPaused(false);
      socket && socket.emit('session_resumed', { sessionId });
    }
  };

  const handleEndSession = async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      await fetch(apiUrl + '/api/session/' + sessionId, { method: 'DELETE' });
    } catch (err) {
      console.error('Error ending session on server:', err);
  // Styles
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
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    },
    topBarLeft: {
      display: 'flex',
      alignItems: 'baseline',
      gap: '10px',
    },
    vibelinkText: {
      fontWeight: 'bold',
      fontSize: '1.5rem',
      color: '#06b6d4',
    },
    sessionIdText: {
      fontSize: '0.9rem',
      color: '#888',
    },
    topBarRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    button: {
      padding: '0.5rem 1rem',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '0.9rem',
      fontWeight: 'bold',
      transition: 'background-color 0.2s',
    },
    pauseButton: {
      backgroundColor: '#374151', // blue-gray-700
      color: 'white',
      '&:hover': {
        backgroundColor: '#4b5563', // blue-gray-600
      },
    },
    resumeButton: {
      backgroundColor: '#059669', // emerald-600
      color: 'white',
      '&:hover': {
        backgroundColor: '#047857', // emerald-700
      },
    },
    endSessionButton: {
      backgroundColor: '#dc2626', // red-600
      color: 'white',
      '&:hover': {
        backgroundColor: '#b91c1c', // red-700
      },
    },
    mainContent: {
      flexGrow: 1,
      paddingTop: '80px', // Clearance for fixed top bar
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
    },
    shareLinkCard: {
      backgroundColor: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: '12px',
      padding: '1.5rem',
      maxWidth: '600px',
      width: '100%',
      margin: '0 auto',
      textAlign: 'center',
      boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
    },
    shareLinkLabel: {
      fontSize: '0.9rem',
      color: '#888',
      marginBottom: '0.75rem',
    },
    shareLinkUrl: {
      backgroundColor: '#0d0d0d',
      color: '#06b6d4',
      padding: '0.75rem',
      borderRadius: '8px',
      fontFamily: 'monospace',
      wordBreak: 'break-all',
      marginBottom: '1rem',
    },
    copyButton: {
      backgroundColor: '#06b6d4',
      color: 'white',
      padding: '0.75rem 1.5rem',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '1rem',
      fontWeight: 'bold',
      transition: 'background-color 0.2s',
      '&:hover': {
        backgroundColor: '#0891b2',
      },
    },
    copyButtonCopied: {
      backgroundColor: '#22c55e', // green-500
      '&:hover': {
        backgroundColor: '#16a34a', // green-600
      },
    },
    preLiveContent: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      marginTop: '2rem',
    },
    startButton: {
      backgroundColor: '#06b6d4',
      color: 'white',
      padding: '1rem 3rem',
      fontSize: '1.1rem',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 'bold',
      transition: 'background-color 0.2s',
      '&:hover': {
        backgroundColor: '#0891b2',
      },
    },
    viewerInstructionText: {
      fontSize: '0.9rem',
      color: '#888',
      marginTop: '1rem',
    },
    liveContent: {
      display: 'flex',
      gap: '1rem',
      marginTop: '1rem',
      width: '100%',
      maxWidth: '1200px', // Adjust as needed
      alignItems: 'flex-start', // Align items to the top
    },
    streamColumn: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: '#1a1a1a', // Background for the stream area
      borderRadius: '12px',
      padding: '1rem',
      boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
    },
    chatColumn: {
      width: '320px',
      minWidth: '320px',
      backgroundColor: '#1a1a1a', // Background for chat
      borderRadius: '12px',
      padding: '1rem',
      boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 80px - 2rem)', // Adjusted height for chat column
      // To ensure chat doesn't overflow, considering topBar and padding
      maxHeight: 'calc(100vh - 80px - 40px)', // topBarHeight + top/bottom padding
    },
    pausedBadge: {
      backgroundColor: '#1f2937', // blue-gray-800
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
            isPaused ? (
              <button onClick={handleResume} style={{ ...styles.button, ...styles.resumeButton }}>
                ▶ Resume
              </button>
            ) : (
              <button onClick={handlePause} style={{ ...styles.button, ...styles.pauseButton }}>
                ⏸ Pause
              </button>
            )
          )}
          <button onClick={handleEndSession} style={{ ...styles.button, ...styles.endSessionButton }}>
            End Session
          </button>
        </div>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.shareLinkCard}>
          <p style={styles.shareLinkLabel}>🔗 Share this link — viewers join here:</p>
          <div style={styles.shareLinkUrl}>
            {window.location.origin}/s/{sessionId}
          </div>
          <button
            onClick={handleCopyLink}
            style={{ ...styles.copyButton, ...(copied ? styles.copyButtonCopied : {}) }}
          >
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>

        {!isLive && (
          <div style={styles.preLiveContent}>
            <button
              onClick={handleStartSharing}
              style={styles.startButton}
            >
              ▶ Start Screen Share
            </button>
            <p style={styles.viewerInstructionText}>Viewers can already see your link above. Start sharing when you are ready.</p>
          </div>
        )}

        {isLive && (
          <div style={styles.liveContent}>
            <div style={styles.streamColumn}>
              <div style={{
                width: '100%',
                height: 'auto',
                aspectRatio: '16/9',
                backgroundColor: 'black',
                marginBottom: '1rem',
                display: shouldStart ? 'block' : 'none' // Use CSS display
              }}>
                <ScreenShare
                  shouldStart={shouldStart}
                  onStreamReady={handleStreamReady}
                  onStreamEnd={handleStreamEnd}
                />
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

      color: '#9ca3af', // blue-gray-400
      padding: '0.5rem 1rem',
      borderRadius: '20px',
      fontSize: '0.9rem',
      fontWeight: 'bold',
      marginTop: '1rem',
    },
    liveBadge: {
      backgroundColor: '#052e16', // green-950
      color: '#4ade80', // green-400
      padding: '0.5rem 1rem',
      borderRadius: '20px',
      fontSize: '0.9rem',
      fontWeight: 'bold',
      marginTop: '1rem',
    },
    viewerCount: {
      color: '#888',
      marginTop: '0.5rem',
      fontSize: '0.9rem',
    },
  };

    } finally {
      navigate('/');
    }
  };

