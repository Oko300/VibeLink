import { sessionStore } from '../utils/sessionStore.js'

export function initSessionSocket(io) {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id)

    // Join a session room
    socket.on('join_session', ({ sessionId, displayName, role, username, profilePicture }) => {
      socket.join(sessionId)
      socket.data.sessionId = sessionId
      socket.data.displayName = displayName || 'Guest'
      socket.data.role = role || 'viewer'
      // Optional X (Twitter) identity — used only for chat display.
      socket.data.username = username || null
      socket.data.profilePicture = profilePicture || null

      // Add viewer to session store if not builder
      if (role !== 'builder') {
        // Clear any prior entry for this socket first so a reconnect or a
        // re-join (e.g. identity resolved after connect) can't duplicate it.
        sessionStore.removeViewer(sessionId, socket.id)
        sessionStore.addViewer(sessionId, {
          socketId: socket.id,
          displayName: socket.data.displayName
        });
        io.to(sessionId).emit('viewer_list', sessionStore.getViewers(sessionId))

        // Tell the newcomer about the other viewers already here so it can
        // build audio-mesh connections directly with each of them.
        const otherViewerSocketIds = sessionStore.getViewers(sessionId)
          .map(v => v.socketId)
          .filter(id => id !== socket.id)
        socket.emit('viewers_in_session', { viewerSocketIds: otherViewerSocketIds })

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
        username: socket.data.username || null,
        profilePicture: socket.data.profilePicture || null,
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

    // Viewer-to-viewer audio mesh signaling — plain relays between two viewers.
    socket.on('viewer_webrtc_offer', ({ targetSocketId, offer }) => {
      io.to(targetSocketId).emit('viewer_webrtc_offer', { from: socket.id, offer });
    });

    socket.on('viewer_webrtc_answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('viewer_webrtc_answer', { from: socket.id, answer });
    });

    socket.on('viewer_ice_candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('viewer_ice_candidate', { from: socket.id, candidate });
    });


    // Audio: broadcast a participant's mute status so everyone updates their indicator
    socket.on('audio_mute_status', ({ sessionId, muted }) => {
      if (!sessionId) return
      io.to(sessionId).emit('audio_mute_status', { socketId: socket.id, muted: !!muted })
    });

    // Audio: host force-mutes a specific viewer (only the session builder may do this)
    socket.on('host_mute_viewer', ({ targetSocketId }) => {
      if (socket.data.role !== 'builder') return
      io.to(targetSocketId).emit('you_were_muted')
    });

    // Ambient "room vibe" music: only the builder may drive it. Broadcast the
    // volume / play state to every viewer in the session (sender excluded).
    // The audio still plays locally on each device — nothing is streamed here.
    socket.on('host_set_music_volume', ({ sessionId, volume }) => {
      if (socket.data.role !== 'builder') return
      socket.to(sessionId).emit('music_volume_set', { volume })
    });

    socket.on('host_set_music_playing', ({ sessionId, playing, trackIndex }) => {
      if (socket.data.role !== 'builder') return
      socket.to(sessionId).emit('music_playing_set', { playing, trackIndex })
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