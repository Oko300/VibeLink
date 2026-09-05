import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Fallback used until /api/ice-servers responds with the full Metered TURN set.
// STUN-only is enough for same-network peers but not for cellular viewers.
const DEFAULT_ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

// Reorder the video m-line so H.264 is the preferred codec. Many Android/MIUI
// devices have no hardware VP8/VP9 decoder, so a VP8 stream renders blank;
// forcing H.264 fixes that.
// NOTE: real browser SDP uses the profile token "UDP/TLS/RTP/SAVPF" (not the
// bare "RTP/SAVPF"), so we capture and preserve that token — a naive
// /RTP\/SAVPF/ pattern never matches modern Chrome and would be a silent no-op.
function preferH264(sdp) {
  if (!sdp) return sdp
  const h264Match = sdp.match(/a=rtpmap:(\d+) H264\/90000/)
  if (!h264Match) return sdp
  const h264pt = h264Match[1]
  return sdp.replace(/m=video (\d+) ([A-Z/]+) ([\d ]+)/, (match, port, proto, payloads) => {
    const others = payloads.trim().split(' ').filter(p => p && p !== h264pt)
    return `m=video ${port} ${proto} ${h264pt} ${others.join(' ')}`
  })
}

export function useSocket(sessionId, displayName, role, shouldJoin, identity) {
  const socketRef = useRef(null)
  const localStreamRef = useRef(null)   // screen-share stream (builder only)
  const audioStreamRef = useRef(null)   // local microphone stream (anyone who joins with mic)
  const peerConnections = useRef({})
  const viewerPeerConnections = useRef({})   // audio-only mesh between viewers
  const pendingViewers = useRef([])
  // Mirror the optional X identity so the join emits (registered once) always
  // read the freshest value rather than a stale closure.
  const identityRef = useRef(identity || null)
  useEffect(() => { identityRef.current = identity || null }, [identity])
  // Same for the values the connect handler needs, so socket.io reconnects and
  // late-arriving auth both join with current data.
  const displayNameRef = useRef(displayName)
  useEffect(() => { displayNameRef.current = displayName }, [displayName])
  const shouldJoinRef = useRef(shouldJoin)
  useEffect(() => { shouldJoinRef.current = shouldJoin }, [shouldJoin])
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
  // Host-driven ("room vibe") ambient music — viewers follow these.
  const [remoteMusicVolume, setRemoteMusicVolume] = useState(null)
  const [remoteMusicState, setRemoteMusicState] = useState(null)

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
      console.log('ontrack:', event.track.kind, event.streams?.length)
      if (event.track.kind === 'video') {
        // Remote screen video (only viewers receive this). Re-set the stream on
        // unmute — Android frequently delivers the track muted, then unmutes it
        // a moment later, which is when the frames actually start flowing.
        const stream = event.streams?.[0] || new MediaStream([event.track])
        setRemoteStream(stream)
        event.track.onunmute = () => setRemoteStream(stream)
        event.track.onended = () => console.log('video track ended')
      }
      if (event.track.kind === 'audio') {
        // Remote microphone — kept entirely separate from the video element and
        // routed through the shared per-peer audio sink (cleaned up on leave).
        const stream = event.streams?.[0] || new MediaStream([event.track])
        addRemoteAudio(peerId, stream)
      }
    }

    pc.onnegotiationneeded = async () => {
      try {
        pc._makingOffer = true
        const offer = await pc.createOffer()
        offer.sdp = preferH264(offer.sdp)
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

  // --- viewer-to-viewer audio mesh ---
  // These connections carry AUDIO ONLY. Screen video never travels here — that
  // stays on the builder<->viewer connections above. Uses explicit offers (no
  // onnegotiationneeded) plus perfect-negotiation guards for mid-session glare.
  const createViewerPeerConnection = (peerId, socket) => {
    if (viewerPeerConnections.current[peerId]) return viewerPeerConnections.current[peerId]

    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current, iceCandidatePoolSize: 10 })
    viewerPeerConnections.current[peerId] = pc
    pc._makingOffer = false
    pc._ignoreOffer = false
    // Deterministic, opposite politeness on each side via socket-id comparison.
    const myId = socketRef.current && socketRef.current.id
    pc._polite = !!myId && myId > peerId

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('viewer_ice_candidate', { targetSocketId: peerId, candidate: event.candidate })
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log('viewer ICE (' + peerId + '):', pc.iceConnectionState)
    }

    pc.ontrack = (event) => {
      if (event.track.kind !== 'audio') return   // never render video from a peer viewer
      const stream = (event.streams && event.streams[0]) || new MediaStream([event.track])
      addRemoteAudio(peerId, stream)
    }

    return pc
  }

  const sendViewerOffer = async (pc, peerId, socket, initial) => {
    if (!socket || pc._makingOffer || pc.signalingState !== 'stable') return
    try {
      pc._makingOffer = true
      // Initial offer forces an audio m-line even when we have no mic yet, so
      // we can still receive the peer's audio. Renegotiation offers are plain.
      const offer = await pc.createOffer(
        initial ? { offerToReceiveAudio: true, offerToReceiveVideo: false } : {}
      )
      offer.sdp = preferH264(offer.sdp)
      await pc.setLocalDescription(offer)
      socket.emit('viewer_webrtc_offer', { targetSocketId: peerId, offer: pc.localDescription })
    } catch (e) {
      console.error('viewer offer error:', e)
    } finally {
      pc._makingOffer = false
    }
  }

  // Newcomer initiates the audio connection to an existing viewer.
  const initiateViewerAudio = (peerId, socket) => {
    const pc = createViewerPeerConnection(peerId, socket)
    if (audioStreamRef.current) {
      const track = audioStreamRef.current.getAudioTracks()[0]
      if (track && !pc.getSenders().some(s => s.track && s.track.kind === 'audio')) {
        pc.addTrack(track, audioStreamRef.current)
      }
    }
    sendViewerOffer(pc, peerId, socket, true)
  }

  // Single source of truth for the join payload — reads refs so it is always
  // current regardless of which code path (connect / reconnect / late auth)
  // triggers it.
  const emitJoin = () => {
    const s = socketRef.current
    if (!s) return
    const id = identityRef.current
    s.emit('join_session', {
      sessionId,
      displayName: displayNameRef.current || 'Guest',
      role: role || 'viewer',
      username: id ? id.username : null,
      profilePicture: id ? id.profilePicture : null
    })
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
      // shouldJoinRef (not the captured value) so a reconnect or an auth state
      // that resolved after this handler was registered still joins correctly.
      if (shouldJoinRef.current) emitJoin()
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
        const vpc = viewerPeerConnections.current[user.socketId]
        if (vpc) {
          vpc.close()
          delete viewerPeerConnections.current[user.socketId]
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
        answer.sdp = preferH264(answer.sdp)
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

    // --- viewer-to-viewer audio mesh signaling ---
    socket.on('viewers_in_session', ({ viewerSocketIds }) => {
      if (role === 'builder') return
      if (!Array.isArray(viewerSocketIds)) return
      viewerSocketIds.forEach(peerId => {
        if (!peerId || peerId === socket.id) return
        initiateViewerAudio(peerId, socket)
      })
    })

    socket.on('viewer_webrtc_offer', async ({ from, offer }) => {
      if (role === 'builder') return
      let pc = viewerPeerConnections.current[from]
      if (!pc) pc = createViewerPeerConnection(from, socket)

      const offerCollision = pc._makingOffer || pc.signalingState !== 'stable'
      pc._ignoreOffer = !pc._polite && offerCollision
      if (pc._ignoreOffer) return

      try {
        if (offerCollision) {
          await pc.setLocalDescription({ type: 'rollback' })
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        // Attach our mic (if we have one) now that the offer's transceivers
        // exist, so the answer advertises it without an extra m-line.
        if (audioStreamRef.current) {
          const track = audioStreamRef.current.getAudioTracks()[0]
          if (track && !pc.getSenders().some(s => s.track && s.track.kind === 'audio')) {
            pc.addTrack(track, audioStreamRef.current)
          }
        }
        const answer = await pc.createAnswer()
        answer.sdp = preferH264(answer.sdp)
        await pc.setLocalDescription(answer)
        socket.emit('viewer_webrtc_answer', { targetSocketId: from, answer: pc.localDescription })
      } catch (e) {
        console.error('viewer offer handling error:', e)
      }
    })

    socket.on('viewer_webrtc_answer', async ({ from, answer }) => {
      const pc = viewerPeerConnections.current[from]
      if (!pc) return
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
      } catch (e) {
        console.error('viewer set answer error:', e)
      }
    })

    socket.on('viewer_ice_candidate', async ({ from, candidate }) => {
      const pc = viewerPeerConnections.current[from]
      if (!pc) return
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (e) {
        if (!pc._ignoreOffer) console.error('viewer ICE candidate error:', e)
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

    // Host-controlled ambient music ("room vibe") — broadcast to viewers only.
    socket.on('music_volume_set', ({ volume }) => setRemoteMusicVolume(volume))
    socket.on('music_playing_set', ({ playing, trackIndex }) => setRemoteMusicState({ playing, trackIndex }))

    return () => {
      Object.values(peerConnections.current).forEach(pc => pc.close())
      peerConnections.current = {}
      Object.values(viewerPeerConnections.current).forEach(pc => pc.close())
      viewerPeerConnections.current = {}
      socket.disconnect()
    }
  }, [sessionId])

  useEffect(() => {
    if (shouldJoin && socketRef.current && socketRef.current.connected) {
      emitJoin()
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
      // Echo cancellation / noise suppression / AGC keep the mic from feeding
      // back the remote audio (and the ambient music) on speaker-phone setups.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        },
        video: false
      })
      audioStreamRef.current = stream
      setMicActive(true)
      setMicMuted(false)

      const track = stream.getAudioTracks()[0]
      // Add the mic track to every existing peer connection (triggers
      // renegotiation on each), and pick up any viewers that were waiting.
      Object.values(peerConnections.current).forEach(pc => {
        // Android needs a short delay before the mic track is attached, or the
        // renegotiated audio m-line can come up dead. Guard against dupes.
        setTimeout(() => {
          try {
            const hasAudio = pc.getSenders().some(s => s.track && s.track.kind === 'audio')
            if (!hasAudio && track) pc.addTrack(track, stream)
          } catch (e) {
            console.warn('addTrack error:', e)
          }
        }, 500)
      })
      // Same for the viewer audio mesh, but here we must offer explicitly
      // (these PCs have no onnegotiationneeded handler).
      Object.entries(viewerPeerConnections.current).forEach(([peerId, pc]) => {
        const alreadySending = pc.getSenders().some(s => s.track && s.track.kind === 'audio')
        if (!alreadySending && track) pc.addTrack(track, stream)
        sendViewerOffer(pc, peerId, socketRef.current, false)
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

  // Builder-only: drive the "room vibe" ambient music for every viewer. The
  // audio itself still plays locally on each device (never over WebRTC); these
  // just sync volume and play/track state via the socket.
  const hostSetMusicVolume = (volume) => {
    if (socketRef.current) socketRef.current.emit('host_set_music_volume', { sessionId, volume })
  }
  const hostSetMusicPlaying = (playing, trackIndex) => {
    if (socketRef.current) socketRef.current.emit('host_set_music_playing', { sessionId, playing, trackIndex })
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
    mutedByHost,
    // host-controlled ambient music ("room vibe")
    remoteMusicVolume,
    remoteMusicState,
    hostSetMusicVolume,
    hostSetMusicPlaying
  }
}
