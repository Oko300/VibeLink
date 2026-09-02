const sessions = new Map()

export const sessionStore = {
  create(sessionId, data) {
    sessions.set(sessionId, { ...data, viewers: [], active: true, createdAt: Date.now() })
  },
  get(sessionId) {
    return sessions.get(sessionId)
  },
  delete(sessionId) {
    sessions.delete(sessionId)
  },
  isActive(sessionId) {
    return sessions.has(sessionId) && sessions.get(sessionId).active === true
  },
  addViewer(sessionId, viewer) {
    const session = sessions.get(sessionId)
    if (session) session.viewers.push(viewer)
  },
  removeViewer(sessionId, socketId) {
    const session = sessions.get(sessionId)
    if (session) session.viewers = session.viewers.filter(v => v.socketId !== socketId)
  },
  getViewers(sessionId) {
    const session = sessions.get(sessionId)
    return session ? session.viewers : []
  }
}