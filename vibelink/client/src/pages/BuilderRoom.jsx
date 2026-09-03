import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import InstructionModal from '../components/InstructionModal'
import ScreenShare from '../components/ScreenShare'
import SessionChat from '../components/SessionChat'
import { useSocket } from '../hooks/useSocket'

export default function BuilderRoom() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [shouldStart, setShouldStart] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const [stream, setStream] = useState(null)
  const [copied, setCopied] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const { messages, viewers, connected, sendMessage, setLocalStream, socket } = useSocket(sessionId, 'Host', 'builder', true)

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
    if (setLocalStream) setLocalStream(mediaStream)
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
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {showModal && (
        <InstructionModal
          onConfirm={handleConfirm}
          onCancel={() => setShowModal(false)}
        />
      )}

      {/* Top bar */}
      <header className="flex items-center justify-between p-4 bg-gray-800 shadow-md">
        <h1 className="text-xl font-bold">
          VibeLink <span className="text-gray-400 text-base">/ {sessionId}</span>
        </h1>
        <div className="flex items-center space-x-4">
          {isLive && !isPaused && (
            <button
              onClick={handlePause}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded"
            >
              ⏸ Pause
            </button>
          )}
          {isLive && isPaused && (
            <button
              onClick={handleResume}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
            >
              ▶ Resume
            </button>
          )}
          <button
            onClick={handleEndSession}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
          >
            End Session
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Share link card - always visible */}
        <div className="flex flex-col p-4 bg-gray-800 m-4 rounded-lg shadow-lg w-1/4">
          <h2 className="text-lg font-semibold mb-2">🔗 Share this link — viewers join here:</h2>
          <p className="text-blue-400 mb-4 break-all">{shareUrl}</p>
          <button
            onClick={handleCopyLink}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          >
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>

        {/* Before live */}
        {!isLive && (
          <div className="flex flex-col items-center justify-center flex-1 p-4">
            <button
              onClick={() => setShowModal(true)}
              style={{ background: '#06b6d4', color: 'white', border: 'none', padding: '1rem 3rem', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ▶ Start Screen Share
            </button>
            <p className="text-gray-400 mt-4">Viewers can already join via the link above. Start sharing when ready.</p>
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
          <div className="flex flex-col w-1/4">
            <div className="bg-gray-800 m-4 p-4 rounded-lg shadow-lg">
              <h2 className="text-lg font-semibold mb-2">
                {isPaused
                  ? <span className="text-yellow-400">⏸ Session Paused</span>
                  : <span className="text-green-500">🔴 You are live</span>
                }
              </h2>
              <p className="text-gray-400">{viewers.length} people watching</p>
            </div>
            <SessionChat messages={messages} sendMessage={sendMessage} />
          </div>
        )}
      </main>
    </div>
  )
}
