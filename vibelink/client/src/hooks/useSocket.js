import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

export function useSocket(sessionId, displayName, role, shouldJoin) {
  const socketRef = useRef(null)
  const peerConnections = useRef({})
  const localStreamRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [viewers, setViewers] = useState([])
  const [connected, setConnected] = useState(false)
  const [remoteStream, setRemoteStream] = useState(null)
  const [sessionPaused, setSessionPaused] = useState(false)

  useEffect(() => {
    if (!sessionId) return

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      transports: ['websocket']
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true);
      if (shouldJoin) {
        socket.emit('join_session', { sessionId, displayName, role });
      }
    });

    socket.on('session_paused', () => setSessionPaused(true));
    socket.on('session_resumed', () => setSessionPaused(false));

    // Add a useEffect that watches shouldJoin - if it becomes true after connect, emit join_session
    // This handles cases where shouldJoin becomes true after the initial socket connection
    useEffect(() => {
      if (shouldJoin && socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('join_session', { sessionId, displayName, role });
      }
    }, [shouldJoin, sessionId, displayName, role]);

    socket.on('chat_message', (msg) => {
      setMessages(prev => [...prev, msg])
    })

    socket.on('viewer_list', (viewerList) => {
      setViewers(viewerList)
    })

    socket.on('user_joined', (user) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        displayName: 'System',
        role: 'system',
        message: user.displayName + ' joined the session',
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
    // WebRTC: Builder side - initiate offer to new viewer
    socket.on('viewer_joined_webrtc', async ({ viewerSocketId }) => {
      console.log('viewer joined, local stream:', localStreamRef.current)
      if (!localStreamRef.current) {
        console.error('No local stream available for WebRTC')
        return
      };
      
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      });
      peerConnections.current[viewerSocketId] = pc;
      
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_ice_candidate', {
            targetSocketId: viewerSocketId,
            candidate: event.candidate
          });
        }
      };
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc_offer', { targetSocketId: viewerSocketId, offer });
    });

    // WebRTC: Viewer side - create answer to builder's offer
    socket.on('webrtc_offer', async ({ from, offer }) => {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      });
      peerConnections.current[from] = pc;
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_ice_candidate', {
            targetSocketId: from,
            candidate: event.candidate
          });
        }
      };
      
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc_answer', { targetSocketId: from, answer });
    });

    // WebRTC: Builder side - receive answer from viewer
    socket.on('webrtc_answer', async ({ from, answer }) => {
      const pc = peerConnections.current[from];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // WebRTC: Both sides - exchange ICE candidates
    socket.on('webrtc_ice_candidate', async ({ from, candidate }) => {
      const pc = peerConnections.current[from];
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

      alert('You have been removed from this session.')
      window.location.href = '/'
    })

    return () => {
      socket.disconnect()
    }
  }, [sessionId])

  const sendMessage = (message) => {
    if (socketRef.current && message.trim()) {
      socketRef.current.emit('chat_message', { sessionId, message })
    }
  }

  const kickViewer = (targetSocketId) => {
    if (socketRef.current) {
      socketRef.current.emit('kick_viewer', { targetSocketId, sessionId })
    }
  }

  const setLocalStream = (stream) => { localStreamRef.current = stream }

  return { messages, viewers, connected, sendMessage, kickViewer, setLocalStream, remoteStream, sessionPaused, socket: socketRef.current }
}