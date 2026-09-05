import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSocket } from '../hooks/useSocket'
import { useAuth } from '../hooks/useAuth'
import JoinScreen from '../components/JoinScreen'
import SessionChat from '../components/SessionChat'
import MicControl from '../components/MicControl'
import RemoteAudio from '../components/RemoteAudio'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function ViewerRoom() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const { user, ready: authReady } = useAuth()
  const [sessionActive, setSessionActive] = useState(null)
  const [hasJoined, setHasJoined] = useState(false)
  const [displayName, setDisplayName] = useState('Guest')
  const [needsTap, setNeedsTap] = useState(false)
  const [streamReceived, setStreamReceived] = useState(false)
  const [micError, setMicError] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // If already signed in with X, skip the join screen entirely.
  useEffect(() => {
    if (authReady && user && !hasJoined) {
      setDisplayName(user.displayName || 'Guest')
      setHasJoined(true)
    }
  }, [authReady, user, hasJoined])

  const identity = user ? { username: user.username, profilePicture: user.profilePicture } : null

  const {
    messages, viewers, connected, sendMessage, remoteStream, sessionPaused,
    getUserAudio, muteAudio, micActive, micMuted, mutedByHost, remoteAudioStreams
  } = useSocket(
    sessionId,
    displayName,
    'viewer',
    hasJoined,
    identity
  )

  const handleJoinMic = async () => {
    setMicError(false)
    const result = await getUserAudio()
    if (!result.ok) setMicError(true)
  }

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
    // While auth is still resolving — or if signed in and about to auto-join —
    // show a brief loading state instead of flashing the guest join screen.
    if (!authReady || user) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1a202c', color: 'white' }}>
          <p>Loading session...</p>
        </div>
      )
    }
    return <JoinScreen sessionId={sessionId} onJoin={handleJoin} />
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

        {/* Mic control bar — bottom of the video column, above the chat */}
        <div style={{ marginTop: '1rem' }}>
          <MicControl
            micActive={micActive}
            micMuted={micMuted}
            error={micError}
            onJoin={handleJoinMic}
            onToggle={() => muteAudio(!micMuted)}
          />
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

      {mutedByHost && (
        <div style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', background: '#dc2626', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 'bold', zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          🔇 You were muted by the host
        </div>
      )}

      {/* Hidden sinks that play the builder's (and any peer's) microphone */}
      {remoteAudioStreams.map((a) => (
        <RemoteAudio key={a.id} stream={a.stream} />
      ))}
    </div>
  )
}