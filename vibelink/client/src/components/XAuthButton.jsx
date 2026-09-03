import { useAuth } from '../hooks/useAuth'

export default function XAuthButton({ onAuthComplete }) {
  const { user, login, logout } = useAuth()

  if (user) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: '20px',
        backgroundColor: '#1a1a1a',
        color: 'white',
        fontSize: '0.9rem',
      }}>
        {user.profilePicture && <img src={user.profilePicture} alt="Profile" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />}
        @{user.username}
        <button onClick={logout} style={{
          background: 'none',
          border: '1px solid #444',
          color: '#bbb',
          borderRadius: '15px',
          padding: '4px 10px',
          cursor: 'pointer',
          fontSize: '0.8rem',
        }}>Sign out</button>
      </div>
    )
  }

  return (
    <button onClick={login} style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 15px',
      borderRadius: '20px',
      backgroundColor: '#1da1f2', // X blue
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      fontSize: '0.9rem',
      fontWeight: 'bold',
    }}>
      𝕏 Sign in with X
    </button>
  )
}