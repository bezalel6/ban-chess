'use client';

import SoundEventMapper from '@/components/audio/SoundEventMapper';
import { Volume2, ArrowLeft, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import soundManager from '@/lib/sound-manager';

export default function SoundSettingsPage() {
  const [globalVolume, setGlobalVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // Load saved volume settings ONCE on mount
    const savedVolume = localStorage.getItem('globalVolume');
    const savedMuted = localStorage.getItem('isMuted');

    if (savedVolume) {
      const volume = parseInt(savedVolume);
      setGlobalVolume(volume);
      soundManager.setGlobalVolume(volume / 100);
    }
    if (savedMuted) setIsMuted(savedMuted === 'true');
  }, []);

  const handleVolumeRelease = () => {
    // User released the slider - save and play sound
    localStorage.setItem('globalVolume', globalVolume.toString());
    soundManager.setGlobalVolume(globalVolume / 100);

    // Simple test beep
    if (!isMuted) {
      const audio = new Audio();
      audio.src =
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi2Gy/LTgDQIGGS47OScTw0PVqzn77VeFAg+mdn1wnkpBSx+zPLaizsIGGS56+OeTQ4MW6bj8L5tHgg5k9z1w3IqBSh+yO/ej0ULElyx6OynVBULR6Xf87xnIAYsgsn1048+CRZitur0pmkVCkOf4PK8aB4GM4zU8tGAOAoXY7bs5pFODgtVqOPyvmsfBi+Fz/LWhjgJFmO06+qhVBAKTKPi9bllHwUvg8/y14k7CRVlturmplMMC1Kq4/S7ZiAFLoXO8tWHOwkWZLXr56hTEwxRpuP0u2ccBDaL0/PQfzcIF2a16+ejUBAKUqfj9bxnHwUuhM/y1YY6CRVlturmplQNCVGm4/W7Zh8FLoXO8tWHOwkWZLXr56hTEwxRpuP0u2ccBDaL0/PQfzcIF2a16+ejUBAKUqfj9bxnHwUuhM/y1YY6CRVlturmplQNCVGm4/W7Zh8FLoXO8tWHOwkWZLXr56hTEwxRpuP0u2ccBDaL0/PQfzcIF2a16+ejUBAKUqfj9bxnHwUuhM/y1YY6CRVlturmplQNCVGm4/W7Zh8FLoXO8tWHOwkWZLXr56hTEwxRpuP0u2ccBDaL0/PQfzcIF2a16+ejUBAKUqfj9bxnHwUuhM/y1YY6CRVlturmplQNCVGm4/W7Zh8FLoXO8tWHOwkWZLXr56hTEwxRpuP0u2ccBDCM0/PQfzcIF2a16+ejUBAKUqfj9bxnHwUuhM/y1YY6CRVlturmplQNCVGm4/W7ZiAGLoXO8tWHOwkWZLXr56hTEwxRpuP0u2ccBDaL0/PQfzcIF2a16+ejUBAKUqfj9bxnHwUuhM/y1YY6CRVlturmplQNCVGm4/W7ZiAGLoXO8tWHOwkWZLXr56hTEwxRpuP0u2ccBDaL0/PQfzcIF2a16+ejUBAKUqfj9bxnHwUuhM/y1YY6CRVlturmplQNCVGm4/W7ZiAGLoXO8tWHOwkWZLXr56hTEwxRpuP0u2ccBDaL0/PQfzcIF2a16+ejUBAKUqfj9bxnHwUuhM/y1YY6CRVlturmplQNCVGm4/W7ZiAGLoXO8tWHOwkWZLXr56hTEwxRpuP0u2ccBDaL0/PQfzcIF2a16+ejUBAKUqfj9bxnHwUuhM/y1YY6CRVlturmplQNCVGm4/W7ZiAGLoXO8tWHOwkWZLXr56hTEwxRpuP0u2ccBDaL0/PQfzcIF2a16+ejUBAKUqbj9bxnHwUuhM/y1YY6CRVlturmplQN';
      audio.volume = (globalVolume / 100) * 0.3;
      audio.play().catch(() => {});
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem('isMuted', newMuted.toString());
    soundManager.toggleMute();

    // Play a sound when unmuting to indicate the current volume
    if (!newMuted) {
      const audio = new Audio();
      audio.src =
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi2Gy/LTgDQIGGS47OScTw0PVqzn77VeFAg+mdn1wnkpBSx+zPLaizsIGGS56+OeTQ4MW6bj8L5tHgg5k9z1w3IqBSh+yO/ej0ULElyx6OynVBULR6Xf87xnIAYsgsn1048+CRZitur0pmkVCkOf4PK8aB4GM4zU8tGAOAoXY7bs5pFODgtVqOPyvmsfBi+Fz/LWhjgJFmO06+qhVBAKTKPi9bllHwUvg8/y14k7CRVlturmplMMC1Kq4/S7ZiAFLoXO8tWHOwkWZLXr56hTEwxRpuP0u2ccBDaL0/PQfzcIF2a16+ejUBAKUqfj9bxnHwUuhM/y1YY6CRVlturmplQNCVGm4/W7Zh8FLoXO8tWHOwkWZLXr56hTEwxRpuP0u2ccBDaL0/PQfzcIF2a16+ejUBAKUqfj9bxnHwUuhM/y1YY6CRVlturmplQNCVGm4/W7Zh8FLoXO8tWHOwkWZLXr56hTEwxRpuP0u2ccBDaL0/PQfzcIF2a16+ejUBAKUqfj9bxnHwUuhM/y1YY6CRVlturmplQNCVGm4/W7Zh8FLoXO8tWHOwkWZLXr56hTEwxRpuP0u2ccBDaL0/PQfzcIF2a16+ejUBAKUqfj9bxnHwUuhM/y1YY6CRVlturmplQNCVGm4/W7Zh8FLoXO8tWHOwkWZLXr56hTEwxRpuP0u2ccBDCM0/PQfzcIF2a16+ejUBAKUqfj9bxnHwUuhM/y1YY6CRVlturmplQNCVGm4/W7ZiAGLoXO8tWHOwkWZLXr56hTEwxRpuP0u2ccBDaL0/PQfzcIF2a16+ejUBAKUqfj9bxnHwUuhM/y1YY6CRVlturmplQNCVGm4/W7ZiAGLoXO8tWHOwkWZLXr56hTEwxRpuP0u2ccBDaL0/PQfzcIF2a16+ejUBAKUqfj9bxnHwUuhM/y1YY6CRVlturmplQNCVGm4/W7ZiAGLoXO8tWHOwkWZLXr56hTEwxRpuP0u2ccBDaL0/PQfzcIF2a16+ejUBAKUqfj9bxnHwUuhM/y1YY6CRVlturmplQNCVGm4/W7ZiAGLoXO8tWHOwkWZLXr56hTEwxRpuP0u2ccBDaL0/PQfzcIF2a16+ejUBAKUqfj9bxnHwUuhM/y1YY6CRVlturmplQNCVGm4/W7ZiAGLoXO8tWHOwkWZLXr56hTEwxRpuP0u2ccBDaL0/PQfzcIF2a16+ejUBAKUqbj9bxnHwUuhM/y1YY6CRVlturmplQN';
      audio.volume = (globalVolume / 100) * 0.3;
      audio.play().catch(() => {});
    }
  };

  return (
    <div className='min-h-screen bg-background'>
      {/* Enhanced Header with Volume Controls */}
      <div className='border-b border-border bg-background-secondary'>
        <div className='flex items-center h-20 px-4 sm:px-6 lg:px-8'>
          {/* Left Section - Navigation and Title */}
          <div className='flex items-center gap-4 mr-8'>
            <Link
              href='/'
              className='p-2 hover:bg-background-tertiary rounded-lg transition-colors'
            >
              <ArrowLeft className='h-5 w-5' />
            </Link>
            <div className='flex items-center gap-3'>
              <Volume2 className='h-6 w-6 text-lichess-orange-500' />
              <h1 className='text-2xl font-bold whitespace-nowrap'>
                Sound Settings
              </h1>
            </div>
          </div>

          {/* Center Section - Volume Slider stretching to the right */}
          <div className='flex-1 flex items-center gap-4'>
            <button
              onClick={toggleMute}
              className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                isMuted
                  ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                  : 'bg-background-tertiary hover:bg-background'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className='h-4 w-4' />
              ) : (
                <Volume2 className='h-4 w-4' />
              )}
            </button>

            {/* Volume Slider with Markers */}
            <div className='flex-1 relative'>
              <input
                type='range'
                min='0'
                max='100'
                value={globalVolume}
                onChange={e => setGlobalVolume(parseInt(e.target.value))}
                onMouseUp={handleVolumeRelease}
                onTouchEnd={handleVolumeRelease}
                disabled={isMuted}
                className='w-full h-2 rounded-lg appearance-none cursor-pointer slider relative z-10'
                style={{
                  background: `linear-gradient(to right, #f97316 0%, #f97316 ${globalVolume}%, rgb(61 58 51) ${globalVolume}%, rgb(61 58 51) 100%)`,
                }}
              />
              {/* Subtle markers */}
              <div className='absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none'>
                <div className='w-px h-3 bg-foreground-subtle/30' />
                <div className='w-px h-3 bg-foreground-subtle/30' />
                <div className='w-px h-3 bg-foreground-subtle/30' />
                <div className='w-px h-3 bg-foreground-subtle/30' />
                <div className='w-px h-3 bg-foreground-subtle/30' />
              </div>
              {/* Percentage labels */}
              <div className='absolute inset-x-0 -bottom-5 flex justify-between pointer-events-none'>
                <span className='text-[10px] text-foreground-subtle'>0</span>
                <span className='text-[10px] text-foreground-subtle'>25</span>
                <span className='text-[10px] text-foreground-subtle'>50</span>
                <span className='text-[10px] text-foreground-subtle'>75</span>
                <span className='text-[10px] text-foreground-subtle'>100</span>
              </div>
            </div>

            {/* Right Section - Current Volume */}
            <div className='flex items-center gap-2 text-sm font-medium px-3 py-1 bg-background-tertiary rounded-lg flex-shrink-0 min-w-[80px] justify-center'>
              {isMuted ? (
                <span className='text-red-500'>Muted</span>
              ) : (
                <span>{globalVolume}%</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - More Compact */}
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6'>
        <div className='space-y-6'>
          {/* Event Sound Mapping */}
          <div className='bg-background-secondary rounded-xl p-6'>
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-lg font-semibold'>Event Sound Mapping</h2>
              <button
                onClick={() => {
                  soundManager.resetToDefaults();
                  window.location.reload();
                }}
                className='px-4 py-2 bg-background-tertiary hover:bg-background text-sm rounded-lg transition-colors border border-border'
              >
                Reset to Defaults
              </button>
            </div>
            <p className='text-sm text-foreground-muted mb-6'>
              Customize sounds for different game events. Click an event to
              select it, then choose a sound to assign.
            </p>
            <SoundEventMapper />
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: #f97316;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #161512;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #f97316;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #161512;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .slider:disabled::-webkit-slider-thumb {
          cursor: not-allowed;
        }

        .slider:disabled::-moz-range-thumb {
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
