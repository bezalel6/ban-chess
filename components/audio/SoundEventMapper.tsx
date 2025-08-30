'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import soundManager, {
  availableSounds,
  eventTypes,
  eventMetadata,
  EventType,
} from '@/lib/sound-manager';
import SoundMaker from './SoundMaker';
import AntiPiracyCard from '../AntiPiracyCard';
import NothingToSeeHere from './NothingToSeeHere';

/*
  Best-practice upgrades vs. original:
  - Uses Embla Carousel (looping, momentum, touch/keyboard/ARIA) instead of custom rAF logic.
  - Snap-to-center with autoplay pause/resume, keyboard nav, and dots.
  - Strong a11y: roles, aria-controls/labels, focus rings, tab-order.
  - Clean separation of concerns with small subcomponents in one file for easy drop-in.
  - Minimal DOM writes; avoids style thrashing; uses library's transform pipeline.
  - Maintains the same public behavior API: assigns sounds via soundManager, supports custom sounds.
*/
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import type { EmblaCarouselType } from 'embla-carousel';

interface CustomSound {
  name: string;
  file: string;
}

interface AnimationState {
  isAnimating: boolean;
  soundName: string;
  fromPosition?: { x: number; y: number };
}

export default function SoundEventMapperPro() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentEvent, setCurrentEvent] = useState<EventType>(eventTypes[0]);
  const [customSounds, setCustomSounds] = useState<CustomSound[]>([]);
  const [yoinkedSounds, setYoinkedSounds] = useState<CustomSound[]>([]);
  const [openMaker, setOpenMaker] = useState(false);
  const [openYoinker, setOpenYoinker] = useState(false);
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
  }, []);

  // Helper function to get display name for a sound
  const getSoundDisplayName = (soundFile: string | null): string => {
    if (!soundFile) return 'No Sound';

    // Check custom sounds
    const customSound = customSounds.find(s => s.file === soundFile);
    if (customSound) return customSound.name;

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

  // Embla setup
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { dragFree: true, loop: true, align: 'center', skipSnaps: false },
    [Autoplay({ delay: 3000, stopOnInteraction: true })]
  );
  // Sync current index <-> event
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

  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi]
  );

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') scrollPrev();
      if (e.key === 'ArrowRight') scrollNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [scrollPrev, scrollNext]);

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

  // Don't render carousel until client-side to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className='space-y-8 relative'>
        {/* Event Carousel Skeleton - matches exact structure */}
        <section aria-label='Select game event to map a sound'>
          <div className='relative py-2'>
            {/* Gradient edges */}
            <div className='pointer-events-none absolute top-2 bottom-2 left-0 w-20 bg-gradient-to-r from-gray-950 to-transparent z-10' />
            <div className='pointer-events-none absolute top-2 bottom-2 right-0 w-20 bg-gradient-to-l from-gray-950 to-transparent z-10' />

            <div className='flex items-center gap-2'>
              {/* Previous button skeleton */}
              <div className='h-10 w-10 rounded-xl border border-border/50 bg-background-secondary animate-pulse' />

              {/* Carousel skeleton */}
              <div className='grow overflow-hidden py-4'>
                <div className='flex items-center gap-6 justify-center'>
                  {/* Show 3 skeleton cards */}
                  {[1, 2, 3].map(i => (
                    <div key={i} className='w-[184px] px-3 py-2'>
                      <div className='w-full h-[140px] rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse' />
                    </div>
                  ))}
                </div>
              </div>

              {/* Next button skeleton */}
              <div className='h-10 w-10 rounded-xl border border-border/50 bg-background-secondary animate-pulse' />
            </div>

            {/* Dots skeleton */}
            <div className='mt-4 flex justify-center gap-1.5'>
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className='h-2 w-2 rounded-full bg-gray-600 animate-pulse'
                />
              ))}
            </div>
          </div>
        </section>

        {/* Soundboard skeleton */}
        <section className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3'>
          {/* Show skeleton cards for sounds */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className='p-3 bg-gray-900 rounded-lg shadow-md animate-pulse h-[120px]'
            />
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className='space-y-8 relative'>
      {/* Event Carousel */}
      <section aria-label='Select game event to map a sound'>
        <div className='relative py-2'>
          {/* Gradient edges - adjusted for new padding */}
          <div className='pointer-events-none absolute top-2 bottom-2 left-0 w-20 bg-gradient-to-r from-gray-950 to-transparent z-10' />
          <div className='pointer-events-none absolute top-2 bottom-2 right-0 w-20 bg-gradient-to-l from-gray-950 to-transparent z-10' />

          <div className='flex items-center gap-2'>
            <button
              type='button'
              aria-label='Previous event'
              onClick={scrollPrev}
              className='inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-background-secondary hover:bg-background-tertiary focus:outline-none focus:ring-2 focus:ring-amber-500'
            >
              <ChevronLeft className='h-5 w-5' />
            </button>

            <div
              ref={emblaRef}
              className='embla grow overflow-hidden py-4'
              role='region'
              aria-roledescription='carousel'
              aria-label='Event types'
            >
              <div className='embla__container flex touch-pan-y items-center'>
                {eventTypes.map((eventType, index) => {
                  const EventIcon = eventMetadata[eventType].icon;
                  const isActive = index === currentIndex;
                  return (
                    <div
                      key={eventType}
                      className='embla__slide shrink-0 basis-[184px] px-3 py-2'
                      aria-roledescription='slide'
                      aria-label={`${index + 1} of ${eventTypes.length}`}
                    >
                      <button
                        type='button'
                        onClick={() => {
                          scrollTo(index);
                          playEventSound(eventType);
                        }}
                        className={[
                          'w-full p-6 rounded-2xl transition-all duration-300 outline-none relative',
                          isActive
                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-2xl shadow-amber-500/30 scale-105'
                            : 'bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg opacity-80 hover:opacity-100',
                          eventCardGlow === eventType
                            ? 'animate-pulse ring-4 ring-green-400 ring-opacity-75'
                            : '',
                        ].join(' ')}
                        aria-pressed={isActive}
                        aria-label={`Select ${eventMetadata[eventType].name}`}
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
                          <span
                            className={`text-xs mt-1 ${isActive ? 'text-white/70' : 'text-gray-400'}`}
                          >
                            {getSoundDisplayName(eventSoundMap[eventType])}
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
              className='inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-background-secondary hover:bg-background-tertiary focus:outline-none focus:ring-2 focus:ring-amber-500'
            >
              <ChevronRight className='h-5 w-5' />
            </button>
          </div>

          {/* Dots */}
          <div
            className='mt-4 flex justify-center gap-1.5'
            role='tablist'
            aria-label='Event positions'
          >
            {eventTypes.map((_, i) => (
              <button
                key={i}
                role='tab'
                aria-selected={i === currentIndex}
                aria-controls={`event-tab-${i}`}
                onClick={() => scrollTo(i)}
                className={`h-2 w-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  i === currentIndex
                    ? 'bg-amber-500 w-8'
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Soundboard */}
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
                onClick={() => new Audio(sound.file).play()}
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
            {/* Test audio icon in top-left corner */}
            <button
              type='button'
              aria-label={`Preview ${sound.name}`}
              onClick={() => new Audio(sound.file).play()}
              className='absolute top-3 left-3 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500'
            >
              <Volume2 className='h-4 w-4 text-gray-400 hover:text-white' />
            </button>

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

        {/* Yoinked sounds - only show if any exist */}
        {yoinkedSounds.map((sound, idx) => (
          <article
            key={`yoinked-${idx}`}
            className='relative p-3 bg-gray-900 rounded-lg shadow-md text-white hover:shadow-lg transition-shadow border border-red-900/30'
          >
            {/* Test audio icon in top-left corner */}
            <button
              type='button'
              aria-label={`Preview ${sound.name}`}
              onClick={() => new Audio(sound.file).play()}
              className='absolute top-3 left-3 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500'
            >
              <Volume2 className='h-4 w-4 text-gray-400 hover:text-white' />
            </button>

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

        {/* Easter egg card */}
        <AntiPiracyCard
          onPirateFlagClick={() => setOpenYoinker(true)}
          onReset={() => {
            // Clear yoinked sounds when pirate flag is reset
            setYoinkedSounds([]);
            localStorage.removeItem('yoinkedSounds');
          }}
        />
      </section>

      {/* Modal */}
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
                // Set the event sound and update the map
                soundManager.setEventSound(currentEvent, audioUrl);
                setEventSoundMap(soundManager.getEventSoundMap());

                // Trigger animation
                setAnimationState({
                  isAnimating: true,
                  soundName: name,
                  fromPosition: {
                    x: window.innerWidth / 2,
                    y: window.innerHeight / 2,
                  },
                });
                setEventCardGlow(currentEvent);

                setTimeout(() => {
                  setAnimationState({ isAnimating: false, soundName: '' });
                }, 800);

                setTimeout(() => {
                  setEventCardGlow(null);
                }, 1500);

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

      {/* Effect Yoinker 2000 Modal */}
      {openYoinker && (
        <div
          role='dialog'
          aria-modal='true'
          className='fixed inset-0 z-50 flex items-center justify-center p-4'
        >
          <div
            className='absolute inset-0 bg-black/50'
            onClick={() => setOpenYoinker(false)}
          />

          <div className='relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-background-secondary'>
            <div className='sticky top-0 z-20 bg-background-secondary p-6 border-b border-border/50'>
              <div className='flex items-center justify-between'>
                <h2 className='text-xl font-bold'>Additional Sounds</h2>
                <button
                  type='button'
                  aria-label='Close'
                  onClick={() => setOpenYoinker(false)}
                  className='p-2 rounded-lg hover:bg-background-tertiary focus:outline-none focus:ring-2 focus:ring-amber-500'
                >
                  <X className='h-5 w-5' />
                </button>
              </div>
            </div>

            <div className='p-6'>
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
                  setOpenYoinker(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
