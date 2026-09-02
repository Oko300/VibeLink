import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import SessionChat from '../components/SessionChat';

export default function ViewerRoom() {
  const { sessionId } = useParams();
  const [sessionActive, setSessionActive] = useState(true);
  const [displayName, setDisplayName] = useState('Guest'); // Will be set by user in a later step

  const { messages, viewers, connected, sendMessage } = useSocket(sessionId, displayName, 'viewer');

  useEffect(() => {
    // Check session status
    const apiUrl = import.meta.env.VITE_API_URL || '';
    fetch(apiUrl + `/api/session/${sessionId}/status`)
      .then(res => res.json())
      .then(data => {
        if (!data.active) {
          setSessionActive(false);
        }
      })
      .catch(err => {
        console.error('Error checking session status:', err);
        setSessionActive(false);
      });
  }, [sessionId]);

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
    sessionIdText: {
      color: '#aaa',
      fontSize: '0.8em',
    },
    mainContent: {
      paddingTop: '80px', // To clear the fixed top bar
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'row',
      width: '100%',
      overflow: 'hidden',
    },
    streamPlaceholderColumn: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      overflowY: 'auto',
      textAlign: 'center',
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
      color: '#666',
      fontSize: '1.2em',
      marginTop: '1rem',
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <span style={styles.vibelinkText}>VibeLink (Viewer)</span>
          <span style={styles.sessionIdText}>Session ID: {sessionId}</span>
        </div>
      </div>

      {!sessionActive ? (
        <div style={styles.streamPlaceholderColumn}>
          <p style={styles.statusMessage}>Session has ended or does not exist.</p>
        </div>
      ) : (
        <div style={styles.mainContent}>
          <div style={styles.streamPlaceholderColumn}>
            <p style={styles.placeholderText}>Live stream will appear here</p>
          </div>
          <div style={styles.chatColumn}>
            <SessionChat messages={messages} onSendMessage={sendMessage} currentUserName={displayName} isConnected={connected} />
          </div>
        </div>
      )}
    </div>
  );
}
