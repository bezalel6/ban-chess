'use client';

import { useActionState, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from './actions';

const chessUsernames = [
  'KnightRider', 'BishopMaster', 'RookiePlayer', 'PawnStar', 'CheckMate',
  'CastleKing', 'QueenGambit', 'EnPassant', 'ForkMaster', 'PinWizard',
  'Skewer', 'Zugzwang', 'Fianchetto', 'TacticsTitan', 'EndgameExpert',
  'OpeningGuru', 'BlitzKing', 'RapidRook', 'BulletBishop', 'ClassicalKnight'
];

function generateChessUsername() {
  const base = chessUsernames[Math.floor(Math.random() * chessUsernames.length)];
  const number = Math.floor(Math.random() * 999) + 1;
  return `${base}${number}`;
}

export default function SignInPage() {
  const [state, formAction, isPending] = useActionState(signIn, null);
  const [username, setUsername] = useState('');
  const router = useRouter();

  useEffect(() => {
    setUsername(generateChessUsername());
  }, []);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      router.push('/');
    }
  }, [state?.success, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-center">Sign In</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Enter a username to start playing
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-2">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              placeholder="Enter your username"
              required
              autoFocus
              disabled={isPending}
              minLength={2}
              maxLength={20}
            />
          </div>

          {state?.error && (
            <div className="text-sm text-red-500">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}