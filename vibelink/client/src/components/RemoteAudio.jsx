import { useEffect, useRef } from 'react'

// Hidden <audio> element that plays one peer's microphone stream.
// Kept entirely separate from the screen-share <video> element.
export default function RemoteAudio({ stream }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream
      // Explicit play() in addition to autoPlay — helps on mobile where a
      // late-arriving stream might not auto-start.
      ref.current.play().catch(() => {})
    }
  }, [stream])

  return <audio ref={ref} autoPlay playsInline style={{ display: 'none' }} />
}
