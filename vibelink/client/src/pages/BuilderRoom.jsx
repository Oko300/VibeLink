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

  useEffect(() => {
    if (socket) {
      socket.on('session-ended', () => {
        alert('Session has ended by the host.');
        navigate('/');
      });

      socket.on('host-disconnected', () => {
        alert('Host disconnected unexpectedly. Ending session.');
        navigate('/');
      });

      return () => {
        socket.off('session-ended');
        socket.off('host-disconnected');
      };
    }
  }, [socket, navigate]);

  useEffect(() => {
    if (sessionPaused) {
      setIsPaused(true);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setIsLive(false);
    } else {
      setIsPaused(false);
    }
  }, [sessionPaused, stream]);

  const startStreaming = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      setStream(mediaStream);
      setLocalStream(mediaStream);
      setIsLive(true);
      setShouldStart(true);

      mediaStream.getVideoTracks()[0].onended = () => {
        stopStreaming();
      };
    } catch (error) {
      console.error('Error starting stream:', error);
      setIsLive(false);
    }
  };

  const stopStreaming = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setLocalStream(null);
    setIsLive(false);
    setShouldStart(false);
    socket.emit('end-session', sessionId);
    navigate('/');
  };

  const pauseStreaming = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setLocalStream(null);
    setIsPaused(true);
    setIsLive(false);
    socket.emit('pause-session', sessionId);
  };

  const resumeStreaming = async () => {
    await startStreaming();
    setIsPaused(false);
    socket.emit('resume-session', sessionId);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`${window.location.origin}/viewer/${sessionId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={styles.container}>
      <InstructionModal
        showModal={showModal}
        setShowModal={setShowModal}
        shouldStart={shouldStart}
        startStreaming={startStreaming}
      />

      <div style={styles.header}>
        <h1 style={styles.title}>Builder Room: {sessionId}</h1>
        <button onClick={() => setShowModal(true)} style={styles.infoButton}>
          How to use?
        </button>
      </div>

      <div style={styles.content}>
        <div style={styles.screenShareContainer}>
          {isLive && stream ? (
            <ScreenShare stream={stream} />
          ) : isPaused ? (
            <div style={styles.pausedContainer}>
              <p>Session Paused</p>
              <button onClick={resumeStreaming} style={styles.actionButton}>
                Resume Streaming
              </button>
            </div>
          ) : (
            <div style={styles.overlay}>
              <p>Click 'Start Streaming' to begin your session</p>
              <button onClick={startStreaming} style={styles.actionButton}>
                Start Streaming
              </button>
            </div>
          )}
        </div>

        <div style={styles.sidebar}>
          <div style={styles.viewersSection}>
            <h2>Viewers ({viewers.length})</h2>
            <div style={styles.viewerList}>
              {viewers.map((viewer, index) => (
                <p key={index}>{viewer}</p>
              ))}
            </div>
          </div>

          <div style={styles.chatSection}>
            <SessionChat messages={messages} sendMessage={sendMessage} />
          </div>

          <div style={styles.controlsSection}>
            <p style={styles.statusText}>
              Status: {connected ? 'Connected' : 'Disconnected'}
            </p>
            <p style={styles.statusText}>Stream: {isLive ? 'Live' : 'Offline'}</p>
            <div style={styles.controlButtons}>
              <button onClick={copyToClipboard} style={styles.actionButton}>
                {copied ? 'Copied!' : 'Copy Viewer Link'}
              </button>
              {isLive ? (
                <button onClick={pauseStreaming} style={styles.actionButton}>
                  Pause Streaming
                </button>
              ) : null}
              <button onClick={stopStreaming} style={styles.actionButton}>
                End Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#282c34',
    color: 'white',
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 20px',
    backgroundColor: '#20232a',
    borderBottom: '1px solid #3a3f47',
  },
  title: {
    margin: 0,
    fontSize: '24px',
  },
  infoButton: {
    backgroundColor: '#61dafb',
    color: '#282c34',
    border: 'none',
    padding: '8px 15px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  content: {
    display: 'flex',
    flex: 1,
  },
  screenShareContainer: {
    flex: 3,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  pausedContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: '#61dafb',
    color: '#282c34',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '18px',
    marginTop: '10px',
    margin: '5px',
  },
  sidebar: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#20232a',
    borderLeft: '1px solid #3a3f47',
  },
  viewersSection: {
    padding: '10px',
    borderBottom: '1px solid #3a3f47',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  viewerList: {
    marginTop: '10px',
  },
  chatSection: {
    flex: 1,
    padding: '10px',
    borderBottom: '1px solid #3a3f47',
    display: 'flex',
    flexDirection: 'column',
  },
  controlsSection: {
    padding: '10px',
  },
  statusText: {
    margin: '5px 0',
  },
  controlButtons: {
    display: 'flex',
    flexDirection: 'column',
    marginTop: '10px',
  },
};
