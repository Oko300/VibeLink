import { useState, useEffect } from 'react'

export function useAuth() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('vibelink_auth_token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.exp > Date.now() / 1000) {
          setUser(payload)
        } else {
          localStorage.removeItem('vibelink_auth_token')
        }
      } catch {
        localStorage.removeItem('vibelink_auth_token')
      }
    }
  }, [])

  const login = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    window.location.href = apiUrl + '/auth/x'
  }

  const logout = () => {
    localStorage.removeItem('vibelink_auth_token')
    setUser(null)
  }

  return { user, login, logout }
}