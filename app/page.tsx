'use client';

import { useAuth } from '@/components/AuthProvider';
import { useGameState } from '@/hooks/useGameState';
import { useRouter } from 'next/navigation';
import SignInPanel from '@/components/SignInPanel';

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
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold">
            <span className="text-lichess-orange-500">Ban</span>
            <span className="text-foreground">Chess</span>
          </h1>
          <p className="text-xl text-foreground-muted">Chess where you can ban opponent moves</p>
        </div>
        
        <div className="w-full max-w-md px-4">
          <div className="bg-background-secondary p-6 rounded-xl shadow-lg">
            <h2 className="text-lg font-semibold text-center mb-4">Choose how to play</h2>
            <SignInPanel compact />
          </div>
        </div>
        
        <div className="text-center text-sm text-muted-foreground max-w-md">
          <p>Sign in with your preferred provider to start playing chess with a twist - ban your opponent&apos;s moves!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">
          <span className="text-lichess-orange-500">Ban</span>
          <span className="text-foreground">Chess</span>
        </h1>
        <p className="text-foreground-muted">Playing as {user.username}</p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
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

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-background-secondary p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4">How to Play</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>Each player gets to ban one of their opponent&apos;s moves at the start of the game.</li>
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
      </div>
    </div>
  );
}