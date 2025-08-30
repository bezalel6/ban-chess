'use client';

import React, { useState, useEffect } from 'react';
import soundManager, {
  eventMetadata,
  availableSounds,
  eventTypes,
  type EventType,
} from '@/lib/sound-manager';
import {
  X,
  Volume2,
  Play,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';

interface SoundSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SoundSettings({ isOpen, onClose }: SoundSettingsProps) {
  const [eventSoundMap, setEventSoundMap] = useState<
    Record<EventType, string | null>
  >({} as Record<EventType, string | null>);
  const [volume, setVolume] = useState(0.5);
  const [isEnabled, setIsEnabled] = useState(true);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);

  useEffect(() => {
    // Load current settings
    setEventSoundMap(soundManager.getEventSoundMap());
    setVolume(soundManager.getVolume());
    setIsEnabled(soundManager.isEnabled());
  }, [isOpen]);

  // Get current event
  const currentEvent = eventTypes[currentEventIndex];
  const currentEventMeta = eventMetadata[currentEvent];
  const CurrentIcon = currentEventMeta.icon;
  const currentSoundForEvent = eventSoundMap[currentEvent];

  const handleSoundSelect = (soundFile: string | null) => {
    soundManager.setEventSound(currentEvent, soundFile);
    setEventSoundMap(soundManager.getEventSoundMap());

    // Play preview when selecting
    if (soundFile && isEnabled) {
      playPreview(soundFile);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    soundManager.setVolume(newVolume);
  };

  const handleToggleEnabled = () => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    soundManager.setEnabled(newEnabled);
  };

  const playPreview = (soundFile: string | null) => {
    if (soundFile && isEnabled) {
      setPlayingPreview(soundFile);
      const tempSound = new Audio(soundFile);
      tempSound.volume = volume;
      tempSound.play();
      tempSound.addEventListener('ended', () => {
        setPlayingPreview(null);
      });
    }
  };

  const slideToNext = () => {
    setCurrentEventIndex(prev => (prev + 1) % eventTypes.length);
  };

  const slideToPrev = () => {
    setCurrentEventIndex(
      prev => (prev - 1 + eventTypes.length) % eventTypes.length
    );
  };

  const testAllSounds = async () => {
    const uniqueSounds = new Set<string>();
    availableSounds.forEach(sound => {
      if (sound.file) uniqueSounds.add(sound.file);
    });

    const soundsArray = Array.from(uniqueSounds);
    for (let i = 0; i < soundsArray.length; i++) {
      playPreview(soundsArray[i]);
      if (i < soundsArray.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col'>
        {/* Header */}
        <div className='bg-slate-800 p-5 border-b border-slate-700'>
          <div className='flex items-center justify-between'>
            <h2 className='text-2xl font-bold text-white'>Sound Settings</h2>
            <button
              onClick={onClose}
              className='p-2 hover:bg-slate-700 rounded-lg transition-colors'
            >
              <X className='w-5 h-5 text-gray-400' />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className='flex-1 overflow-y-auto p-6 space-y-6'>
          {/* Master Controls */}
          <div className='flex items-center justify-between bg-slate-800 rounded-lg p-4'>
            <div className='flex items-center gap-3'>
              <Volume2 className='w-5 h-5 text-blue-400' />
              <span className='text-white'>Sound Effects</span>
              <button
                onClick={handleToggleEnabled}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  isEnabled ? 'bg-blue-500' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    isEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className='flex items-center gap-3'>
              <span className='text-gray-400'>Volume</span>
              <input
                type='range'
                min='0'
                max='1'
                step='0.05'
                value={volume}
                onChange={handleVolumeChange}
                disabled={!isEnabled}
                className='w-32'
              />
              <span className='text-blue-400 w-12'>
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>

          {/* Sound Grid - Permanent Display */}
          <div className='bg-slate-800 rounded-lg p-4'>
            <h3 className='text-lg font-semibold text-white mb-4'>
              Choose a Sound
            </h3>
            <div className='grid grid-cols-3 md:grid-cols-5 gap-3'>
              {availableSounds.map(sound => {
                const isSelected = currentSoundForEvent === sound.file;
                const isPlaying = playingPreview === sound.file;

                return (
                  <button
                    key={sound.name}
                    onClick={() => handleSoundSelect(sound.file)}
                    disabled={!isEnabled}
                    className={`relative p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'bg-blue-500/20 border-blue-500'
                        : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className='flex flex-col items-center gap-1'>
                      {sound.file ? (
                        <Play
                          className={`w-5 h-5 ${isSelected ? 'text-blue-400' : 'text-gray-400'} ${isPlaying ? 'animate-pulse' : ''}`}
                        />
                      ) : (
                        <X className='w-5 h-5 text-gray-500' />
                      )}
                      <span
                        className={`text-xs ${isSelected ? 'text-blue-300' : 'text-gray-300'}`}
                      >
                        {sound.name}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className='absolute top-1 right-1 w-3 h-3 text-blue-400' />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Event Slider - Simple horizontal slider with arrows */}
          <div className='bg-slate-800 rounded-lg p-4'>
            <h3 className='text-lg font-semibold text-white mb-4'>
              Select Event
            </h3>
            <div className='flex items-center gap-4'>
              {/* Left Arrow */}
              <button
                onClick={slideToPrev}
                className='p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors'
              >
                <ChevronLeft className='w-5 h-5 text-gray-300' />
              </button>

              {/* Event Display */}
              <div className='flex-1 bg-slate-700 rounded-lg p-4'>
                <div className='flex items-center gap-4'>
                  <div className='p-3 bg-slate-600 rounded-lg'>
                    <CurrentIcon className='w-8 h-8 text-blue-400' />
                  </div>
                  <div className='flex-1'>
                    <h4 className='text-lg font-semibold text-white'>
                      {currentEventMeta.name}
                    </h4>
                    <p className='text-sm text-gray-400'>
                      Current:{' '}
                      {currentSoundForEvent
                        ? availableSounds.find(
                            s => s.file === currentSoundForEvent
                          )?.name || 'Custom'
                        : 'No Sound'}
                    </p>
                  </div>
                  <div className='text-right'>
                    <span className='text-xs text-gray-500'>
                      {currentEventIndex + 1} / {eventTypes.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Arrow */}
              <button
                onClick={slideToNext}
                className='p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors'
              >
                <ChevronRight className='w-5 h-5 text-gray-300' />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='bg-slate-800 p-5 border-t border-slate-700'>
          <div className='flex gap-3'>
            <button
              onClick={testAllSounds}
              disabled={!isEnabled}
              className='flex-1 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 rounded-lg transition-colors'
            >
              Test All Sounds
            </button>
            <button
              onClick={onClose}
              className='flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors'
            >
              Save & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
