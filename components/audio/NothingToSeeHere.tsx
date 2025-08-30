'use client';

import { useRef, useState } from 'react';
import { Volume2, ChevronLeft, ChevronRight } from 'lucide-react';

interface NothingToSeeHereProps {
  onSoundSelect?: (url: string, name: string) => void;
}

type Sound = {
  name: string;
  url: string;
};

const sounds: Sound[] = [
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
];

export default function NothingToSeeHere({
  onSoundSelect,
}: NothingToSeeHereProps) {
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const soundsPerPage = 12;
  const totalPages = Math.ceil(sounds.length / soundsPerPage);

  const currentSounds = sounds.slice(
    currentPage * soundsPerPage,
    (currentPage + 1) * soundsPerPage
  );

  const playSound = (sound: Sound) => {
    const el = audioRefs.current[sound.name];
    if (el) {
      el.currentTime = 0;
      el.play();
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
    <div className='space-y-6'>
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
        {currentSounds.map(sound => (
          <article
            key={sound.name}
            className='relative p-4 bg-gray-900 rounded-xl shadow-md text-white hover:shadow-lg transition-shadow'
          >
            {/* Test audio icon in top-left corner */}
            <button
              type='button'
              aria-label={`Preview ${sound.name}`}
              onClick={() => playSound(sound)}
              className='absolute top-2 left-2 p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500'
            >
              <Volume2 className='h-3 w-3 text-gray-400 hover:text-white' />
            </button>

            {/* Sound name centered */}
            <div className='flex flex-col items-center pt-7'>
              <span
                className='text-sm font-medium mb-3 text-center line-clamp-2'
                title={sound.name}
              >
                {sound.name}
              </span>

              {/* Single prominent Use button */}
              <button
                type='button'
                aria-label={`Use ${sound.name}`}
                onClick={() => handleSoundSelect(sound)}
                className='w-full px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transform hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-red-500'
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
            className='p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500'
            aria-label='Previous page'
          >
            <ChevronLeft className='h-5 w-5' />
          </button>

          <span className='text-sm text-gray-400'>
            Page {currentPage + 1} of {totalPages}
          </span>

          <button
            onClick={nextPage}
            className='p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500'
            aria-label='Next page'
          >
            <ChevronRight className='h-5 w-5' />
          </button>
        </div>
      )}
    </div>
  );
}
