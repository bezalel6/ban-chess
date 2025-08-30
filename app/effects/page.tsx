// app/page.tsx (Next.js 13+ with App Router)
'use client';

import { useRef } from 'react';

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

export default function Home() {
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const playSound = (name: string) => {
    const el = audioRefs.current[name];
    if (el) {
      el.currentTime = 0;
      el.play();
    }
  };

  return (
    <main className='min-h-screen bg-gray-900 text-white p-8'>
      <header className='text-center mb-8'>
        <h1 className='text-4xl font-bold'>Effect Yoinker 2000</h1>
        <p className='text-gray-400'>
          Click any button to play a Chess.com sound
        </p>
      </header>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
        {sounds.map(s => (
          <div
            key={s.name}
            className='flex flex-col items-center bg-gray-800 rounded-xl shadow-md p-4 hover:bg-gray-700 transition'
          >
            <p className='mb-2 font-medium'>{s.name}</p>
            <button
              onClick={() => playSound(s.name)}
              className='px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold'
            >
              Play
            </button>
            <audio
              ref={el => {
                audioRefs.current[s.name] = el;
              }}
              src={s.url}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
