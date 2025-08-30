'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Skull,
} from 'lucide-react';
import soundManager, {
  availableSounds,
  eventTypes,
  eventMetadata,
  EventType,
} from '@/lib/sound-manager';
import SoundMaker from './SoundMaker';
import NothingToSeeHere from './NothingToSeeHere';

interface CustomSound {
  name: string;
  file: string;
}

interface AnimationState {
  isAnimating: boolean;
  soundName: string;
  fromPosition?: { x: number; y: number };
}

export default function SoundEventMapperWithSecret() {
  const [currentPage, setCurrentPage] = useState(1); // Start at page 1 (0 is secret)
  const [currentEvent, setCurrentEvent] = useState<EventType>(eventTypes[0]);
  const [customSounds, setCustomSounds] = useState<CustomSound[]>([]);
  const [yoinkedSounds, setYoinkedSounds] = useState<CustomSound[]>([]);
  const [openMaker, setOpenMaker] = useState(false);
  const [showSecretPage, setShowSecretPage] = useState(false);
  const [eventSoundMap, setEventSoundMap] = useState(
    soundManager.getEventSoundMap()
  );
  const [animationState, setAnimationState] = useState<AnimationState>({
    isAnimating: false,
    soundName: '',
  });
  const [eventCardGlow, setEventCardGlow] = useState<EventType | null>(null);
  const [mounted, setMounted] = useState(false);

  // Load yoinked sounds from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const savedYoinked = localStorage.getItem('yoinkedSounds');
    if (savedYoinked) {
      setYoinkedSounds(JSON.parse(savedYoinked));
    }
    // Check if pirate theme is unlocked
    const pirateRevealed = localStorage.getItem('pirateRevealed');
    if (pirateRevealed === 'true') {
      setShowSecretPage(true);
    }
  }, []);

  // Helper function to get display name for a sound
  const getSoundDisplayName = (soundFile: string | null): string => {
    if (!soundFile) return 'No Sound';

    // Check custom sounds
    const customSound = customSounds.find(s => s.file === soundFile);
    if (customSound) return customSound.name;

    // Check yoinked sounds
    const yoinkedSound = yoinkedSounds.find(s => s.file === soundFile);
    if (yoinkedSound) return yoinkedSound.name;

    // Check built-in sounds
    const builtIn = availableSounds.find(s => s.file === soundFile);
    if (builtIn) return builtIn.name;

    // Extract from file path
    const fileName = soundFile
      .split('/')
      .pop()
      ?.replace(/\.(wav|mp3|ogg)$/, '');
    return fileName || 'Custom';
  };

  // Play sound for an event
  const playEventSound = (eventType: EventType) => {
    soundManager.playEvent(eventType);
  };

  const handleAssign = useCallback(
    (soundFile: string | null, soundName: string, event?: React.MouseEvent) => {
      // Get button position for animation start point
      if (event) {
        const rect = (
          event.currentTarget as HTMLElement
        ).getBoundingClientRect();
        setAnimationState({
          isAnimating: true,
          soundName,
          fromPosition: {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          },
        });
      }

      soundManager.setEventSound(currentEvent, soundFile);
      // Update local state to trigger re-render
      setEventSoundMap(soundManager.getEventSoundMap());

      // Trigger glow effect on the event card
      setEventCardGlow(currentEvent);

      // Clear animations after they complete
      setTimeout(() => {
        setAnimationState({ isAnimating: false, soundName: '' });
      }, 800);

      setTimeout(() => {
        setEventCardGlow(null);
      }, 1500);
    },
    [currentEvent]
  );

  const goToPreviousPage = () => {
    if (currentPage === 1 && showSecretPage) {
      // Going to secret page
      setCurrentPage(0);
    } else if (currentPage === 0) {
      // Wrap around from secret to last page
      setCurrentPage(1);
    }
  };

  const goToNextPage = () => {
    if (currentPage === 0) {
      // Going from secret to main page
      setCurrentPage(1);
    } else {
      // Can't go past page 1
      setCurrentPage(1);
    }
  };

  const unlockSecretPage = () => {
    setShowSecretPage(true);
    localStorage.setItem('pirateRevealed', 'true');
    // Dispatch custom event for other components
    window.dispatchEvent(new Event('pirateUnlocked'));
    // Navigate to secret page
    setCurrentPage(0);
  };

  // Don't render until client-side to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className='space-y-8 relative'>
        <div className='h-48 bg-background-secondary rounded-lg animate-pulse' />
        <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3'>
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className='p-3 bg-gray-900 rounded-lg shadow-md animate-pulse h-[120px]'
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-8 relative'>
      {/* Event Carousel */}
      <section aria-label='Select game event to map a sound'>
        <div className='relative py-2'>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              aria-label='Previous event'
              onClick={goToPreviousPage}
              className='inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-background-secondary hover:bg-background-tertiary focus:outline-none focus:ring-2 focus:ring-amber-500'
            >
              <ChevronLeft className='h-5 w-5' />
            </button>

            <div className='grow overflow-hidden py-4'>
              <div className='flex items-center justify-center'>
                {/* Event type selector */}
                <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full max-w-4xl'>
                  {eventTypes.map(eventType => {
                    const EventIcon = eventMetadata[eventType].icon;
                    const isActive = eventType === currentEvent;
                    return (
                      <button
                        key={eventType}
                        type='button'
                        onClick={() => {
                          setCurrentEvent(eventType);
                          playEventSound(eventType);
                        }}
                        className={[
                          'p-4 rounded-xl transition-all duration-300 outline-none relative',
                          isActive
                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg scale-105'
                            : 'bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800',
                          eventCardGlow === eventType
                            ? 'animate-pulse ring-4 ring-green-400 ring-opacity-75'
                            : '',
                        ].join(' ')}
                        aria-pressed={isActive}
                        aria-label={`Select ${eventMetadata[eventType].name}`}
                      >
                        <div className='flex flex-col items-center'>
                          <EventIcon
                            className={`h-5 w-5 mb-2 ${isActive ? 'text-white' : 'text-gray-300'}`}
                          />
                          <span
                            className={`text-xs font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}
                          >
                            {eventMetadata[eventType].name}
                          </span>
                          <span
                            className={`text-[10px] mt-1 ${isActive ? 'text-white/70' : 'text-gray-400'}`}
                          >
                            {getSoundDisplayName(eventSoundMap[eventType])}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              type='button'
              aria-label='Next page'
              onClick={goToNextPage}
              className='inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-background-secondary hover:bg-background-tertiary focus:outline-none focus:ring-2 focus:ring-amber-500'
            >
              <ChevronRight className='h-5 w-5' />
            </button>
          </div>

          {/* Page indicator */}
          <div className='mt-4 flex justify-center gap-2'>
            {showSecretPage && (
              <div
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  currentPage === 0
                    ? 'bg-red-600 w-8'
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
              />
            )}
            <div
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                currentPage === 1
                  ? 'bg-amber-500 w-8'
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
            />
          </div>
        </div>
      </section>

      {/* Page Content */}
      {currentPage === 0 ? (
        // Secret Yoinking Page
        <section className='relative'>
          <div className='mb-4 p-4 bg-red-900/20 border border-red-900/50 rounded-lg'>
            <div className='flex items-center gap-3'>
              <Skull className='h-5 w-5 text-red-500' />
              <div>
                <h3 className='text-sm font-bold text-red-400'>
                  Additional Sound Collection
                </h3>
                <p className='text-xs text-gray-400 mt-1'>
                  These sounds are from chess.com and should be used
                  respectfully.
                </p>
              </div>
              <button
                onClick={() => setCurrentPage(1)}
                className='ml-auto p-2 rounded-lg hover:bg-red-900/30 transition-colors'
              >
                <X className='h-4 w-4 text-red-400' />
              </button>
            </div>
          </div>

          <NothingToSeeHere
            onSoundSelect={(soundUrl, soundName) => {
              // Add to yoinked sounds if not already there
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

              handleAssign(soundUrl, soundName);
            }}
          />
        </section>
      ) : (
        // Main Soundboard Page
        <section
          aria-label='Available sounds'
          className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3'
        >
          {availableSounds.map(sound => (
            <article
              key={sound.file || sound.name}
              className='relative p-3 bg-gray-900 rounded-lg shadow-md text-white hover:shadow-lg transition-shadow'
            >
              {/* Test audio icon in top-left corner */}
              {sound.file && (
                <button
                  type='button'
                  aria-label={`Preview ${sound.name}`}
                  onClick={() => {
                    const audio = new Audio(sound.file);
                    audio.volume = 0.3;
                    audio.play();
                  }}
                  className='absolute top-2 left-2 p-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500'
                >
                  <Volume2 className='h-3 w-3 text-gray-400 hover:text-white' />
                </button>
              )}

              {/* Sound name centered */}
              <div className='flex flex-col items-center pt-5'>
                <span
                  className='text-xs font-medium mb-2 text-center line-clamp-2'
                  title={sound.name}
                >
                  {sound.name}
                </span>

                {/* Single prominent Use button */}
                <button
                  type='button'
                  aria-label={`Use ${sound.name} for ${eventMetadata[currentEvent].name}`}
                  onClick={e => handleAssign(sound.file, sound.name, e)}
                  className='w-full px-2 py-1.5 text-xs rounded bg-amber-500 text-white font-medium hover:bg-amber-600 transform hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500'
                >
                  Use
                </button>
              </div>
            </article>
          ))}

          {/* Create custom */}
          <button
            type='button'
            onClick={() => setOpenMaker(true)}
            className='flex flex-col items-center justify-center p-3 bg-gray-900 rounded-lg shadow-md text-white hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500'
            aria-label='Create custom sound'
          >
            <Plus className='h-5 w-5 mb-1 text-amber-500' />
            <span className='text-xs font-medium'>Create Custom</span>
          </button>

          {/* Custom sounds */}
          {customSounds.map((sound, idx) => (
            <article
              key={`custom-${idx}`}
              className='relative p-3 bg-gray-900 rounded-lg shadow-md text-white hover:shadow-lg transition-shadow'
            >
              <button
                type='button'
                aria-label={`Preview ${sound.name}`}
                onClick={() => {
                  const audio = new Audio(sound.file);
                  audio.volume = 0.3;
                  audio.play();
                }}
                className='absolute top-2 left-2 p-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500'
              >
                <Volume2 className='h-3 w-3 text-gray-400 hover:text-white' />
              </button>

              <div className='flex flex-col items-center pt-5'>
                <span
                  className='text-xs font-medium mb-2 text-center line-clamp-2'
                  title={sound.name}
                >
                  {sound.name}
                </span>

                <button
                  type='button'
                  aria-label={`Use ${sound.name} for ${eventMetadata[currentEvent].name}`}
                  onClick={e => handleAssign(sound.file, sound.name, e)}
                  className='w-full px-2 py-1.5 text-xs rounded bg-amber-500 text-white font-medium hover:bg-amber-600 transform hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500'
                >
                  Use
                </button>
              </div>
            </article>
          ))}

          {/* Yoinked sounds - only show if any exist */}
          {yoinkedSounds.map((sound, idx) => (
            <article
              key={`yoinked-${idx}`}
              className='relative p-3 bg-gray-900 rounded-lg shadow-md text-white hover:shadow-lg transition-shadow border border-red-900/30'
            >
              <button
                type='button'
                aria-label={`Preview ${sound.name}`}
                onClick={() => {
                  const audio = new Audio(sound.file);
                  audio.volume = 0.3;
                  audio.play();
                }}
                className='absolute top-2 left-2 p-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500'
              >
                <Volume2 className='h-3 w-3 text-gray-400 hover:text-white' />
              </button>

              <div className='flex flex-col items-center pt-5'>
                <span
                  className='text-xs font-medium mb-2 text-center line-clamp-2'
                  title={sound.name}
                >
                  {sound.name}
                </span>

                <button
                  type='button'
                  aria-label={`Use ${sound.name} for ${eventMetadata[currentEvent].name}`}
                  onClick={e => handleAssign(sound.file, sound.name, e)}
                  className='w-full px-2 py-1.5 text-xs rounded bg-amber-500 text-white font-medium hover:bg-amber-600 transform hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500'
                >
                  Use
                </button>
              </div>
            </article>
          ))}

          {/* Secret unlock card - only show if not yet unlocked */}
          {!showSecretPage && (
            <button
              type='button'
              onClick={unlockSecretPage}
              className='flex flex-col items-center justify-center p-3 bg-gray-900 rounded-lg shadow-md text-white hover:bg-red-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 border border-transparent hover:border-red-900/50'
              aria-label='Unlock secret sounds'
            >
              <Skull className='h-5 w-5 mb-1 text-gray-600 hover:text-red-500 transition-colors' />
              <span className='text-xs font-medium text-gray-600'>????</span>
            </button>
          )}
        </section>
      )}

      {/* Modal for Sound Maker */}
      {openMaker && (
        <div
          role='dialog'
          aria-modal='true'
          className='fixed inset-0 z-50 flex items-center justify-center p-4'
        >
          <div
            className='absolute inset-0 bg-black/50'
            onClick={() => setOpenMaker(false)}
          />

          <div className='relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-background-secondary p-6'>
            <div className='mb-6 flex items-center justify-between'>
              <h2 className='text-xl font-bold'>Create Custom Sound</h2>
              <button
                type='button'
                aria-label='Close'
                onClick={() => setOpenMaker(false)}
                className='p-2 rounded-lg hover:bg-background-tertiary focus:outline-none focus:ring-2 focus:ring-amber-500'
              >
                <X className='h-5 w-5' />
              </button>
            </div>

            <SoundMaker
              onSoundCreated={audioUrl => {
                const name = `Custom ${customSounds.length + 1}`;
                setCustomSounds(prev => [...prev, { name, file: audioUrl }]);
                handleAssign(audioUrl, name);
                setOpenMaker(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Flying animation overlay */}
      {animationState.isAnimating && animationState.fromPosition && (
        <div
          className='fixed pointer-events-none z-[100]'
          style={{
            left: animationState.fromPosition.x,
            top: animationState.fromPosition.y,
          }}
        >
          <div className='animate-bounce-and-fade bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg'>
            ✓ {animationState.soundName}
          </div>
        </div>
      )}
    </div>
  );
}
