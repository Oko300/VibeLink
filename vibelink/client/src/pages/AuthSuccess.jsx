import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { decodeJwt } from '../hooks/useAuth'

// Landing route after X OAuth. Persists the JWT, then bounces the user back
// into the session they were joining (sessionId is embedded in the token).
export default function AuthSuccess() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (token) {
      localStorage.setItem('vibelink_jwt', token)

      // Prefer the exact page the user launched sign-in from (viewer or
      // builder). Only honour same-origin absolute paths we set ourselves.
      const returnTo = localStorage.getItem('vibelink_return_to')
      localStorage.removeItem('vibelink_return_to')
      if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
        navigate(returnTo, { replace: true })
        return
      }

      const payload = decodeJwt(token)
      const sessionId = payload && payload.sessionId
      if (sessionId) {
        navigate('/s/' + sessionId, { replace: true })
        return
      }
    }
    // No token or no session — just go home.
    navigate('/', { replace: true })
  }, [navigate])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0d0d0d',
        color: 'white',
        fontFamily: 'sans-serif'
      }}
    >
      <p>Signing you in…</p>
    </div>
  )
}
