'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import soundManager, {
  availableSounds,
  eventTypes,
  eventMetadata,
  EventType,
} from '@/lib/sound-manager';

export default function SoundEventMapper() {
  const [currentEvent, setCurrentEvent] = useState<EventType>('game-start');

  const handleAssign = (soundFile: string | null) => {
    soundManager.setEventSound(currentEvent, soundFile);
  };

  return (
    <div className='space-y-8'>
      {/* 3D Event Carousel */}
      <div className='flex gap-6 overflow-x-auto snap-x snap-mandatory perspective-[1000px] pb-4'>
        {eventTypes.map(eventType => {
          const EventIcon = eventMetadata[eventType].icon;
          const isActive = eventType === currentEvent;
          return (
            <button
              key={eventType}
              onClick={() => setCurrentEvent(eventType)}
              className={`min-w-[160px] snap-center p-6 rounded-xl text-center transform-gpu transition-transform duration-300
                ${
                  isActive
                    ? 'bg-amber-500 text-white scale-105'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }
                hover:rotate-y-12 hover:translate-z-8`}
            >
              <EventIcon className='h-6 w-6 mx-auto mb-2' />
              <span className='text-sm font-medium'>
                {eventMetadata[eventType].name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Soundboard Grid */}
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6'>
        {availableSounds.map(sound => (
          <div
            key={sound.file || 'none'}
            className='flex flex-col items-center justify-between p-6 bg-gray-900 rounded-xl shadow-md text-white'
          >
            <span className='font-medium mb-4'>{sound.name}</span>
            <div className='flex gap-3'>
              {/* Preview button */}
              <button
                onClick={() => sound.file && new Audio(sound.file).play()}
                className='p-2 rounded-full bg-amber-500 text-white hover:bg-amber-600'
              >
                <Play className='h-4 w-4' />
              </button>
              {/* Assign to current event */}
              <button
                onClick={() => handleAssign(sound.file)}
                className='px-3 py-1 rounded-md bg-gray-700 text-sm hover:bg-gray-600'
              >
                Use
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
