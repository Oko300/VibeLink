import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      localStorage.setItem('vibelink_auth_token', token)
    }
    navigate('/')
  }, [])

  return (
    <div>
      Signing you in...
    </div>
  )
}