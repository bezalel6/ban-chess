'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function SilenceWidget() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Auto-start on mount
    const audio = audioRef.current;
    if (audio) {
      audio.loop = true;
      audio.volume = 1.0; // Full volume for silence
      // Try to play automatically
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          // Autoplay blocked, user needs to click
          setIsPlaying(false);
        });
    }
  }, []);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(err => {
          console.error('Failed to play silence:', err);
        });
    }
  };

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return null;
  }

  return (
    <div className='fixed bottom-4 left-4 z-50'>
      <button
        onClick={togglePlayback}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg
          transition-all duration-200 shadow-lg
          ${
            isPlaying
              ? 'bg-green-500/90 hover:bg-green-600/90 text-white'
              : 'bg-gray-800/90 hover:bg-gray-700/90 text-gray-300'
          }
        `}
        title={isPlaying ? 'Pause silence loop' : 'Play silence loop'}
      >
        {isPlaying ? (
          <Volume2 className='h-4 w-4' />
        ) : (
          <VolumeX className='h-4 w-4' />
        )}
        <span className='text-sm font-medium'>
          Silence: {isPlaying ? 'Playing' : 'Paused'}
        </span>
      </button>

      <audio ref={audioRef} src='/sounds/Silence.mp3' loop preload='auto' />
    </div>
  );
}
