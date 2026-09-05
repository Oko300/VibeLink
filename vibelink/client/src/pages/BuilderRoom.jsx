import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import InstructionModal from '../components/InstructionModal'
import ScreenShare from '../components/ScreenShare'
import SessionChat from '../components/SessionChat'
import ViewerList from '../components/ViewerList'
import MicControl from '../components/MicControl'
import RemoteAudio from '../components/RemoteAudio'
import AmbientPlayer from '../components/AmbientPlayer'
import XAuthButton from '../components/XAuthButton'
import { useSocket } from '../hooks/useSocket'
import { useAuth } from '../hooks/useAuth'

export default function BuilderRoom() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { user, ready: authReady } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [shouldStart, setShouldStart] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const [stream, setStream] = useState(null)
  const [copied, setCopied] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [micError, setMicError] = useState(false)

  // Host uses their X display name once signed in, otherwise "Host".
  const builderName = user ? (user.displayName || 'Host') : 'Host'
  const identity = user ? { username: user.username, profilePicture: user.profilePicture } : null

  const {
    messages, viewers, connected, sendMessage, setLocalStream, socket,
    getUserAudio, muteAudio, hostMuteViewer, micActive, micMuted, micStatus, remoteAudioStreams
  } = useSocket(sessionId, builderName, 'builder', authReady, identity)

  const handleJoinMic = async () => {
    setMicError(false)
    const result = await getUserAudio()
    if (!result.ok) setMicError(true)
  }

  const shareUrl = window.location.origin + '/s/' + sessionId

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleConfirm = () => {
    setShowModal(false)
    setShouldStart(true)
  }

  const handleStreamReady = (mediaStream) => {
    setStream(mediaStream)
    setIsLive(true)
    if (setLocalStream) {
      setLocalStream(mediaStream)
      console.log('Local stream set, tracks:', mediaStream.getTracks())
    }
  }

  const handleStreamEnd = () => {
    setStream(null)
    setIsLive(false)
    setShouldStart(false)
  }

  const handlePause = () => {
    if (stream) stream.getTracks().forEach(t => { t.enabled = false })
    setIsPaused(true)
    if (socket) socket.emit('session_paused', { sessionId })
  }

  const handleResume = () => {
    if (stream) stream.getTracks().forEach(t => { t.enabled = true })
    setIsPaused(false)
    if (socket) socket.emit('session_resumed', { sessionId })
  }

  const handleEndSession = () => {
    if (stream) stream.getTracks().forEach(t => t.stop())
    fetch((import.meta.env.VITE_API_URL || '') + '/api/session/' + sessionId, { method: 'DELETE' })
    navigate('/')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#0d0d0d', color: 'white' }}>
      {/MiuiBrowser|XiaoMi\/MiuiBrowser/i.test(navigator.userAgent) && (
        <div style={{
          background: '#dc2626', color: 'white', padding: '12px 16px',
          textAlign: 'center', fontSize: '14px', fontWeight: '500',
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999
        }}>
          ⚠️ MIUI Browser detected. Please open this link in <strong>Chrome</strong> for video to work.
        </div>
      )}
      {showModal && (
        <InstructionModal
          onConfirm={handleConfirm}
          onCancel={() => setShowModal(false)}
        />
      )}

      {/* Top bar */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#111', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
          VibeLink <span style={{ color: '#aaa', fontSize: '1rem' }}>/ {sessionId}</span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isLive && !isPaused && (
            <button
              onClick={handlePause}
              style={{ backgroundColor: '#f59e0b', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none', cursor: 'pointer' }}
            >
              ⏸ Pause
            </button>
          )}
          {isLive && isPaused && (
            <button
              onClick={handleResume}
              style={{ backgroundColor: '#22c55e', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none', cursor: 'pointer' }}
            >
              ▶ Resume
            </button>
          )}
          <button
            onClick={handleEndSession}
            style={{ backgroundColor: '#ef4444', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none', cursor: 'pointer' }}
          >
            End Session
          </button>
        </div>
      </header>

      {/* Main content */}
      <main style={{ display: 'flex', flex: '1', overflow: 'hidden' }}>
        {/* Share link card - always visible */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '1rem', backgroundColor: '#1a1a1a', margin: '1rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', width: '25%', border: '1px solid #333' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem', color: 'white' }}>🔗 Share this link — viewers join here:</h2>
          <p style={{ color: '#60a5fa', marginBottom: '1rem', wordBreak: 'break-all' }}>{shareUrl}</p>
          <button
            onClick={handleCopyLink}
            style={{ backgroundColor: '#3b82f6', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none', cursor: 'pointer' }}
          >
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>

          {/* Host identity */}
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #333' }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {user.profilePicture && (
                  <img src={user.profilePicture} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                )}
                <span style={{ color: '#e0e0e0', fontSize: '0.9rem' }}>
                  Hosting as <strong>{user.displayName}</strong>
                  {user.username ? <span style={{ color: '#71767b' }}> @{user.username}</span> : null}
                </span>
              </div>
            ) : (
              <XAuthButton sessionId={sessionId} style={{ width: '100%' }} />
            )}
          </div>
        </div>

        {/* Before live */}
        {!isLive && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: '1', padding: '1rem' }}>
            <button
              onClick={() => setShowModal(true)}
              style={{ background: '#06b6d4', color: 'white', border: 'none', padding: '1rem 3rem', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ▶ Start Screen Share
            </button>
            <p style={{ color: '#aaa', marginTop: '1rem' }}>Viewers can already join via the link above. Start sharing when ready.</p>
          </div>
        )}

        {/* Always render ScreenShare so it can react to shouldStart */}
        <ScreenShare
          shouldStart={shouldStart}
          onStreamReady={handleStreamReady}
          onStreamEnd={handleStreamEnd}
        />

        {/* Live UI */}
        {isLive && (
          <div style={{ display: 'flex', flexDirection: 'column', width: '25%' }}>
            <div style={{ backgroundColor: '#1a1a1a', margin: '1rem', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem', color: 'white' }}>
                {isPaused
                  ? <span style={{ color: '#fbbf24' }}>⏸ Session Paused</span>
                  : <span style={{ color: '#22c55e' }}>🔴 You are live</span>
                }
              </h2>
              <p style={{ color: '#aaa' }}>{viewers.length} people watching</p>
            </div>

            <ViewerList viewers={viewers} micStatus={micStatus} onMuteViewer={hostMuteViewer} />

            {/* Mic control bar */}
            <div style={{ backgroundColor: '#1a1a1a', margin: '1rem', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
              <MicControl
                micActive={micActive}
                micMuted={micMuted}
                error={micError}
                onJoin={handleJoinMic}
                onToggle={() => muteAudio(!micMuted)}
              />
            </div>

            <SessionChat messages={messages} onSendMessage={sendMessage} isConnected={connected} />
          </div>
        )}
      </main>

      {/* Hidden sinks that play each viewer's microphone */}
      {remoteAudioStreams.map((a) => (
        <RemoteAudio key={a.id} stream={a.stream} />
      ))}

      {/* Personal, local-only ambient music (never touches WebRTC) */}
      <AmbientPlayer />
    </div>
  )
}
