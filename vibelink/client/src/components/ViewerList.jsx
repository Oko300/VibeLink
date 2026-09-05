// Builder's sidebar list of viewers with per-viewer mic status + force-mute.
export default function ViewerList({ viewers = [], micStatus = {}, onMuteViewer }) {
  return (
    <div style={{ backgroundColor: '#1a1a1a', margin: '1rem', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem', color: 'white' }}>
        👥 Viewers ({viewers.length})
      </h2>

      {viewers.length === 0 && (
        <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>No viewers yet</p>
      )}

      {viewers.map((v) => {
        // Default to muted/grey until a viewer explicitly reports an unmuted mic.
        const muted = micStatus[v.socketId] !== false
        return (
          <div
            key={v.socketId}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.45rem 0', borderBottom: '1px solid #2a2a2a' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
              <span
                title={muted ? 'Muted' : 'Speaking'}
                style={{ fontSize: '1rem', lineHeight: 1 }}
              >
                {muted ? '🔇' : '🎤'}
              </span>
              <span
                style={{ width: 8, height: 8, borderRadius: '50%', background: muted ? '#6b7280' : '#22c55e', display: 'inline-block', flexShrink: 0 }}
              />
              <span style={{ color: 'white', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {v.displayName}
              </span>
            </div>
            <button
              onClick={() => onMuteViewer && onMuteViewer(v.socketId)}
              style={{ backgroundColor: '#374151', color: '#f87171', border: '1px solid #4b5563', borderRadius: '9999px', padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0 }}
            >
              Mute
            </button>
          </div>
        )
      })}
    </div>
  )
}
