import { useEffect, useRef, useState } from 'react'

// Royalty-free ambient/lofi tracks by Kevin MacLeod (incompetech.com), CC BY 4.0.
const TRACKS = [
  {
    name: 'Chill Lofi Vibes 1',
    url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Relaxing%20Piano%20Music.mp3'
  },
  {
    name: 'Chill Lofi Vibes 2',
    url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3'
  },
  {
    name: 'Chill Lofi Vibes 3',
    url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Comfortable%20Mystery.mp3'
  }
]

const VOLUME_KEY = 'vibelink_music_volume'

// Personal, local-only background music (plain HTML5 <audio> — never routed
// through WebRTC, no per-track streaming). The session host can act as a "room
// DJ": their volume / play / track changes are broadcast to viewers over the
// socket (see useSocket), and every viewer still owns their local volume on top.
export default function AmbientPlayer({
  isHost = false,
  remoteMusicVolume,
  remoteMusicState,
  onVolumeChange,
  onPlayingChange,
}) {
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

  // Viewer: follow the host's volume.
  useEffect(() => {
    if (remoteMusicVolume != null && !isHost && audioRef.current) {
      audioRef.current.volume = remoteMusicVolume / 100
      setVolume(remoteMusicVolume)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteMusicVolume])

  // Viewer: follow the host's play state and current track.
  useEffect(() => {
    if (remoteMusicState != null && !isHost && audioRef.current) {
      setTrackIndex(remoteMusicState.trackIndex)
      if (remoteMusicState.playing) {
        setIsPlaying(true)
        audioRef.current.play().catch(() => {})
      } else {
        setIsPlaying(false)
        audioRef.current.pause()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteMusicState])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      if (isHost && onPlayingChange) onPlayingChange(false, trackIndex)
    } else {
      audio.volume = volume / 100
      audio.play().then(() => setIsPlaying(true)).catch(() => {})
      if (isHost && onPlayingChange) onPlayingChange(true, trackIndex)
    }
  }

  const skip = () => {
    const next = (trackIndex + 1) % TRACKS.length
    setTrackIndex(next)
    if (isHost && onPlayingChange) onPlayingChange(true, next)
  }

  const handleEnded = () => setTrackIndex((i) => (i + 1) % TRACKS.length)

  const handleVolume = (e) => {
    const v = Number(e.target.value)
    setVolume(v)
    try { localStorage.setItem(VOLUME_KEY, String(v)) } catch { /* ignore */ }
    if (isHost && onVolumeChange) onVolumeChange(v)
  }

  // Network / decode failure — remove the player silently.
  const handleError = () => setHidden(true)

  if (hidden) return null

  return (
    <div style={styles.wrap}>
      <div style={styles.vibeLabel}>{isHost ? '🎛 Room Vibe' : '🎵 Host Vibe'}</div>
      <div style={styles.bar}>
        <audio
          ref={audioRef}
          src={TRACKS[trackIndex].url}
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
      <div style={{ fontSize: '8px', color: 'var(--clr-text-dim)', textAlign: 'center', marginTop: '2px' }}>
        Music: Kevin MacLeod (incompetech.com) CC BY 4.0
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    position: 'fixed',
    bottom: '16px',   // clears the chat input on both desktop and mobile
    right: '16px',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  vibeLabel: {
    fontSize: '10px',
    fontWeight: 'bold',

    color: 'var(--clr-primary)',
    marginBottom: '3px',
    letterSpacing: '0.02em',
  },
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--clr-bg-alt)',
    border: '1px solid var(--clr-border)',
    borderRadius: '999px',
    padding: '6px 12px',
    boxShadow: 'var(--shadow-lg)',
    fontFamily: 'var(--font-sans)',
    fontSize: '12px',
    color: 'var(--clr-text)',
    userSelect: 'none',
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--clr-text)',
    cursor: 'pointer',
    fontSize: '14px',
    lineHeight: 1,
    padding: '2px',
  },
  label: {
    whiteSpace: 'nowrap',
    color: 'var(--clr-primary)',
    fontSize: '12px',
  },
  slider: {
    width: '70px',
    height: '4px',
    accentColor: 'var(--clr-primary)',
    cursor: 'pointer',
  },
}
