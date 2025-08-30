'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, ChevronLeft, ChevronRight } from 'lucide-react';
import soundManager, {
  eventTypes,
  eventMetadata,
  EventType,
} from '@/lib/sound-manager';
import {
  soundThemes,
  themeMetadata,
  getSoundPath,
  type SoundTheme,
} from '@/lib/sound-themes';
import NothingToSeeHere from './NothingToSeeHere';

// Only include sounds that exist across all themes
const universalSounds = [
  { name: 'Move', file: 'Move' },
  { name: 'Capture', file: 'Capture' },
  { name: 'Check', file: 'Check' },
  { name: 'Victory', file: 'Victory' },
  { name: 'Notify', file: 'GenericNotify' },
  { name: 'Explosion', file: 'Explosion' },
  { name: 'Low Time', file: 'LowTime' },
  { name: 'Challenge', file: 'NewChallenge' },
];

interface CustomSound {
  name: string;
  file: string;
}

export default function SoundCustomizer() {
  const [selectedTheme, setSelectedTheme] = useState<SoundTheme>('standard');
  const [hoveredTheme, setHoveredTheme] = useState<SoundTheme | null>(null);
  const [currentEvent, setCurrentEvent] = useState<EventType>(eventTypes[0]);
  const [mysteryRevealed, setMysteryRevealed] = useState(false);
  const [secretUnlocked, setSecretUnlocked] = useState(false);
  const [currentPage, setCurrentPage] = useState(0); // 0 = main, -1 = secret
  const [yoinkedSounds, setYoinkedSounds] = useState<CustomSound[]>([]);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    // Load saved state
    const savedTheme = localStorage.getItem('selectedSoundTheme') as SoundTheme;
    if (savedTheme && soundThemes.includes(savedTheme)) {
      setSelectedTheme(savedTheme);
    }

    const savedYoinked = localStorage.getItem('yoinkedSounds');
    if (savedYoinked) {
      setYoinkedSounds(JSON.parse(savedYoinked));
    }

    const secretStatus = localStorage.getItem('secretSoundPageUnlocked');
    if (secretStatus === 'true') {
      setSecretUnlocked(true);
    }
  }, []);

  const applyTheme = (theme: SoundTheme) => {
    setSelectedTheme(theme);
    localStorage.setItem('selectedSoundTheme', theme);
    soundManager.applyTheme(theme);
  };

  const playSound = (soundFile: string, theme?: SoundTheme) => {
    const actualTheme = theme || hoveredTheme || selectedTheme;
    const soundPath = getSoundPath(actualTheme, soundFile, 'mp3');
    if (soundPath) {
      const audio = new Audio(soundPath);
      audio.volume = 0.3;
      audio.play().catch(() => {});
    }
  };

  const handleMysteryClick = () => {
    if (!mysteryRevealed) {
      setFlipping(true);
      setTimeout(() => {
        setMysteryRevealed(true);
        setFlipping(false);
      }, 300);
    }
  };

  const handleEasterEggSolve = () => {
    // When they solve the easter egg
    setSecretUnlocked(true);
    localStorage.setItem('secretSoundPageUnlocked', 'true');
  };

  const assignSoundToEvent = (soundFile: string, event?: EventType) => {
    const targetEvent = event || currentEvent;
    const theme = hoveredTheme || selectedTheme;
    const soundPath = getSoundPath(theme, soundFile, 'mp3');
    if (soundPath) {
      soundManager.setEventSound(targetEvent, soundPath);
    }
  };

  // Get theme color class
  const getThemeColorClass = (theme: SoundTheme) => {
    const colors: Record<SoundTheme, string> = {
      standard: 'from-gray-700 to-gray-900',
      futuristic: 'from-blue-700 to-blue-900',
      piano: 'from-purple-700 to-purple-900',
      robot: 'from-cyan-700 to-cyan-900',
      sfx: 'from-orange-700 to-orange-900',
      nes: 'from-red-700 to-red-900',
      lisp: 'from-green-700 to-green-900',
      woodland: 'from-emerald-700 to-emerald-900',
      instrument: 'from-indigo-700 to-indigo-900',
      pirate: 'from-yellow-700 to-yellow-900',
    };
    return colors[theme] || colors.standard;
  };

  const activeTheme = hoveredTheme || selectedTheme;

  return (
    <div className='space-y-6'>
      {/* Navigation */}
      <div className='flex items-center justify-center gap-4'>
        {secretUnlocked && (
          <button
            onClick={() => setCurrentPage(currentPage === 0 ? -1 : 0)}
            className='p-2 rounded-lg bg-background-secondary hover:bg-background-tertiary transition-colors'
          >
            <ChevronLeft className='h-5 w-5' />
          </button>
        )}

        <div className='text-center'>
          <h3 className='text-lg font-semibold'>
            {currentPage === -1 ? 'Yoinkers 2000™' : 'Sound Customization'}
          </h3>
        </div>

        {secretUnlocked && (
          <button
            onClick={() => setCurrentPage(currentPage === -1 ? 0 : -1)}
            className='p-2 rounded-lg bg-background-secondary hover:bg-background-tertiary transition-colors'
          >
            <ChevronRight className='h-5 w-5' />
          </button>
        )}
      </div>

      {currentPage === -1 ? (
        // Secret Yoinkers Page
        <div className='space-y-4'>
          <div className='text-center p-4 bg-red-900/20 border border-red-900/50 rounded-lg'>
            <h2 className='text-2xl font-bold text-red-400 mb-2'>
              Brought to you by the Yoinkers 2000™
            </h2>
          </div>

          <NothingToSeeHere
            onSoundSelect={(soundUrl, soundName) => {
              const newSound = { name: soundName, file: soundUrl };
              const alreadyYoinked = yoinkedSounds.some(
                s => s.file === soundUrl
              );

              if (!alreadyYoinked) {
                const updatedYoinked = [...yoinkedSounds, newSound];
                setYoinkedSounds(updatedYoinked);
                localStorage.setItem(
                  'yoinkedSounds',
                  JSON.stringify(updatedYoinked)
                );
              }

              soundManager.setEventSound(currentEvent, soundUrl);
            }}
          />

          <div className='text-center p-4 text-gray-500'>
            <p className='text-sm'>
              (I&apos;m just kidding chess.com please don&apos;t sue me I am so
              so so so so so poor)
            </p>
          </div>
        </div>
      ) : (
        // Main Sound Page
        <div className='space-y-6'>
          {/* Event Selector */}
          <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3'>
            {eventTypes.map(eventType => {
              const EventIcon = eventMetadata[eventType].icon;
              const isActive = eventType === currentEvent;
              return (
                <button
                  key={eventType}
                  onClick={() => setCurrentEvent(eventType)}
                  className={`p-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-amber-500 text-white scale-105'
                      : 'bg-background-secondary hover:bg-background-tertiary'
                  }`}
                >
                  <EventIcon className='h-5 w-5 mx-auto mb-1' />
                  <div className='text-xs'>{eventMetadata[eventType].name}</div>
                </button>
              );
            })}
          </div>

          {/* Sound Grid - Themed */}
          <div
            className={`p-4 rounded-lg bg-gradient-to-br ${getThemeColorClass(activeTheme)} transition-all duration-300`}
          >
            <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3'>
              {universalSounds.map(sound => (
                <button
                  key={sound.file}
                  onClick={() => assignSoundToEvent(sound.file)}
                  className='relative p-3 bg-black/30 backdrop-blur rounded-lg text-white hover:bg-black/50 transition-all group'
                >
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      playSound(sound.file);
                    }}
                    className='absolute top-2 left-2 p-1 rounded bg-white/10 hover:bg-white/20 transition-colors'
                  >
                    <Volume2 className='h-3 w-3' />
                  </button>

                  <div className='pt-6 text-center'>
                    <div className='text-xs font-medium'>{sound.name}</div>
                    <div className='mt-2 text-[10px] opacity-70'>
                      {activeTheme !== 'standard' &&
                        `${themeMetadata[activeTheme].name} version`}
                    </div>
                  </div>
                </button>
              ))}

              {/* Mystery Card */}
              {!mysteryRevealed ? (
                <button
                  onClick={handleMysteryClick}
                  className={`relative p-3 bg-black/30 backdrop-blur rounded-lg text-white hover:bg-black/50 transition-all ${
                    flipping ? 'animate-spin' : ''
                  }`}
                >
                  <div className='h-full flex items-center justify-center'>
                    <div className='text-3xl'>?</div>
                  </div>
                </button>
              ) : (
                <div className='relative p-3 bg-gradient-to-br from-red-600 to-red-800 rounded-lg text-white'>
                  <div className='text-center'>
                    <div className='text-xs font-bold mb-2'>Easter Egg!</div>
                    <input
                      type='text'
                      placeholder='Password?'
                      className='w-full px-2 py-1 text-xs bg-black/30 rounded'
                      onKeyDown={e => {
                        if (
                          e.key === 'Enter' &&
                          e.currentTarget.value.toLowerCase() === 'yoink'
                        ) {
                          handleEasterEggSolve();
                        }
                      }}
                    />
                    <div className='text-[8px] mt-1 opacity-70'>
                      Hint: rhymes with oink
                    </div>
                  </div>
                </div>
              )}

              {/* Yoinked sounds */}
              {yoinkedSounds.map((sound, idx) => (
                <button
                  key={`yoinked-${idx}`}
                  onClick={() =>
                    soundManager.setEventSound(currentEvent, sound.file)
                  }
                  className='relative p-3 bg-black/30 backdrop-blur rounded-lg text-white hover:bg-black/50 transition-all border-2 border-red-500/50'
                >
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      const audio = new Audio(sound.file);
                      audio.volume = 0.3;
                      audio.play();
                    }}
                    className='absolute top-2 left-2 p-1 rounded bg-white/10 hover:bg-white/20 transition-colors'
                  >
                    <Volume2 className='h-3 w-3' />
                  </button>

                  <div className='pt-6 text-center'>
                    <div className='text-xs font-medium'>{sound.name}</div>
                    <div className='text-[8px] text-red-400 mt-1'>Yoinked!</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Theme Selector at Bottom */}
          <div className='border-t border-border pt-6'>
            <h4 className='text-sm font-semibold mb-3 text-center'>
              Sound Themes
            </h4>
            <div className='grid grid-cols-5 sm:grid-cols-10 gap-2'>
              {soundThemes.map(theme => {
                const meta = themeMetadata[theme];
                const isSelected = theme === selectedTheme;
                const isHovered = theme === hoveredTheme;

                return (
                  <button
                    key={theme}
                    onClick={() => applyTheme(theme)}
                    onMouseEnter={() => setHoveredTheme(theme)}
                    onMouseLeave={() => setHoveredTheme(null)}
                    className={`p-3 rounded-lg transition-all ${
                      isSelected
                        ? 'ring-2 ring-amber-500 scale-110'
                        : isHovered
                          ? 'scale-105'
                          : ''
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${meta.color
                        .replace('bg-', '')
                        .replace(
                          '-600',
                          ''
                        )}-700, ${meta.color.replace('bg-', '').replace('-600', '')}-900)`,
                    }}
                  >
                    <div className='text-white text-center'>
                      <div className='text-[10px] font-bold'>{meta.name}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
