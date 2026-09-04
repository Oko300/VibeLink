import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    {
      urls: [
        'turn:relay1.expressturn.com:3478',
        'turns:relay1.expressturn.com:5349'
      ],
      username: 'efUKOPTOO5LFMKAJCO',
      credential: 'U4zMKD5rfOMsDyMN'
    }
  ],
  iceCandidatePoolSize: 10
};

export function useSocket(sessionId, displayName, role, shouldJoin, addDebug = () => {}) {
  const socketRef = useRef(null)
  const localStreamRef = useRef(null)
  const peerConnections = useRef({})
  const [messages, setMessages] = useState([])
  const [viewers, setViewers] = useState([])
  const [connected, setConnected] = useState(false)
  const [remoteStream, setRemoteStream] = useState(null)
  const [sessionPaused, setSessionPaused] = useState(false)
  const pendingViewers = useRef([])

  // Helper function for WebRTC offer initiation
  const initiateWebRTC = async (viewerSocketId, socket) => {
    console.log("initiateWebRTC called for viewer:", viewerSocketId, "localStream ready:", !!localStreamRef.current)
    if (!localStreamRef.current) return
    const pc = new RTCPeerConnection(ICE_SERVERS)
    peerConnections.current[viewerSocketId] = pc
    localStreamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current)
    })
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc_ice_candidate', { targetSocketId: viewerSocketId, candidate: event.candidate })
      }
    }
    try {
      const offer = await pc.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: false
      })
      await pc.setLocalDescription(offer)
      socket.emit('webrtc_offer', { targetSocketId: viewerSocketId, offer })
    } catch (e) {
      console.error('WebRTC offer error:', e)
    }
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
      console.log('viewer list updated:', list)
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
    })

    socket.on('kicked', () => {
      alert('You have been removed from this session.')
      window.location.href = '/'
    })

    socket.on('session_paused', () => setSessionPaused(true))
    socket.on('session_resumed', () => setSessionPaused(false))

    socket.on('viewer_joined_webrtc', async ({ viewerSocketId }) => {
      if (!localStreamRef.current) {
        pendingViewers.current.push(viewerSocketId)
        return
      }
      await initiateWebRTC(viewerSocketId, socket)
    })

    socket.on('webrtc_offer', async ({ from, offer }) => {
      addDebug('offer received');
      const pc = new RTCPeerConnection(ICE_SERVERS)
      peerConnections.current[from] = pc
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_ice_candidate', { targetSocketId: from, candidate: event.candidate })
        }
      }
      pc.oniceconnectionstatechange = () => {
        addDebug('ICE state: ' + pc.iceConnectionState);
      }
      pc.ontrack = (event) => {
        console.log('VIEWER ontrack fired - track:', event.track.kind, 'streams:', event.streams.length);
        addDebug('ontrack fired: ' + event.track.kind);
        console.log("ontrack fired - streams:", event.streams.length, "track kind:", event.track.kind)
        console.log('ontrack fired, streams:', event.streams)
        console.log('track kind:', event.track.kind)
        if (event.streams && event.streams[0]) {
          console.log('Setting remote stream')
          console.log("setRemoteStream called with:", event.streams[0])
          setRemoteStream(event.streams[0])
          addDebug('remoteStream set');
        } else {
          console.log('No streams in ontrack event, creating new MediaStream')
          const newStream = new MediaStream()
          newStream.addTrack(event.track)
          addDebug('remoteStream set');
          setRemoteStream(newStream)
          console.log("setRemoteStream called with:", newStream)
        }
      }
      try {
        console.log("Viewer received offer, setting remote description")
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        addDebug('remote desc set');
        const answer = await pc.createAnswer()
        addDebug('answer created');
        await pc.setLocalDescription(answer)
        socket.emit('webrtc_answer', { targetSocketId: from, answer })
      } catch (e) {
        console.error('WebRTC answer error:', e)
      }
    })

    socket.on('webrtc_answer', async ({ from, answer }) => {
      const pc = peerConnections.current[from]
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer))
        } catch (e) {
          console.error('WebRTC set answer error:', e)
        }
      }
    })

    socket.on('webrtc_ice_candidate', async ({ from, candidate }) => {
      const pc = peerConnections.current[from]
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (e) {
          console.error('ICE candidate error:', e)
        }
      }
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
    // Now handle any viewers who joined before stream was ready
    pendingViewers.current.forEach(async (viewerSocketId) => {
      await initiateWebRTC(viewerSocketId, socketRef.current)
    })
    pendingViewers.current = []
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
    socket: socketRef.current
  }
}