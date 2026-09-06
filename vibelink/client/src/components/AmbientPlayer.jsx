import { useState, useRef, useEffect } from 'react';

const TRACKS = [
  { name: 'Lofi Vibes 1', url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3' },
  { name: 'Lofi Vibes 2', url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_8cb3c37bb9.mp3' },
  { name: 'Lofi Vibes 3', url: 'https://cdn.pixabay.com/audio/2022/01/18/audio_d0c6ff1bab.mp3' },
  { name: 'Lofi Vibes 4', url: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3' },
  { name: 'Lofi Vibes 5', url: 'https://cdn.pixabay.com/audio/2022/10/30/audio_946f99f008.mp3' }
];

export default function AmbientPlayer({ isHost = false }) {
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(20);
  const audioRef = useRef(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.src = TRACKS[currentTrack].url;
    audioRef.current.volume = volume / 100;
    audioRef.current.load();
    if (isPlayingRef.current) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [currentTrack]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.volume = volume / 100;
      audioRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  const skipTrack = () => {
    const next = (currentTrack + 1) % TRACKS.length;
    setCurrentTrack(next);
  };

  const handleVolume = (e) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v / 100;
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      right: '16px',
      zIndex: 7000
    }}>
      <div style={{
        fontSize: '10px',
        color: '#2dd4bf',
        textAlign: 'right',
        marginBottom: '4px',
        letterSpacing: '0.06em',
        textTransform: 'uppercase'
      }}>
        {isHost ? '🎛 Room Vibe' : '🎵 Vibe Music'}
      </div>
      <div style={{
        background: '#1a1a1a',
        border: '1px solid rgba(45,212,191,0.4)',
        borderRadius: '32px',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: '200px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}>
        <audio ref={audioRef} playsInline preload="none" />
        <button onClick={togglePlay} style={{
          background: isPlaying ? 'transparent' : '#2dd4bf',
          border: isPlaying ? '1px solid #444' : 'none',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: isPlaying ? '#888' : '#0a0a0a',
          fontSize: '14px',
          flexShrink: 0
        }}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <span style={{ fontSize: '11px', color: '#888', flex: 1, whiteSpace: 'nowrap' }}>
          {TRACKS[currentTrack].name}
        </span>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={handleVolume}
          style={{ width: '60px', accentColor: '#2dd4bf' }}
        />
        <button onClick={skipTrack} style={{
          background: 'none',
          border: 'none',
          color: '#888',
          cursor: 'pointer',
          fontSize: '14px',
          padding: '0'
        }}>
          ⏭
        </button>
      </div>
      <div style={{ fontSize: '8px', color: '#333', textAlign: 'center', marginTop: '2px' }}>
        Music: Kevin MacLeod (incompetech.com) CC BY 4.0
      </div>
    </div>
  );
}