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

  const { messages, viewers, connected, sendMessage, remoteStream, sessionPaused } = useSocket(
    sessionId,
    displayName,
    'viewer',
    hasJoined
  )

  useEffect(() => {
    fetch(API_URL + '/api/session/' + sessionId + '/status')
      .then(r => r.json())
      .then(data => setSessionActive(data.active === true))
      .catch(() => setSessionActive(false))
  }, [sessionId])

  useEffect(() => {
    if (remoteStream && videoRef.current) {
      videoRef.current.srcObject = remoteStream
      videoRef.current.load()
      videoRef.current.play().then(() => {
        setNeedsTap(false)
      }).catch(error => {
        console.error("Autoplay prevented:", error)
        setNeedsTap(true)
      })
    }
  }, [remoteStream])

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
    <div style={{ display: 'flex', height: '100vh', background: '#1a202c', color: 'white' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>VibeLink</h1>
        <p style={{ color: '#ef4444', marginBottom: '1rem' }}>🔴 Live</p>
        <div style={{ width: '100%', maxWidth: '800px', aspectRatio: '16/9', background: 'black', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
          {sessionPaused && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              ⏸ Stream paused by host
            </div>
          )}
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }}></video>
          {needsTap && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => videoRef.current.play().then(() => setNeedsTap(false)).catch(() => {})}>
              ▶ Tap to Play
            </div>
          )}
        </div>
      </div>
      <SessionChat
        sessionId={sessionId}
        messages={messages}
        viewers={viewers}
        sendMessage={sendMessage}
        currentDisplayName={displayName}
        currentUserRole={'viewer'}
      />
    </div>
  )
}