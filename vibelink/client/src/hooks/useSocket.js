import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Fallback used until /api/ice-servers responds with the full Metered TURN set.
// STUN-only is enough for same-network peers but not for cellular viewers.
const DEFAULT_ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

export function useSocket(sessionId, displayName, role, shouldJoin) {
  const socketRef = useRef(null)
  const localStreamRef = useRef(null)   // screen-share stream (builder only)
  const audioStreamRef = useRef(null)   // local microphone stream (anyone who joins with mic)
  const peerConnections = useRef({})
  const pendingViewers = useRef([])
  const [messages, setMessages] = useState([])
  const [viewers, setViewers] = useState([])
  const [connected, setConnected] = useState(false)
  const [remoteStream, setRemoteStream] = useState(null)   // remote screen video (viewer side)
  const [sessionPaused, setSessionPaused] = useState(false)

  // --- audio state ---
  // Remote microphone streams, one per peer: [{ id: socketId, stream }]
  const [remoteAudioStreams, setRemoteAudioStreams] = useState([])
  // Mic mute state of every participant we know about: { socketId: muted<boolean> }
  const [micStatus, setMicStatus] = useState({})
  const [micActive, setMicActive] = useState(false)   // have we captured a local mic?
  const [micMuted, setMicMuted] = useState(false)     // is our local mic muted?
  const [mutedByHost, setMutedByHost] = useState(false)

  // Ref mirror so the socket-event closures (registered once per session) always
  // read the freshest TURN credentials rather than the captured default.
  const iceServersRef = useRef(DEFAULT_ICE_SERVERS)

  useEffect(() => {
    fetch((import.meta.env.VITE_API_URL || '') + '/api/ice-servers')
      .then(r => r.json())
      .then(servers => {
        if (Array.isArray(servers) && servers.length) {
          iceServersRef.current = servers
        }
      })
      .catch(() => console.warn('Could not fetch ICE servers, using STUN only'))
  }, [])

  // --- remote audio bookkeeping ---
  const addRemoteAudio = (id, stream) => {
    setRemoteAudioStreams(prev => [...prev.filter(a => a.id !== id), { id, stream }])
  }
  const removeRemoteAudio = (id) => {
    setRemoteAudioStreams(prev => prev.filter(a => a.id !== id))
  }

  // Create (or return existing) RTCPeerConnection for a peer. Uses the WebRTC
  // "perfect negotiation" pattern so either side can add tracks (e.g. turn on
  // their mic) and renegotiate without breaking the existing screen share.
  // The builder is the impolite peer; viewers are polite.
  const createPeerConnection = (peerId, socket) => {
    if (peerConnections.current[peerId]) return peerConnections.current[peerId]

    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current, iceCandidatePoolSize: 10 })
    peerConnections.current[peerId] = pc
    pc._makingOffer = false
    pc._ignoreOffer = false
    pc._polite = role !== 'builder'

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc_ice_candidate', { targetSocketId: peerId, candidate: event.candidate })
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log('ICE state (' + peerId + '):', pc.iceConnectionState)
    }

    pc.ontrack = (event) => {
      if (event.track.kind === 'audio') {
        // Remote microphone — keep it entirely separate from the video element.
        const stream = (event.streams && event.streams[0]) || new MediaStream([event.track])
        addRemoteAudio(peerId, stream)
      } else {
        // Remote screen video (only viewers receive this).
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0])
        } else {
          const newStream = new MediaStream()
          newStream.addTrack(event.track)
          setRemoteStream(newStream)
        }
      }
    }

    pc.onnegotiationneeded = async () => {
      try {
        pc._makingOffer = true
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('webrtc_offer', { targetSocketId: peerId, offer: pc.localDescription })
      } catch (e) {
        console.error('negotiation error:', e)
      } finally {
        pc._makingOffer = false
      }
    }

    // Include whatever local media we already have. Adding tracks fires
    // onnegotiationneeded, which produces the offer for us.
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current))
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach(track => pc.addTrack(track, audioStreamRef.current))
    }

    return pc
  }

  // Builder initiates a connection to a viewer once media is available.
  const initiateWebRTC = (viewerSocketId, socket) => {
    if (!localStreamRef.current && !audioStreamRef.current) return
    createPeerConnection(viewerSocketId, socket)
  }

  useEffect(() => {
    if (!sessionId) return

    const socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      if (shouldJoin) {
        socket.emit('join_session', { sessionId, displayName: displayName || 'Guest', role: role || 'viewer' })
      }
    })

    socket.on('chat_message', (msg) => {
      setMessages(prev => [...prev, msg])
    })

    socket.on('viewer_list', (list) => {
      setViewers(list || [])
    })

    socket.on('user_joined', (user) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        displayName: 'System',
        role: 'system',
        message: (user.displayName || 'Someone') + ' joined the session',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }])
    })

    socket.on('user_left', (user) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        displayName: 'System',
        role: 'system',
        message: (user.displayName || 'Someone') + ' left the session',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }])
      // Tear down that peer's connection and audio so nothing lingers.
      if (user && user.socketId) {
        const pc = peerConnections.current[user.socketId]
        if (pc) {
          pc.close()
          delete peerConnections.current[user.socketId]
        }
        removeRemoteAudio(user.socketId)
        setMicStatus(prev => {
          const next = { ...prev }
          delete next[user.socketId]
          return next
        })
      }
    })

    socket.on('kicked', () => {
      alert('You have been removed from this session.')
      window.location.href = '/'
    })

    socket.on('session_paused', () => setSessionPaused(true))
    socket.on('session_resumed', () => setSessionPaused(false))

    socket.on('viewer_joined_webrtc', async ({ viewerSocketId }) => {
      if (!localStreamRef.current && !audioStreamRef.current) {
        pendingViewers.current.push(viewerSocketId)
        return
      }
      initiateWebRTC(viewerSocketId, socket)
    })

    // --- WebRTC signaling (perfect negotiation) ---
    socket.on('webrtc_offer', async ({ from, offer }) => {
      let pc = peerConnections.current[from]
      if (!pc) pc = createPeerConnection(from, socket)

      const offerCollision = pc._makingOffer || pc.signalingState !== 'stable'
      pc._ignoreOffer = !pc._polite && offerCollision
      if (pc._ignoreOffer) return

      try {
        if (offerCollision) {
          await pc.setLocalDescription({ type: 'rollback' })
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('webrtc_answer', { targetSocketId: from, answer: pc.localDescription })
      } catch (e) {
        console.error('WebRTC offer handling error:', e)
      }
    })

    socket.on('webrtc_answer', async ({ from, answer }) => {
      const pc = peerConnections.current[from]
      if (!pc) return
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
      } catch (e) {
        console.error('WebRTC set answer error:', e)
      }
    })

    socket.on('webrtc_ice_candidate', async ({ from, candidate }) => {
      const pc = peerConnections.current[from]
      if (!pc) return
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (e) {
        if (!pc._ignoreOffer) console.error('ICE candidate error:', e)
      }
    })

    // --- audio mute indicators ---
    socket.on('audio_mute_status', ({ socketId, muted }) => {
      setMicStatus(prev => ({ ...prev, [socketId]: muted }))
    })

    socket.on('you_were_muted', () => {
      if (audioStreamRef.current) {
        const track = audioStreamRef.current.getAudioTracks()[0]
        if (track) track.enabled = false
      }
      setMicMuted(true)
      setMutedByHost(true)
      setTimeout(() => setMutedByHost(false), 3000)
      // Let everyone's indicator update to reflect that we are now muted.
      socket.emit('audio_mute_status', { sessionId, muted: true })
    })

    return () => {
      Object.values(peerConnections.current).forEach(pc => pc.close())
      peerConnections.current = {}
      socket.disconnect()
    }
  }, [sessionId])

  useEffect(() => {
    if (shouldJoin && socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('join_session', { sessionId, displayName: displayName || 'Guest', role: role || 'viewer' })
    }
  }, [shouldJoin])

  const sendMessage = (message) => {
    if (socketRef.current && message && message.trim()) {
      socketRef.current.emit('chat_message', { sessionId, message })
    }
  }

  const kickViewer = (targetSocketId) => {
    if (socketRef.current) {
      socketRef.current.emit('kick_viewer', { targetSocketId, sessionId })
    }
  }

  const setLocalStream = (stream) => {
    localStreamRef.current = stream
    // Now handle any viewers who joined before the stream was ready.
    pendingViewers.current.forEach((viewerSocketId) => {
      initiateWebRTC(viewerSocketId, socketRef.current)
    })
    pendingViewers.current = []
  }

  // Request the local microphone. Not called automatically — the UI shows a
  // "Join with mic" button so we never prompt for permission on page load.
  const getUserAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      audioStreamRef.current = stream
      setMicActive(true)
      setMicMuted(false)

      const track = stream.getAudioTracks()[0]
      // Add the mic track to every existing peer connection (triggers
      // renegotiation on each), and pick up any viewers that were waiting.
      Object.values(peerConnections.current).forEach(pc => {
        const alreadySending = pc.getSenders().some(s => s.track && s.track.kind === 'audio')
        if (!alreadySending && track) pc.addTrack(track, stream)
      })
      if (socketRef.current) {
        pendingViewers.current.forEach((viewerSocketId) => {
          initiateWebRTC(viewerSocketId, socketRef.current)
        })
        pendingViewers.current = []
        socketRef.current.emit('audio_mute_status', { sessionId, muted: false })
      }
      return { ok: true }
    } catch (err) {
      setMicActive(false)
      return { ok: false, error: err }
    }
  }

  // Mute/unmute our own mic. Keeps the track (no renegotiation) and just
  // toggles enabled, then broadcasts the new status for everyone's indicator.
  const muteAudio = (muted) => {
    if (audioStreamRef.current) {
      const track = audioStreamRef.current.getAudioTracks()[0]
      if (track) track.enabled = !muted
    }
    setMicMuted(muted)
    if (socketRef.current) {
      socketRef.current.emit('audio_mute_status', { sessionId, muted })
    }
  }

  // Builder-only: force-mute a specific viewer.
  const hostMuteViewer = (targetSocketId) => {
    if (socketRef.current) {
      socketRef.current.emit('host_mute_viewer', { sessionId, targetSocketId })
    }
  }

  return {
    messages,
    viewers,
    connected,
    sendMessage,
    kickViewer,
    setLocalStream,
    remoteStream,
    sessionPaused,
    socket: socketRef.current,
    // audio
    getUserAudio,
    muteAudio,
    hostMuteViewer,
    remoteAudioStreams,
    micStatus,
    micActive,
    micMuted,
    mutedByHost
  }
}
