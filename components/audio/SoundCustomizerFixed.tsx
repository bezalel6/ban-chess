'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import useEmblaCarousel from 'embla-carousel-react';
import type { EmblaCarouselType } from 'embla-carousel';

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

export default function SoundCustomizerFixed() {
  const [selectedTheme, setSelectedTheme] = useState<SoundTheme | null>(
    'standard'
  );
  const [wasDeselected, setWasDeselected] = useState(false);
  const [showThemeLabels, setShowThemeLabels] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<EventType>(eventTypes[0]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mysteryRevealed, setMysteryRevealed] = useState(false);
  const [secretUnlocked, setSecretUnlocked] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [soundGridPage, setSoundGridPage] = useState(0);
  const [yoinkedSounds, setYoinkedSounds] = useState<CustomSound[]>([]);
  const [flipping, setFlipping] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Embla carousel setup for events
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, dragFree: true, align: 'center' },
    []
  );

  // Embla carousel setup for themes
  const [themeEmblaRef, themeEmblaApi] = useEmblaCarousel(
    { loop: true, dragFree: true, align: 'center' },
    []
  );

  const onSelect = useCallback((api: EmblaCarouselType) => {
    if (!api) return;
    const idx = api.selectedScrollSnap();
    setCurrentIndex(idx);
    const evt = eventTypes[idx];
    if (evt) setCurrentEvent(evt);
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on('select', () => onSelect(emblaApi));
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi]
  );

  useEffect(() => {
    setMounted(true);

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
    // Toggle off if clicking the same theme
    if (selectedTheme === theme) {
      setSelectedTheme(null);
      setWasDeselected(true);
      localStorage.removeItem('selectedSoundTheme');
    } else {
      setSelectedTheme(theme);
      setWasDeselected(false);
      setMysteryRevealed(false);
      localStorage.setItem('selectedSoundTheme', theme);
      soundManager.applyTheme(theme);
    }
  };

  const playSound = (soundFile: string, theme?: SoundTheme) => {
    const actualTheme = theme || selectedTheme || 'standard';
    const soundPath = getSoundPath(actualTheme, soundFile, 'mp3');
    if (soundPath) {
      const audio = new Audio(soundPath);
      // Use the actual volume from soundManager instead of hardcoded value
      audio.volume = soundManager.getVolume();
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
    setSecretUnlocked(true);
    localStorage.setItem('secretSoundPageUnlocked', 'true');
  };

  const assignSoundToEvent = (soundFile: string, event?: EventType) => {
    const targetEvent = event || currentEvent;
    const theme = selectedTheme || 'standard';
    const soundPath = getSoundPath(theme, soundFile, 'mp3');
    if (soundPath) {
      soundManager.setEventSound(targetEvent, soundPath);
    }
  };

  const getThemeColorClass = (theme: SoundTheme | null) => {
    if (!theme) return 'from-gray-700 to-gray-900';
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

  if (!mounted) {
    return (
      <div className='space-y-6 animate-pulse h-96 bg-background-secondary rounded-lg' />
    );
  }

  return (
    <div className='space-y-6'>
      {/* Simple header without navigation controls */}
      <div className='flex items-center justify-center mb-4'>
        <div className='text-center px-8'>
          <h3 className='text-xl font-bold tracking-wide'>
            {currentPage === -1
              ? '🎭 Yoinkers 2000™'
              : '🎵 Sound Customization'}
          </h3>
        </div>
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
              setCurrentPage(0); // Go back to main page
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
          {/* Event Carousel - Restored from original */}
          <section aria-label='Select game event to map a sound'>
            <div className='relative py-2'>
              <div className='pointer-events-none absolute top-2 bottom-2 left-0 w-20 bg-gradient-to-r from-background to-transparent z-10' />
              <div className='pointer-events-none absolute top-2 bottom-2 right-0 w-20 bg-gradient-to-l from-background to-transparent z-10' />

              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  aria-label='Previous event'
                  onClick={scrollPrev}
                  className='inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-background-secondary hover:bg-background-tertiary transition-colors'
                >
                  <ChevronLeft className='h-5 w-5' />
                </button>

                <div ref={emblaRef} className='embla grow overflow-hidden py-4'>
                  <div className='embla__container flex touch-pan-y items-center'>
                    {eventTypes.map((eventType, index) => {
                      const EventIcon = eventMetadata[eventType].icon;
                      const isActive = index === currentIndex;
                      return (
                        <div
                          key={eventType}
                          className='embla__slide shrink-0 basis-[184px] px-3 py-2'
                        >
                          <button
                            type='button'
                            onClick={() => scrollTo(index)}
                            className={`w-full p-6 rounded-2xl transition-all duration-300 relative ${
                              isActive
                                ? 'bg-gradient-to-br from-amber-400 to-orange-500 translate-y-1'
                                : 'bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                            }`}
                            style={{
                              boxShadow: isActive
                                ? 'inset 0 4px 10px rgba(0,0,0,0.3), inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.2)'
                                : undefined,
                            }}
                          >
                            <div className='flex flex-col items-center'>
                              <div
                                className={`mb-3 p-3 rounded-full ${isActive ? 'bg-white/20' : 'bg-white/10'}`}
                              >
                                <EventIcon
                                  className={`h-6 w-6 ${isActive ? 'text-white' : 'text-gray-300'}`}
                                />
                              </div>
                              <span
                                className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}
                              >
                                {eventMetadata[eventType].name}
                              </span>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type='button'
                  aria-label='Next event'
                  onClick={scrollNext}
                  className='inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-background-secondary hover:bg-background-tertiary transition-colors'
                >
                  <ChevronRight className='h-5 w-5' />
                </button>
              </div>

              {/* Dots */}
              <div className='mt-4 flex justify-center gap-1.5'>
                {eventTypes.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => scrollTo(i)}
                    className={`rounded-full transition-all duration-300 ${
                      i === currentIndex
                        ? 'bg-amber-500 w-8 h-2 shadow-inner'
                        : 'bg-gray-600 hover:bg-gray-500 w-2 h-2'
                    }`}
                    style={{
                      boxShadow:
                        i === currentIndex
                          ? 'inset 0 1px 3px rgba(0,0,0,0.4)'
                          : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* 3x3 Sound Grid with Pagination */}
          <div
            className={`p-4 rounded-xl bg-gradient-to-br ${getThemeColorClass(selectedTheme)} transition-all duration-300 shadow-xl`}
          >
            {(() => {
              // Calculate available sounds based on theme selection
              const allSounds: Array<{
                name: string;
                file: string;
                isYoinked?: boolean;
                index?: number;
              }> = [
                ...universalSounds,
                ...yoinkedSounds.map((s, i) => ({
                  name: s.name,
                  file: s.file,
                  isYoinked: true,
                  index: universalSounds.length + i,
                })),
              ];

              // For pagination when theme is selected (9 sounds per page)
              const soundsPerPage = selectedTheme ? 9 : 8; // 8 when mystery card is shown
              const totalPages = Math.ceil(allSounds.length / soundsPerPage);
              const currentSounds = allSounds.slice(
                soundGridPage * soundsPerPage,
                (soundGridPage + 1) * soundsPerPage
              );

              return (
                <>
                  <div className='grid grid-cols-3 gap-3 max-w-2xl mx-auto'>
                    {/* Generate 3x3 grid positions */}
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(position => {
                      // Center position (4) is for mystery card when theme was deliberately deselected
                      if (position === 4 && wasDeselected && !selectedTheme) {
                        return !mysteryRevealed ? (
                          <button
                            key='mystery'
                            onClick={handleMysteryClick}
                            className={`aspect-square p-3 bg-black/40 backdrop-blur-sm rounded-lg text-white hover:bg-black/60 transition-all transform hover:scale-105 shadow-lg ${
                              flipping ? 'animate-spin' : 'animate-pulse'
                            }`}
                          >
                            <div className='h-full flex items-center justify-center'>
                              <div className='text-3xl font-bold'>?</div>
                            </div>
                          </button>
                        ) : (
                          <div
                            key='easter-egg'
                            className='aspect-square p-3 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg text-white shadow-lg'
                          >
                            <div className='h-full flex flex-col justify-center items-center'>
                              <div className='text-xl mb-2'>🚗</div>
                              <div className='text-xs font-bold mb-2 text-center leading-tight'>
                                Would you steal
                                <br />a car?
                              </div>
                              <div className='flex gap-2'>
                                <button
                                  onClick={() => {
                                    handleEasterEggSolve();
                                    // Don't immediately change page, just unlock the feature
                                  }}
                                  className='px-3 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-700 rounded transition-all transform hover:scale-105'
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => {
                                    setMysteryRevealed(false);
                                    setFlipping(false);
                                  }}
                                  className='px-3 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-700 rounded transition-all transform hover:scale-105'
                                >
                                  No
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Map grid positions to sound array indices
                      let soundIndex;
                      if (wasDeselected && !selectedTheme) {
                        // When theme deselected: 8 sounds around mystery card at center (position 4)
                        soundIndex = position < 4 ? position : position - 1;
                      } else {
                        // Normal state: all 9 positions show sounds
                        soundIndex = position;
                      }

                      const sound = currentSounds[soundIndex];
                      if (!sound)
                        return (
                          <div
                            key={`empty-${position}`}
                            className='aspect-square'
                          />
                        );

                      return (
                        <div
                          key={`sound-${position}-${sound.file}`}
                          onClick={() => {
                            if (
                              typeof sound.file === 'string' &&
                              sound.file.startsWith('http')
                            ) {
                              // Yoinked sound from chess.com
                              soundManager.setEventSound(
                                currentEvent,
                                sound.file
                              );
                            } else {
                              // Regular theme sound
                              assignSoundToEvent(sound.file);
                            }
                          }}
                          className={`aspect-square relative p-3 bg-black/30 backdrop-blur-sm rounded-lg text-white transition-all group cursor-pointer shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-inner ${
                            sound.isYoinked
                              ? 'border-2 border-red-500/40 shadow-red-500/20'
                              : ''
                          }`}
                        >
                          <div
                            onClick={e => {
                              e.stopPropagation();
                              if (
                                typeof sound.file === 'string' &&
                                sound.file.startsWith('http')
                              ) {
                                const audio = new Audio(sound.file);
                                // Use the actual volume from soundManager
                                audio.volume = soundManager.getVolume();
                                audio.play();
                              } else {
                                playSound(sound.file);
                              }
                            }}
                            className='absolute top-2 left-2 p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-all transform hover:scale-110 cursor-pointer z-10'
                          >
                            <Volume2 className='h-3 w-3' />
                          </div>

                          <div className='h-full flex items-center justify-center'>
                            <div className='text-center'>
                              <div className='text-xs font-semibold'>
                                {sound.name}
                              </div>
                              {sound.isYoinked ? (
                                <div className='text-[8px] text-red-400 mt-1'>
                                  Yoinked!
                                </div>
                              ) : selectedTheme ? (
                                <div className='text-[10px] opacity-70 mt-1'>
                                  {themeMetadata[selectedTheme].name}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  {(totalPages > 1 || secretUnlocked) && (
                    <div className='flex items-center justify-center gap-3 mt-6'>
                      {/* Secret left arrow appears smoothly when unlocked */}
                      {secretUnlocked && (
                        <button
                          onClick={() => setCurrentPage(-1)}
                          className='p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all transform hover:scale-105 animate-fade-in'
                        >
                          <ChevronLeft className='h-5 w-5 text-red-400' />
                        </button>
                      )}

                      {totalPages > 1 && (
                        <>
                          <button
                            onClick={() =>
                              setSoundGridPage(Math.max(0, soundGridPage - 1))
                            }
                            disabled={soundGridPage === 0}
                            className='p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all transform hover:scale-105'
                          >
                            <ChevronLeft className='h-5 w-5' />
                          </button>

                          <div className='flex gap-2 px-3'>
                            {Array.from({ length: totalPages }).map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setSoundGridPage(i)}
                                className={`h-2.5 rounded-full transition-all transform hover:scale-125 ${
                                  i === soundGridPage
                                    ? 'bg-white w-8'
                                    : 'bg-white/50 hover:bg-white/70 w-2.5'
                                }`}
                              />
                            ))}
                          </div>

                          <button
                            onClick={() =>
                              setSoundGridPage(
                                Math.min(totalPages - 1, soundGridPage + 1)
                              )
                            }
                            disabled={soundGridPage === totalPages - 1}
                            className='p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all transform hover:scale-105'
                          >
                            <ChevronRight className='h-5 w-5' />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Theme Carousel at Bottom */}
          <section className='border-t border-border pt-6'>
            <div className='flex items-center justify-between mb-3'>
              <h4 className='text-sm font-semibold'>Sound Themes</h4>
              <div className='flex items-center gap-4'>
                <span className='text-xs text-gray-500'>
                  Click selected to deselect
                </span>
                <button
                  onClick={() => setShowThemeLabels(!showThemeLabels)}
                  className='relative inline-flex h-6 w-11 items-center rounded-full bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2'
                  aria-label='Toggle theme display mode'
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showThemeLabels ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className='relative'>
              <div className='pointer-events-none absolute top-0 bottom-0 left-0 w-20 bg-gradient-to-r from-background to-transparent z-10' />
              <div className='pointer-events-none absolute top-0 bottom-0 right-0 w-20 bg-gradient-to-l from-background to-transparent z-10' />

              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() => themeEmblaApi?.scrollPrev()}
                  className='inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-background-secondary hover:bg-background-tertiary transition-colors'
                >
                  <ChevronLeft className='h-5 w-5' />
                </button>

                <div
                  ref={themeEmblaRef}
                  className='embla grow overflow-hidden py-2'
                >
                  <div className='embla__container flex touch-pan-y items-center'>
                    {soundThemes
                      .filter(theme => theme !== 'pirate')
                      .map(theme => {
                        const meta = themeMetadata[theme];
                        const isSelected = theme === selectedTheme;

                        return (
                          <div
                            key={theme}
                            className='embla__slide shrink-0 basis-[160px] px-2'
                          >
                            <button
                              onClick={() => applyTheme(theme)}
                              className={`w-full p-4 rounded-xl transition-all duration-300 relative ${
                                isSelected
                                  ? 'ring-2 ring-amber-500 translate-y-1 shadow-inner'
                                  : 'shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                              } ${showThemeLabels ? 'bg-gray-700' : meta.color}`}
                              style={{
                                boxShadow: isSelected
                                  ? 'inset 0 4px 8px rgba(0,0,0,0.4), inset 0 2px 4px rgba(0,0,0,0.3)'
                                  : undefined,
                              }}
                            >
                              <div className='text-white text-center'>
                                <div className='text-xl font-bold'>
                                  {meta.name}
                                </div>
                                {showThemeLabels && (
                                  <div className='text-xs mt-1 opacity-70'>
                                    Theme
                                  </div>
                                )}
                              </div>
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <button
                  type='button'
                  onClick={() => themeEmblaApi?.scrollNext()}
                  className='inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-background-secondary hover:bg-background-tertiary transition-colors'
                >
                  <ChevronRight className='h-5 w-5' />
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
