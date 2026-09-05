import express from 'express'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const router = express.Router()

// --- X (Twitter) OAuth 2.0 with PKCE ---
// No database: after login we mint a short-lived JWT holding only public
// profile info and hand it to the client via the redirect URL. The client
// secret NEVER leaves the server.

const AUTHORIZE_URL = 'https://x.com/i/oauth2/authorize'
const TOKEN_URL = 'https://api.x.com/2/oauth2/token'
const ME_URL = 'https://api.x.com/2/users/me?user.fields=profile_image_url,name,username'
const SCOPES = 'tweet.read users.read'

const CLIENT_URL = () => process.env.CLIENT_URL || 'http://localhost:5173'

// Cookies that survive the round-trip to X. First-party on this server's
// domain; sameSite=lax lets them ride the top-level redirect back from X.
const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 10 * 60 * 1000, // 10 minutes — just long enough to complete login
  path: '/'
}

// Minimal cookie-header parser so we don't need the cookie-parser dependency.
function parseCookies(req) {
  const header = req.headers.cookie || ''
  const out = {}
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=')
    if (idx === -1) return
    const k = pair.slice(0, idx).trim()
    const v = pair.slice(idx + 1).trim()
    if (k) out[k] = decodeURIComponent(v)
  })
  return out
}

// GET /auth/x?sessionId=xxx
// Kick off the PKCE flow and redirect the user to X's consent screen.
router.get('/x', (req, res) => {
  const clientId = process.env.X_CLIENT_ID
  const callbackUrl = process.env.X_CALLBACK_URL
  const sessionId = (req.query.sessionId || '').toString()

  if (!clientId || !callbackUrl) {
    console.error('X OAuth not configured (missing X_CLIENT_ID / X_CALLBACK_URL)')
    return res.redirect(CLIENT_URL() + (sessionId ? '/s/' + sessionId : '/'))
  }

  // PKCE: a high-entropy verifier and its SHA-256 challenge.
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
  const state = crypto.randomBytes(16).toString('hex')

  res.cookie('x_pkce', codeVerifier, COOKIE_OPTS)
  res.cookie('x_state', state, COOKIE_OPTS)
  res.cookie('x_sess', sessionId, COOKIE_OPTS)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  })
  // Encode spaces in scope as %20 (URLSearchParams uses '+'); none of our
  // other values contain a literal '+', so this global swap is safe.
  const authUrl = AUTHORIZE_URL + '?' + params.toString().replace(/\+/g, '%20')
  res.redirect(authUrl)
})

// GET /auth/x/callback
// X redirects here with ?code & ?state. Exchange the code, fetch the profile,
// mint a JWT, and bounce back to the client.
router.get('/x/callback', async (req, res) => {
  const cookies = parseCookies(req)
  const sessionId = cookies.x_sess || ''
  const clientUrl = CLIENT_URL()
  const backToApp = clientUrl + (sessionId ? '/s/' + sessionId : '/')

  // Clear the short-lived cookies regardless of outcome.
  res.clearCookie('x_pkce', { path: '/' })
  res.clearCookie('x_state', { path: '/' })
  res.clearCookie('x_sess', { path: '/' })

  try {
    const { code, state, error } = req.query
    if (error) {
      console.warn('X OAuth denied/error:', error)
      return res.redirect(backToApp)
    }
    if (!code || !state || state !== cookies.x_state) {
      console.warn('X OAuth callback failed state/code validation')
      return res.redirect(backToApp)
    }

    const clientId = process.env.X_CLIENT_ID
    const clientSecret = process.env.X_CLIENT_SECRET
    const callbackUrl = process.env.X_CALLBACK_URL
    const codeVerifier = cookies.x_pkce
    if (!clientId || !clientSecret || !callbackUrl || !codeVerifier) {
      console.error('X OAuth callback missing config or verifier')
      return res.redirect(backToApp)
    }

    // Confidential client: authenticate the token exchange with HTTP Basic.
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + basic
      },
      body: new URLSearchParams({
        code: code.toString(),
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: callbackUrl,
        code_verifier: codeVerifier
      })
    })

    const tokenData = await tokenRes.json().catch(() => ({}))
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('X token exchange failed:', tokenRes.status, tokenData)
      return res.redirect(backToApp)
    }

    const meRes = await fetch(ME_URL, {
      headers: { Authorization: 'Bearer ' + tokenData.access_token }
    })
    const meData = await meRes.json().catch(() => ({}))
    const u = meData && meData.data
    if (!meRes.ok || !u || !u.username) {
      console.error('X users/me failed:', meRes.status, meData)
      return res.redirect(backToApp)
    }

    // Twitter's default avatar is the tiny 48px "_normal" — bump to "_bigger".
    const profilePicture = (u.profile_image_url || '').replace('_normal', '_bigger')

    const token = jwt.sign(
      {
        username: u.username,
        displayName: u.name || u.username,
        profilePicture,
        sessionId
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    return res.redirect(clientUrl + '/auth/success?token=' + encodeURIComponent(token))
  } catch (err) {
    console.error('X OAuth callback error:', err)
    return res.redirect(backToApp)
  }
})

export default router
