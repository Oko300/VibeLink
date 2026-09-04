import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSocket } from '../hooks/useSocket'
import JoinScreen from '../components/JoinScreen'
import SessionChat from '../components/SessionChat'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function ViewerRoom() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const [sessionActive, setSessionActive] = useState(null)
  const [hasJoined, setHasJoined] = useState(false)
  const [displayName, setDisplayName] = useState('Guest')
  const [needsTap, setNeedsTap] = useState(false)
  const [streamReceived, setStreamReceived] = useState(false)
  const [debugLog, setDebugLog] = useState([]);
  const addDebug = (msg) => setDebugLog(prev => [...prev.slice(-8), `${new Date().toLocaleTimeString()}: ${msg}`]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const { messages, viewers, connected, sendMessage, remoteStream, sessionPaused } = useSocket(
    sessionId,
    displayName,
    'viewer',
    hasJoined,
    addDebug
  )

  useEffect(() => {
    fetch(API_URL + '/api/session/' + sessionId + '/status')
      .then(r => r.json())
      .then(data => setSessionActive(data.active === true))
      .catch(() => setSessionActive(false))
  }, [sessionId])

  useEffect(() => {
    if (remoteStream && videoRef.current) {
      console.log('Setting srcObject, tracks:', remoteStream.getTracks());
      videoRef.current.srcObject = remoteStream;
      addDebug('srcObject assigned');
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;
      videoRef.current.autoplay = true;
      setStreamReceived(true);
      videoRef.current.play().then(() => {
        console.log('Video playing successfully');
        setNeedsTap(false);
      }).catch((err) => {
        console.log('Autoplay blocked:', err);
        setNeedsTap(true);
      });
    }
  }, [remoteStream]);

  const handleJoin = (name) => {
    setDisplayName(name || 'Guest')
    setHasJoined(true)
  }

  if (sessionActive === null) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1a202c', color: 'white' }}>
        <p>Loading session...</p>
      </div>
    )
  }

  if (!sessionActive) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1a202c', color: 'white' }}>
        <p>Session has ended</p>
        <button onClick={() => navigate('/')} style={{ marginTop: '1rem', background: '#06b6d4', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '8px', cursor: 'pointer' }}>Go Home</button>
      </div>
    )
  }

  if (!hasJoined) {
    return <JoinScreen onJoin={handleJoin} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', background: '#1a202c', color: 'white' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', width: isMobile ? '100%' : 'auto', minHeight: isMobile ? '240px' : 'auto', height: isMobile ? '50vh' : 'auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>VibeLink</h1>
        <p style={{ color: '#ef4444', marginBottom: '1rem' }}>🔴 Live</p>
        <div style={{ width: '100%', maxWidth: isMobile ? '100%' : '800px', aspectRatio: '16/9', background: 'black', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
          ></video>
          {!streamReceived && !sessionPaused && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              Waiting for stream...
            </div>
          )}
          {sessionPaused && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              ⏸ Stream paused by host
            </div>
          )}
          {needsTap && streamReceived && !sessionPaused && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }} onClick={() => videoRef.current.play().then(() => setNeedsTap(false)).catch(() => {})}>
              <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>▶ Tap to watch live screen</p>
              <p style={{ fontSize: '1rem', color: '#ccc' }}>(Autoplay blocked by browser)</p>
            </div>
          )}
        </div>
      </div>
      <SessionChat
        sessionId={sessionId}
        messages={messages}
        viewers={viewers}
        onSendMessage={sendMessage}
        currentDisplayName={'Guest'}
        currentUserRole={'viewer'}
      />
      <div style={{position:'fixed', bottom:0, left:0, right:0, background:'rgba(0,0,0,0.85)', color:'#0f0', fontSize:'10px', padding:'4px', zIndex:9999, maxHeight:'120px', overflowY:'auto'}}>
        {debugLog.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  )
}