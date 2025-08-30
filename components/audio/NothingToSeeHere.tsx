'use client';

import { useRef, useState, useEffect } from 'react';
import {
  Volume2,
  ChevronLeft,
  ChevronRight,
  TestTube,
  VolumeX,
} from 'lucide-react';
import soundManager from '@/lib/sound-manager';

interface NothingToSeeHereProps {
  onSoundSelect?: (url: string, name: string) => void;
}

type Sound = {
  name: string;
  url: string;
  isTest?: boolean;
};

const sounds: Sound[] = [
  // Volume test sound - placed at the top for easy access
  {
    name: '🔊 Volume Test',
    url: '/recent-pop.wav',
    isTest: true,
  },
  {
    name: 'Ten Seconds',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/tenseconds.mp3',
  },
  {
    name: 'Puzzle Correct 2',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/puzzle-correct-2.mp3',
  },
  {
    name: 'Illegal',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/illegal.mp3',
  },
  {
    name: 'Shoutout',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/shoutout.mp3',
  },
  {
    name: 'Premove',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/premove.mp3',
  },
  {
    name: 'Puzzle Correct',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/puzzle-correct.mp3',
  },
  {
    name: 'Move Self Check',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self-check.mp3',
  },
  {
    name: 'Move Check',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-check.mp3',
  },
  {
    name: 'Incorrect',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/incorrect.mp3',
  },
  {
    name: 'Notification',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/notification.mp3',
  },
  {
    name: 'Lesson Fail',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/lesson-fail.mp3',
  },
  {
    name: 'Event Warning',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/event-warning.mp3',
  },
  {
    name: 'Move Self',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3',
  },
  {
    name: 'Correct',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/correct.mp3',
  },
  {
    name: 'Game End',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-end.mp3',
  },
  {
    name: 'Move Opponent',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-opponent.mp3',
  },
  {
    name: 'Notify',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/notify.mp3',
  },
  {
    name: 'Event End',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/event-end.mp3',
  },
  {
    name: 'Game Start',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-start.mp3',
  },
  {
    name: 'Event Start',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/event-start.mp3',
  },
  {
    name: 'Lesson Pass',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/lesson_pass.mp3',
  },
  {
    name: 'Promote',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/promote.mp3',
  },
  {
    name: 'Achievement',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/achievement.mp3',
  },
  {
    name: 'Game Lose Long',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-lose-long.mp3',
  },
  {
    name: 'Decline',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/decline.mp3',
  },
  {
    name: 'Draw Offer',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/draw-offer.mp3',
  },
  {
    name: 'Game Win Long',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-win-long.mp3',
  },
  {
    name: 'Puzzle Wrong',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/puzzle-wrong.mp3',
  },
  {
    name: 'Game Draw',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-draw.mp3',
  },
  {
    name: 'Scatter',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/scatter.mp3',
  },
  {
    name: 'Game Lose',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-lose.mp3',
  },
  {
    name: 'Capture',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3',
  },
  {
    name: 'Castle',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/castle.mp3',
  },
  {
    name: 'Move Opponent Check',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-opponent-check.mp3',
  },
  {
    name: 'Click',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/click.mp3',
  },
  {
    name: 'Boom',
    url: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/boom.mp3',
  },
  // Pirate theme sounds (exclusive to secret room)
  {
    name: '🏴‍☠️ Pirate Move',
    url: '/sounds/pirate/Move.mp3',
  },
  {
    name: '🏴‍☠️ Pirate Capture',
    url: '/sounds/pirate/Capture.mp3',
  },
  {
    name: '🏴‍☠️ Pirate Check',
    url: '/sounds/pirate/Check.mp3',
  },
  {
    name: '🏴‍☠️ Pirate Victory',
    url: '/sounds/pirate/Victory.mp3',
  },
  {
    name: '🏴‍☠️ Pirate Challenge',
    url: '/sounds/pirate/NewChallenge.mp3',
  },
];

export default function NothingToSeeHere({
  onSoundSelect,
}: NothingToSeeHereProps) {
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [currentVolume, setCurrentVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);

  const soundsPerPage = 12;
  const totalPages = Math.ceil(sounds.length / soundsPerPage);

  const currentSounds = sounds.slice(
    currentPage * soundsPerPage,
    (currentPage + 1) * soundsPerPage
  );

  useEffect(() => {
    // Update volume display when component mounts
    const volume = soundManager.getVolume();
    setCurrentVolume(Math.round(volume * 100));
    setIsMuted(!soundManager.isEnabled());

    // Update on storage changes (when volume is changed elsewhere)
    const handleStorageChange = () => {
      const savedVolume = localStorage.getItem('soundVolume');
      const savedEnabled = localStorage.getItem('soundEnabled');

      if (savedVolume) {
        setCurrentVolume(Math.round(parseFloat(savedVolume) * 100));
      }
      if (savedEnabled) {
        setIsMuted(savedEnabled === 'false');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const playSound = (sound: Sound) => {
    const el = audioRefs.current[sound.name];
    if (el) {
      // Apply current volume from soundManager
      el.volume = soundManager.getVolume();
      el.currentTime = 0;
      el.play().catch(() => {});
    }
  };

  const handleSoundSelect = (sound: Sound) => {
    if (onSoundSelect) {
      onSoundSelect(sound.url, sound.name);
    }
  };

  const nextPage = () => {
    setCurrentPage(prev => (prev + 1) % totalPages);
  };

  const prevPage = () => {
    setCurrentPage(prev => (prev - 1 + totalPages) % totalPages);
  };

  return (
    <div className='space-y-4'>
      {/* Volume display header */}
      <div className='flex items-center justify-between p-3 bg-gray-800 rounded-lg'>
        <div className='flex items-center gap-3'>
          <div className='flex items-center gap-2'>
            {isMuted ? (
              <VolumeX className='h-5 w-5 text-red-500' />
            ) : (
              <Volume2 className='h-5 w-5 text-green-500' />
            )}
            <span className='text-sm font-medium text-gray-300'>
              Current Volume: {isMuted ? 'Muted' : `${currentVolume}%`}
            </span>
          </div>
        </div>
        <div className='text-xs text-gray-500'>
          Test sounds to verify volume control
        </div>
      </div>

      {/* Sound grid - smaller cards */}
      <div className='grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2'>
        {currentSounds.map(sound => (
          <article
            key={sound.name}
            className={`relative p-2 rounded-md shadow-sm text-white hover:shadow-md transition-shadow ${
              sound.isTest
                ? 'bg-gradient-to-br from-blue-900 to-blue-800 ring-2 ring-blue-500'
                : 'bg-gray-800'
            }`}
          >
            {/* Test audio icon in top-left corner */}
            <button
              type='button'
              aria-label={`Preview ${sound.name}`}
              onClick={() => playSound(sound)}
              className='absolute top-1 left-1 p-0.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors'
            >
              {sound.isTest ? (
                <TestTube className='h-2.5 w-2.5 text-blue-400' />
              ) : (
                <Volume2 className='h-2.5 w-2.5 text-gray-400' />
              )}
            </button>

            {/* Sound name and use button */}
            <div className='flex flex-col items-center pt-4'>
              <span
                className='text-[10px] font-medium mb-1 text-center line-clamp-2 h-6'
                title={sound.name}
              >
                {sound.name}
              </span>

              {/* Use button */}
              <button
                type='button'
                aria-label={`Use ${sound.name}`}
                onClick={() => handleSoundSelect(sound)}
                className='w-full px-1 py-0.5 text-[10px] rounded bg-red-600 text-white font-medium hover:bg-red-700 transition-colors'
              >
                Use
              </button>
            </div>

            {/* Hidden audio element */}
            <audio
              ref={el => {
                audioRefs.current[sound.name] = el;
              }}
              src={sound.url}
              preload='none'
            />
          </article>
        ))}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className='flex items-center justify-center gap-4'>
          <button
            onClick={prevPage}
            className='p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors'
            aria-label='Previous page'
          >
            <ChevronLeft className='h-4 w-4' />
          </button>

          <span className='text-xs text-gray-400'>
            Page {currentPage + 1} of {totalPages}
          </span>

          <button
            onClick={nextPage}
            className='p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors'
            aria-label='Next page'
          >
            <ChevronRight className='h-4 w-4' />
          </button>
        </div>
      )}
    </div>
  );
}
