import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
dotenv.config()

import sessionRouter from './routes/session.js'
import authRouter from './routes/auth.js'
import iceRouter from './routes/ice.js'
import { initSessionSocket } from './socket/sessionSocket.js'
import { sessionStore } from './utils/sessionStore.js'

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true
})

app.use(express.json())

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

app.use('/api/session', sessionRouter)
app.use('/auth', authRouter)
app.use('/api/ice-servers', iceRouter)

// --- Open Graph link previews for shared session URLs ---
// Crawlers (X/Twitter, Discord, Slack, iMessage, etc.) don't run client JS, so
// they can't read the React-rendered <head>. We serve a tiny HTML document with
// real OG tags here, then bounce real browsers on to the SPA.
// NOTE: this only runs for links that actually hit THIS server (the Render
// backend). Share links that point straight at the Vercel domain never reach
// it — see the shareUrl in client/src/pages/BuilderRoom.jsx.
const CLIENT_URL = (process.env.CLIENT_URL || 'https://vibe-link-tau.vercel.app').replace(/\/$/, '')
const OG_IMAGE = CLIENT_URL + '/og-image.png'
const VALID_SESSION_ID = /^[A-Za-z0-9_-]{1,64}$/

function renderSharePage({ title, description, url }) {
  // title/description are trusted constants; url is built from a regex-validated
  // sessionId + the trusted CLIENT_URL, so there is no injection vector here.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${OG_IMAGE}" />
<meta property="og:url" content="${url}" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${OG_IMAGE}" />
<meta http-equiv="refresh" content="0;url=${url}" />
</head>
<body style="margin:0;background:#0d0d0d;color:#fff;font-family:Arial,sans-serif;">
<script>window.location.href = ${JSON.stringify(url)};</script>
<noscript><a href="${url}" style="color:#6366f1">Continue to VibeLink →</a></noscript>
</body>
</html>`
}

app.get('/s/:sessionId', (req, res) => {
  const { sessionId } = req.params
  const valid = VALID_SESSION_ID.test(sessionId)
  res.set('Content-Type', 'text/html; charset=utf-8')

  if (valid && sessionStore.isActive(sessionId)) {
    return res.send(renderSharePage({
      title: 'Live Build Session on VibeLink',
      description: 'Someone is building live with AI right now — watch their screen and give advice in real time.',
      url: CLIENT_URL + '/s/' + sessionId
    }))
  }

  // Unknown / ended / malformed session: advertise "ended" and send the browser
  // to the SPA, which renders the "Session Has Ended" page.
  return res.send(renderSharePage({
    title: 'Session Ended · VibeLink',
    description: 'This build session has been closed by the host. The link is no longer active.',
    url: valid ? CLIENT_URL + '/s/' + sessionId : CLIENT_URL
  }))
})

app.get('/', (req, res) => res.json({ status: 'VibeLink server running' }))

initSessionSocket(io)

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log('VibeLink server running on port ' + PORT)
})