// "Sign in with X" button. Sends the user to the server's OAuth kickoff route,
// carrying the sessionId so we can return them to the same session afterwards.
export default function XAuthButton({ sessionId, label = 'Sign in with X', style }) {
  const API_URL = import.meta.env.VITE_API_URL || ''

  const handleClick = () => {
    // Remember where we are so AuthSuccess can return us here afterwards —
    // works for both the viewer (/s/:id) and builder (/builder/:id) routes.
    try {
      localStorage.setItem('vibelink_return_to', window.location.pathname)
    } catch {
      /* ignore storage errors */
    }
    const q = sessionId ? '?sessionId=' + encodeURIComponent(sessionId) : ''
    window.location.href = API_URL + '/auth/x' + q
  }

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.6rem',
        background: '#000',
        color: '#fff',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '0.75rem 1.25rem',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        ...style
      }}
    >
      <span style={{ fontSize: '1.2em', lineHeight: 1 }}>𝕏</span>
      {label}
    </button>
  )
}
