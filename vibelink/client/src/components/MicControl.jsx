// Presentational mic control pill. No permission is requested until the user
// clicks "Join with mic" (onJoin). Once active it toggles mute (onToggle).
export default function MicControl({ micActive, micMuted, error, onJoin, onToggle, style }) {
  const pill = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    border: 'none',
    borderRadius: 'var(--radius-lg)',
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
          style={{ ...pill, backgroundColor: 'var(--clr-primary)', color: 'var(--clr-text-inverted)', border: 'none' }}
        >
          🎙️ Join with mic
        </button>
      )}

      {micActive && (
        <button
          onClick={onToggle}
          style={{ ...pill, backgroundColor: micMuted ? 'var(--clr-secondary)' : 'var(--clr-primary)', color: 'var(--clr-text-inverted)' }}
        >
          {micMuted ? '🔇 Muted. Tap to talk' : '🎙️ Mic live. Tap to mute'}
        </button>
      )}

      {error && (
        <span style={{ color: 'var(--clr-error)', fontSize: '0.8rem', textAlign: 'center' }}>
          Mic access denied. You can still watch and use chat
        </span>
      )}
    </div>
  )
}
