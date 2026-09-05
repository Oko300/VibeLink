import { useEffect, useRef, useState } from 'react'

export default function SessionChat({ messages, onSendMessage, currentUserName, isConnected }) {
  const [inputValue, setInputValue] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSend = () => {
    const text = inputValue.trim()
    if (!text) return
    onSendMessage(text)
    setInputValue('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#111', borderLeft: '1px solid #222', color: 'white', fontFamily: 'sans-serif', padding: '1rem', width: '300px' }}>
      <div style={{ paddingBottom: '1rem', borderBottom: '1px solid #222', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
          Session Chat {isConnected ? '🟢' : '🔴'}
        </h2>
      </div>

      <div style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '1rem', paddingRight: '10px' }}>
        {messages.length === 0 && (
          <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#9ca3af', marginTop: '1rem' }}>No messages yet</p>
        )}
        {messages.map((msg) => {
          if (msg.role === 'system') {
            return (
              <div key={msg.id} style={{ textAlign: 'center', fontStyle: 'italic', color: '#9ca3af', fontSize: '0.85em', margin: '0.5rem 0' }}>
                — {msg.message} —
              </div>
            )
          }
          return (
            <div key={msg.id} style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                {msg.profilePicture && (
                  <img
                    src={msg.profilePicture}
                    alt=""
                    style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                )}
                <span style={{ fontWeight: 'bold', color: msg.role === 'builder' ? '#06b6d4' : 'white' }}>
                  {msg.displayName || 'Guest'}
                </span>
                {msg.username && (
                  <span style={{ color: '#71767b', fontSize: '0.75em' }}>@{msg.username}</span>
                )}
                {msg.role === 'builder' && (
                  <span style={{ backgroundColor: '#06b6d4', color: '#0d0d0d', fontSize: '0.7em', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' }}>
                    Host
                  </span>
                )}
                <span style={{ color: '#9ca3af', fontSize: '0.75em' }}>{msg.timestamp}</span>
              </div>
              <p style={{ fontSize: '0.95em', marginLeft: '0.25rem', wordBreak: 'break-word' }}>{msg.message}</p>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '0.6rem 0.75rem', color: 'white', fontSize: '14px', outline: 'none' }}
        />
        <button
          onClick={handleSend}
          style={{ background: '#06b6d4', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
        >
          Send
        </button>
      </div>

    </div>

  )
}