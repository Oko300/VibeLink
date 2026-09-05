import { useEffect, useRef, useState } from 'react'

// Royalty-free ambient/lofi tracks (direct MP3s, no API key needed).
const TRACKS = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
]

const VOLUME_KEY = 'vibelink_music_volume'

// Personal, local-only background music. This is a plain HTML5 <audio> element:
// it is NEVER routed through WebRTC and adds no socket events — each person
// hears (and controls) their own music independently. Always starts paused.
export default function AmbientPlayer() {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [trackIndex, setTrackIndex] = useState(0)
  const [hidden, setHidden] = useState(false)   // set on load failure
  const [volume, setVolume] = useState(() => {
    try {
      const saved = localStorage.getItem(VOLUME_KEY)
      const n = saved != null ? Number(saved) : 20
      return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 20
    } catch {
      return 20
    }
  })

  // Apply volume to the element in real time.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100
  }, [volume])

  // When the track changes (skip or auto-advance), keep playing the new one.
  // Intentionally depends only on trackIndex so pressing play doesn't double-fire.
  useEffect(() => {
    const audio = audioRef.current
    if (audio && isPlaying) audio.play().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIndex])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.volume = volume / 100
      audio.play().then(() => setIsPlaying(true)).catch(() => {})
    }
  }

  const skip = () => setTrackIndex((i) => (i + 1) % TRACKS.length)
  const handleEnded = () => setTrackIndex((i) => (i + 1) % TRACKS.length)

  const handleVolume = (e) => {
    const v = Number(e.target.value)
    setVolume(v)
    try { localStorage.setItem(VOLUME_KEY, String(v)) } catch { /* ignore */ }
  }

  // Network / decode failure — remove the player silently.
  const handleError = () => setHidden(true)

  if (hidden) return null

  return (
    <div style={styles.bar}>
      <audio
        ref={audioRef}
        src={TRACKS[trackIndex]}
        onEnded={handleEnded}
        onError={handleError}
        preload="none"
      />
      <button
        onClick={togglePlay}
        style={styles.iconBtn}
        title={isPlaying ? 'Pause music' : 'Play music'}
        aria-label={isPlaying ? 'Pause music' : 'Play music'}
      >
        {isPlaying ? '⏸' : '🎵'}
      </button>
      <span style={styles.label}>Lofi Vibes {trackIndex + 1}/{TRACKS.length}</span>
      <input
        type="range"
        min="0"
        max="100"
        value={volume}
        onChange={handleVolume}
        style={styles.slider}
        title="Music volume"
        aria-label="Music volume"
      />
      <button onClick={skip} style={styles.iconBtn} title="Next track" aria-label="Next track">⏭</button>
    </div>
  )
}

const styles = {
  bar: {
    position: 'fixed',
    bottom: '84px',   // clears the chat input on both desktop and mobile
    right: '16px',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#1a1a2e',
    border: '1px solid #2a2a44',
    borderRadius: '999px',
    padding: '6px 12px',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    color: '#e0e0e0',
    userSelect: 'none',
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    color: '#e0e0e0',
    cursor: 'pointer',
    fontSize: '14px',
    lineHeight: 1,
    padding: '2px',
  },
  label: {
    whiteSpace: 'nowrap',
    color: '#a5b4fc',
    fontSize: '12px',
  },
  slider: {
    width: '70px',
    height: '4px',
    accentColor: '#6366f1',
    cursor: 'pointer',
  },
}
