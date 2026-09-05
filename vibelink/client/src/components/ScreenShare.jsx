import React, { useEffect, useRef } from 'react';

export default function ScreenShare({ shouldStart, onStreamReady, onStreamEnd }) {
  const videoRef = useRef(null);
  const currentStream = useRef(null);

  useEffect(() => {
    if (shouldStart && !currentStream.current) {
      const startScreenShare = async () => {
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              cursor: 'always',
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              frameRate: { ideal: 15, max: 30 },
              displaySurface: 'monitor'
            },
            audio: false,
          });
          currentStream.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          onStreamReady(stream);

          stream.getVideoTracks()[0].onended = () => {
            onStreamEnd();
            currentStream.current = null;
          };
        } catch (error) {
          console.error('Error starting screen share:', error);
          onStreamEnd(); // Indicate that stream didn't start or failed
        }
      };
      startScreenShare();
    } else if (!shouldStart && currentStream.current) {
      // Stop the stream if shouldStart becomes false
      currentStream.current.getTracks().forEach(track => track.stop());
      currentStream.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [shouldStart, onStreamReady, onStreamEnd]);

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: 'black', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  );
}
