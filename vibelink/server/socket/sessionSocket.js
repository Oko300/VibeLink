import { sessionStore } from '../utils/sessionStore.js'

export function initSessionSocket(io) {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id)

    // Join a session room
    socket.on('join_session', ({ sessionId, displayName, role }) => {
      socket.join(sessionId)
      socket.data.sessionId = sessionId
      socket.data.displayName = displayName || 'Guest'
      socket.data.role = role || 'viewer'

      // Add viewer to session store if not builder
      if (role !== 'builder') {
        sessionStore.addViewer(sessionId, {
          socketId: socket.id,
          displayName: socket.data.displayName
        });
        io.to(sessionId).emit('viewer_list', sessionStore.getViewers(sessionId))

        // If viewer joining, notify the builder to initiate WebRTC
        const room = io.sockets.adapter.rooms.get(sessionId);
        if (room) {
          room.forEach(socketId => {
            const s = io.sockets.sockets.get(socketId);
            if (s && s.data.role === 'builder') {
              s.emit('viewer_joined_webrtc', { viewerSocketId: socket.id });
            }
          });
        }
      }

      // Notify everyone in the room that someone joined
      io.to(sessionId).emit('user_joined', {
        socketId: socket.id,
        displayName: socket.data.displayName,
        role: socket.data.role
      })

      // Send current viewer list to the newly joined user
      socket.emit('viewer_list', sessionStore.getViewers(sessionId))

      console.log(`${socket.data.displayName} joined session ${sessionId}`)
    })

    // Handle chat messages
    socket.on('chat_message', ({ sessionId, message }) => {
      if (!message || !message.trim()) return
      
      const chatMessage = {
        id: Date.now().toString(),
        displayName: socket.data.displayName || 'Guest',
        role: socket.data.role || 'viewer',
        message: message.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      // Broadcast to everyone in the session including sender
      io.to(sessionId).emit('chat_message', chatMessage)
    })

    // Handle kick
    socket.on('kick_viewer', ({ targetSocketId, sessionId }) => {
      if (socket.data.role !== 'builder') return
      io.to(targetSocketId).emit('kicked')
      const targetSocket = io.sockets.sockets.get(targetSocketId)
      if (targetSocket) {
        targetSocket.leave(sessionId)
        targetSocket.disconnect()
      }
      sessionStore.removeViewer(sessionId, targetSocketId)
      io.to(sessionId).emit('viewer_list', sessionStore.getViewers(sessionId))
    })

    // Handle session pause/resume
    socket.on('session_paused', ({ sessionId }) => {
      socket.to(sessionId).emit('session_paused');
    });

    socket.on('session_resumed', ({ sessionId }) => {
      socket.to(sessionId).emit('session_resumed');
    });


    // WebRTC signaling
    socket.on('webrtc_offer', ({ targetSocketId, offer }) => {
      io.to(targetSocketId).emit('webrtc_offer', { from: socket.id, offer });
    });

    socket.on('webrtc_answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('webrtc_answer', { from: socket.id, answer });
    });

    socket.on('webrtc_ice_candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('webrtc_ice_candidate', { from: socket.id, candidate });
    });


    // Handle disconnect
    socket.on('disconnect', () => {
      const { sessionId, displayName, role } = socket.data
      if (sessionId) {
        if (role !== 'builder') {
          sessionStore.removeViewer(sessionId, socket.id)
          io.to(sessionId).emit('viewer_list', sessionStore.getViewers(sessionId))
        }
        io.to(sessionId).emit('user_left', { socketId: socket.id, displayName })
      }
      console.log('Socket disconnected:', socket.id)
    })
  })
}