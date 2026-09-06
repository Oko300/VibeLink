import { useEffect, useRef, useState } from 'react'

// Royalty-free ambient/lofi tracks by Kevin MacLeod (incompetech.com), CC BY 4.0.
const TRACKS = [
  { name: 'Lofi Vibes 1', url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3' },
  { name: 'Lofi Vibes 2', url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_8cb3c37bb9.mp3' },
  { name: 'Lofi Vibes 3', url: 'https://cdn.pixabay.com/audio/2022/01/18/audio_d0c6ff1bab.mp3' },
  { name: 'Lofi Vibes 4', url: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3' },
  { name: 'Lofi Vibes 5', url: 'https://cdn.pixabay.com/audio/2022/10/30/audio_946f99f008.mp3' }
];

const VOLUME_KEY = 'vibelink_music_volume'

// Personal, local-only background music (plain HTML5 <audio> — never routed
// through WebRTC, no per-track streaming). The session host can act as a "room
// DJ": their volume / play / track changes are broadcast to viewers over the
// socket (see useSocket), and every viewer still owns their local volume on top.
export default function AmbientPlayer({
  isHost = false,
  socketId = null,
  roomMusic = null,
  musicRemoved = false,
  onPlay,
  onPause,
  onSkip,
  onVolumeChange,
  onRemove
}) {
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(() => {
    try {
      const saved = localStorage.getItem(VOLUME_KEY);
      const n = saved != null ? Number(saved) : 20;
      return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 20;
    } catch {
      return 20;
    }
  });

  const audioRef = useRef(null);

  const canControl = isHost || (roomMusic?.djSocketId === socketId) || !roomMusic?.playing;

  const safePlay = () => {
    if (!audioRef.current) return;
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Play blocked:', err);
        setIsPlaying(false);
      });
    }
  };

  useEffect(() => {
    if (!roomMusic || !audioRef.current) return;

    // sync track
    if (roomMusic.currentTrack !== currentTrack) {
      setCurrentTrack(roomMusic.currentTrack);
      audioRef.current.src = TRACKS[roomMusic.currentTrack].url;
      audioRef.current.load();
    }

    // sync volume
    const vol = (roomMusic.volume ?? 20) / 100;
    audioRef.current.volume = vol;
    setVolume(roomMusic.volume ?? 20);

    // sync play state
    if (roomMusic.playing && !isPlaying) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else if (!roomMusic.playing && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [roomMusic, isPlaying, currentTrack, volume]); // Added isPlaying, currentTrack, volume to dependencies

  useEffect(() => {
    if (musicRemoved && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [musicRemoved]);
  // Apply volume to the element in real time.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100
  }, [volume])

  // When the track changes (skip or auto-advance), keep playing the new one.
  // Intentionally depends only on currentTrack so pressing play doesn't double-fire.
  useEffect(() => {
    if (!audioRef.current) return;
    const wasPlaying = isPlaying;
    audioRef.current.src = TRACKS[currentTrack].url;
    audioRef.current.load();
    if (wasPlaying) {
      audioRef.current.play().catch(err => {
        console.warn('Play after track change failed:', err);
        setIsPlaying(false);
      });
    }
  }, [trackIndex]);

  // Set up error handler for audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onerror = () => {
        console.error('Audio loading error for track:', TRACKS[currentTrack].name);
      };
      audioRef.current.onended = () => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      };
    }
  }, [trackIndex]);

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
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (onPlayingChange) onPlayingChange(false, currentTrack);
    } else {
      audioRef.current.play().catch(err => {
        console.warn('Play failed:', err);
        setIsPlaying(false);
      });
      setIsPlaying(true);
      if (onPlayingChange) onPlayingChange(true, currentTrack);
    }
  }
      setCurrentTrack(remoteMusicState.currentTrack)
      if (remoteMusicState.playing) {
        setIsPlaying(true)
        safePlay()
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
      if (isHost && onPlayingChange) onPlayingChange(false, currentTrack)
    } else {
      {(roomMusic?.djSocketId && roomMusic.djSocketId === socketId) && (
        <div style={{ fontSize: '11px', color: '#2dd4bf', textAlign: 'right', marginBottom: '4px' }}>🎧 You are DJ</div>
      )}
      {(roomMusic?.djSocketId && roomMusic.djSocketId !== socketId) && (
        <div style={{ fontSize: '11px', color: '#2dd4bf', textAlign: 'right', marginBottom: '4px' }}>🎧 Someone is DJ</div>
      )}
      audio.volume = volume / 100
      safePlay()
      if (isHost && onPlayingChange) onPlayingChange(true, currentTrack)
    }
  }





  const handleVolume = (e) => {
    const v = Number(e.target.value)
    setVolume(v)
    try { localStorage.setItem(VOLUME_KEY, String(v)) } catch { /* ignore */ }
    if (isHost && onVolumeChange) onVolumeChange(v)
  }





  return (
    <div style={styles.wrap}>
      <div style={styles.vibeLabel}>{isHost ? '🎛 Room Vibe' : '🎵 Host Vibe'}</div>
      <div style={styles.bar}>
        <audio
          ref={audioRef}
          playsInline={true}
          preload="none"
          crossOrigin="anonymous"

        />
        <button
          onClick={() => {
            if (!canControl) return;
            if (isPlaying) {
              audioRef.current?.pause();
              setIsPlaying(false);
              if (onPause) onPause();
            } else {
              audioRef.current?.play().catch(() => {});
              setIsPlaying(true);
              if (onPlay) onPlay(currentTrack, volume);
            }
          }}
          style={{
            background: isPlaying ? 'transparent' : '#2dd4bf',
            border: isPlaying ? '1px solid #444' : 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isPlaying ? '#888' : '#0a0a0a',
            fontSize: '14px',
            flexShrink: 0,
            opacity: canControl ? 1 : 0.4,
            cursor: canControl ? 'pointer' : 'not-allowed'
          }}
          title={canControl ? (isPlaying ? 'Pause music' : 'Play music') : 'Only the host or DJ can control music'}
          aria-label={isPlaying ? 'Pause music' : 'Play music'}
          disabled={!canControl}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button
          onClick={() => {
            if (!canControl) return;
            const next = (currentTrack + 1) % TRACKS.length;
      {isHost && (
        <button
          onClick={() => { if (onRemove) onRemove(); }}
          style={{
            fontSize: '11px',
            color: '#ef4444',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            marginTop: '4px',
            textAlign: 'right',
            display: 'block'
          }}
        >
          Remove music from room
        </button>
      )}
            if (onSkip) onSkip(next);
          }}
          style={{ ...styles.iconBtn, opacity: canControl ? 1 : 0.4, cursor: canControl ? 'pointer' : 'not-allowed' }}
          title={canControl ? 'Next track' : 'Only the host or DJ can control music'}
          aria-label="Next track"
          disabled={!canControl}
        >⏭</button>
        <span style={styles.label}>Lofi Vibes {currentTrack + 1}/{TRACKS.length}</span>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => {
            const v = Number(e.target.value);
            setVolume(v);
            if (audioRef.current) audioRef.current.volume = v / 100;
            if (canControl && onVolumeChange) onVolumeChange(v);
          }}
          style={{ ...styles.slider, opacity: canControl ? 1 : 0.4, cursor: canControl ? 'pointer' : 'not-allowed' }}
          title={canControl ? 'Music volume' : 'Only the host or DJ can control music'}
          aria-label="Music volume"
          disabled={!canControl}
        />

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
    bottom: '80px',
    right: '16px',
    zIndex: 7000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  vibeLabel: {
    fontSize: '10px',
    color: '#2dd4bf',
    textAlign: 'right',
    marginBottom: '4px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase'
  },
  bar: {
    background: '#1a1a1a',
    border: '1px solid rgba(45,212,191,0.4)',
    borderRadius: '32px',
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: '200px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
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
