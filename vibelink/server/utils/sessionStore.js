import { readFileSync, writeFileSync, existsSync } from 'fs'

const STORE_FILE = '/tmp/vibelink_sessions.json'

function loadSessions() {
  try {
    if (existsSync(STORE_FILE)) {
      const data = JSON.parse(readFileSync(STORE_FILE, 'utf8'))
      return new Map(Object.entries(data))
    }
  } catch {}
  return new Map()
}

function saveSessions(sessions) {
  try {
    const obj = {}
    sessions.forEach((v, k) => { obj[k] = v })
    writeFileSync(STORE_FILE, JSON.stringify(obj))
  } catch {}
}

const sessions = loadSessions()

export const sessionStore = {
  create(sessionId, data) {
    sessions.set(sessionId, { ...data, viewers: [], active: true, createdAt: Date.now() })
    saveSessions(sessions)
  },
  get(sessionId) {
    return sessions.get(sessionId)
  },
  delete(sessionId) {
    sessions.delete(sessionId)
    saveSessions(sessions)
  },
  isActive(sessionId) {
    return sessions.has(sessionId) && sessions.get(sessionId).active === true
  },
  addViewer(sessionId, viewer) {
    const session = sessions.get(sessionId)
    if (session) { session.viewers.push(viewer); saveSessions(sessions) }
  },
  removeViewer(sessionId, socketId) {
    const session = sessions.get(sessionId)
    if (session) { session.viewers = session.viewers.filter(v => v.socketId !== socketId); saveSessions(sessions) }
  },
  getViewers(sessionId) {
    const session = sessions.get(sessionId)
    return session ? session.viewers : []
  }
}