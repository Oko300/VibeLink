import React, { useEffect, useRef, useState } from 'react'

export default function SessionChat({ messages, onSendMessage, currentUserName, isConnected }) {
  const messagesEndRef = useRef(null)
  const [inputValue, setInputValue] = useState('')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (inputValue.trim() && isConnected) {
      onSendMessage(inputValue)
      setInputValue('')
    }
  }

  const getMessageColor = (role) => {
    switch (role) {
      case 'builder':
        return '#06b6d4' // Cyan for builder
      case 'system':
        return '#9ca3af' // Grey for system
      default:
        return 'white' // White for viewers
    }
  }

  return (
    <div style={styles.chatContainer}>
      <div style={styles.messagesList}>
        {messages.map((msg) => (
          <div key={msg.id} style={styles.messageItem}>
            {msg.role === 'system' ? (
              <p style={styles.systemMessage}>— {msg.message} —</p>
            ) : (
              <>
                <div style={styles.messageInfo}>
                  <span style={{ ...styles.displayName, color: getMessageColor(msg.role) }}>
                    {msg.displayName}
                  </span>
                  {msg.role === 'builder' && <span style={styles.hostBadge}>Host</span>}
                  <span style={styles.timestamp}>{msg.timestamp}</span>
                </div>
                <p style={styles.messageText}>{msg.message}</p>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} style={styles.inputBar}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={isConnected ? "Type a message..." : "Connecting to chat..."}
          disabled={!isConnected}
          style={styles.chatInput}
        />
        <button type="submit" style={styles.sendButton} disabled={!isConnected}>
          Send
        </button>
      </form>
    </div>
  )
}

const styles = {
  chatContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#111',
    borderLeft: '1px solid #222',
    color: 'white',
    fontFamily: 'sans-serif',
    padding: '1rem',
  },
  messagesList: {
    flexGrow: 1,
    overflowY: 'auto',
    marginBottom: '1rem',
    paddingRight: '10px', // For scrollbar
  },
  messageItem: {
    marginBottom: '0.75rem',
  },
  messageInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.25rem',
  },
  displayName: {
    fontWeight: 'bold',
  },
  hostBadge: {
    backgroundColor: '#06b6d4',
    color: '#0d0d0d',
    fontSize: '0.7em',
    padding: '0.1rem 0.4rem',
    borderRadius: '4px',
    fontWeight: 'bold',
  },
  timestamp: {
    color: '#9ca3af',
    fontSize: '0.75em',
  },
  messageText: {
    fontSize: '0.95em',
    marginLeft: '0.25rem',
    wordBreak: 'break-word',
  },
  systemMessage: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#9ca3af',
    fontSize: '0.85em',
    margin: '0.5rem 0',
  },
  inputBar: {
    display: 'flex',
    gap: '0.5rem',
  },
  chatInput: {
    flexGrow: 1,
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid #333',
    backgroundColor: '#1a1a1a',
    color: 'white',
    fontSize: '1em',
  },
  sendButton: {
    backgroundColor: '#06b6d4',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.25rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1em',
    fontWeight: 'bold',
  },
}