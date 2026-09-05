// Presentational mic control pill. No permission is requested until the user
// clicks "Join with mic" (onJoin). Once active it toggles mute (onToggle).
export default function MicControl({ micActive, micMuted, error, onJoin, onToggle, style }) {
  const pill = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    border: 'none',
    borderRadius: '9999px',
    padding: '0.55rem 1.1rem',
    fontSize: '0.95rem',
    fontWeight: 'bold',
    cursor: 'pointer'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', ...style }}>
      {!micActive && (
        <button
          onClick={onJoin}
          style={{ ...pill, backgroundColor: '#1f2937', color: 'white', border: '1px solid #374151' }}
        >
          🎙️ Join with mic
        </button>
      )}

      {micActive && (
        <button
          onClick={onToggle}
          style={{ ...pill, backgroundColor: micMuted ? '#374151' : '#065f46', color: 'white' }}
        >
          {micMuted ? '🔇 Muted — tap to talk' : '🎙️ Mic live — tap to mute'}
        </button>
      )}

      {error && (
        <span style={{ color: '#f87171', fontSize: '0.8rem', textAlign: 'center' }}>
          Mic access denied — you can still watch and use chat
        </span>
      )}
    </div>
  )
}
