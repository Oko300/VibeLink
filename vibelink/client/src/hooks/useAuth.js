import { useState, useEffect } from 'react'

const JWT_KEY = 'vibelink_jwt'

// Decode a JWT payload WITHOUT verifying the signature. Safe here because the
// token carries only public display info; we never trust it for authorization.
// Handles base64url + UTF-8 (X display names may contain emoji / non-latin).
export function decodeJwt(token) {
  try {
    const part = token.split('.')[1]
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

// Reads the X identity JWT from localStorage. Expired/invalid tokens are
// silently treated as "not signed in" (guest). `ready` flips true once the
// (synchronous) localStorage check has run, so callers can avoid acting on a
// not-yet-known auth state.
export function useAuth() {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const token = localStorage.getItem(JWT_KEY)
      if (!token) return
      const payload = decodeJwt(token)
      if (!payload) {
        localStorage.removeItem(JWT_KEY)
        return
      }
      // exp is seconds since epoch.
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        localStorage.removeItem(JWT_KEY)
        return
      }
      setUser({
        username: payload.username,
        displayName: payload.displayName || payload.username,
        profilePicture: payload.profilePicture || null
      })
    } finally {
      setReady(true)
    }
  }, [])

  const logout = () => {
    localStorage.removeItem(JWT_KEY)
    window.location.reload()
  }

  return { user, ready, logout }
}
