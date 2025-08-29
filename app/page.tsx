'use client';

import { useAuth } from '@/components/AuthProvider';
import { useGameState } from '@/hooks/useGameState';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { user, loading } = useAuth();
  const { connected } = useGameState();
  const router = useRouter();

  const playLocal = () => {
    router.push('/play/local');
  };

  const playOnline = () => {
    router.push('/play/online');
  };


  // Don't show anything while loading to avoid flash
  if (loading) {
    return null;
  }

  // Show sign-in prompt if not authenticated
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">2 Ban 2 Chess</h1>
          <p className="text-foreground-muted mb-8">Chess where you can ban opponent moves</p>
          <a href="/auth/signin" className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
            Sign in to play
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">2 Ban 2 Chess</h1>
        <p className="text-foreground-muted">Playing as {user.username}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-background-secondary p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Play</h2>
            <div className="flex flex-col gap-4 w-full">
              <button
                onClick={playLocal}
                disabled={!connected}
                className="px-6 py-4 bg-gradient-to-b from-background-secondary to-background-tertiary border-2 border-border rounded-lg shadow-2xl hover:shadow-primary/40 transform hover:-translate-y-1 active:translate-y-0 active:shadow-lg transition-all duration-200 font-semibold text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Play Solo (Practice)
              </button>
              <button
                onClick={playOnline}
                disabled={!connected}
                className="px-6 py-4 bg-gradient-to-b from-primary to-primary/80 text-primary-foreground rounded-lg shadow-2xl hover:shadow-primary/40 transform hover:-translate-y-1 active:translate-y-0 active:shadow-lg transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Find Opponent
              </button>
            </div>
			{!connected &&
				<div className="text-center pt-4">
					<div className="loading-spinner mb-4"></div>
					<p className="text-foreground-muted">Connecting to game server...</p>
				</div>
			}
          </div>

          <div className="bg-background-secondary p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4">How to Play</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>Each player gets to ban one of their opponent's moves at the start of the game.</li>
              <li>After the bans, the game proceeds like regular chess.</li>
              <li>The banned moves cannot be played for the entire game.</li>
              <li>Win by checkmate, resignation, or timeout.</li>
            </ol>
          </div>

          <div className="bg-background-secondary p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Rules</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Standard chess rules apply, except for the banned moves.</li>
              <li>You cannot ban a move that would prevent the king from escaping check.</li>
              <li>Bans are permanent and cannot be changed.</li>
            </ul>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-background-secondary p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Live Games</h2>
            <div className="text-center text-foreground-muted py-8">
              <p>(Live games will be displayed here)</p>
            </div>
          </div>
          <div className="bg-background-secondary p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Leaderboard</h2>
            <div className="text-center text-foreground-muted py-8">
              <p>(Leaderboard will be displayed here)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}