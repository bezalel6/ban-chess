'use client';

import SoundEventMapperWithSecret from '@/components/audio/SoundEventMapperWithSecret';
import ThemeBrowser from '@/components/audio/ThemeBrowser';
import { Volume2, ArrowLeft, VolumeX, Info } from 'lucide-react';
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
      soundManager.setVolume(volume / 100);
    } else {
      // Initialize from soundManager's current volume
      const currentVolume = soundManager.getVolume();
      setGlobalVolume(Math.round(currentVolume * 100));
    }

    if (savedMuted === 'true') {
      setIsMuted(true);
      soundManager.setEnabled(false);
    } else {
      setIsMuted(false);
      soundManager.setEnabled(true);
    }
  }, []);

  const handleVolumeChange = (value: number) => {
    setGlobalVolume(value);
    // Update soundManager volume in real-time
    if (!isMuted) {
      soundManager.setVolume(value / 100);
    }
  };

  const handleVolumeRelease = () => {
    // Save to localStorage when user releases slider
    localStorage.setItem('globalVolume', globalVolume.toString());

    // Play a test sound
    if (!isMuted) {
      soundManager.playEvent('move');
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem('isMuted', newMuted.toString());

    if (newMuted) {
      soundManager.setEnabled(false);
    } else {
      soundManager.setEnabled(true);
      soundManager.setVolume(globalVolume / 100);
      // Play a test sound when unmuting
      soundManager.playEvent('move');
    }
  };

  return (
    <div className='min-h-screen bg-background'>
      {/* Enhanced Header with Volume Controls */}
      <div className='border-b border-border bg-background-secondary'>
        <div className='flex items-center h-16 px-4 sm:px-6 lg:px-8'>
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
                onChange={e => handleVolumeChange(parseInt(e.target.value))}
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
      <div className='mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4'>
        <div className='space-y-4'>
          {/* Theme Browser */}
          <div className='bg-background-secondary rounded-lg p-4'>
            <ThemeBrowser />
          </div>

          {/* Event Sound Mapping */}
          <div className='bg-background-secondary rounded-lg p-4'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-base font-semibold'>Custom Sound Mapping</h2>
              <button
                onClick={() => {
                  soundManager.resetToDefaults();
                  window.location.reload();
                }}
                className='px-3 py-1.5 bg-background-tertiary hover:bg-background text-sm rounded-lg transition-colors border border-border'
              >
                Reset to Defaults
              </button>
            </div>
            <p className='text-xs text-foreground-muted mb-4'>
              Fine-tune individual sounds for specific game events. Mix and
              match sounds from different themes.
            </p>
            <SoundEventMapperWithSecret />
          </div>
        </div>

        {/* Attribution Footer */}
        <div className='mt-6 pt-4 border-t border-border/50'>
          <div className='flex items-center justify-center gap-2 text-xs text-foreground-muted'>
            <Info className='h-3 w-3' />
            <span>
              Sound effects are from{' '}
              <a
                href='https://lichess.org'
                target='_blank'
                rel='noopener noreferrer'
                className='text-amber-500 hover:text-amber-400 underline decoration-dotted underline-offset-2'
              >
                lichess.org
              </a>
              , the free and open-source chess platform
            </span>
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
