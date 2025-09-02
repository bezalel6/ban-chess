"use client";

import { useAuth } from "@/components/AuthProvider";
import { useGameState } from "@/hooks/useGameState";
import { useRouter } from "next/navigation";
import SignInPanel from "@/components/SignInPanel";

export default function HomePage() {
  const { user, loading } = useAuth();
  const { connected } = useGameState();
  const router = useRouter();

  const playLocal = () => {
    router.push("/play/local");
  };

  const playOnline = () => {
    router.push("/play/online");
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
          <p className="text-xl text-foreground-muted">
            Chess where you can ban opponent moves
          </p>
        </div>

        <div className="w-full max-w-md px-4">
          <div className="bg-background-secondary p-6 rounded-xl shadow-lg">
            <h2 className="text-lg font-semibold text-center mb-4">
              Choose how to play
            </h2>
            <SignInPanel compact />
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground max-w-md">
          <p>
            Sign in with your preferred provider to start playing chess with a
            twist - ban your opponent&apos;s moves!
          </p>
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
              className="btn-secondary py-4 text-lg"
            >
              Play Solo (Practice)
            </button>
            <button
              onClick={playOnline}
              disabled={!connected}
              className="btn-primary py-4 text-lg"
            >
              Find Opponent
            </button>
          </div>
          {!connected && (
            <div className="text-center pt-4">
              <div className="loading-spinner mb-4"></div>
              <p className="text-foreground-muted">
                Connecting to game server...
              </p>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-background-secondary p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4">How Ban Chess Works</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                Before EACH move, the opponent must ban one specific
                square-to-square move
              </li>
              <li>
                Example: Black bans e2→e4, then White moves (but not e2→e4)
              </li>
              <li>The ban only affects that single turn</li>
              <li>
                Continue alternating: ban → move → ban → move throughout the
                game
              </li>
              <li>Win by checkmate (including checkmate by ban) or timeout</li>
            </ol>
          </div>

          <div className="bg-background-secondary p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Key Rules</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Bans are mandatory - you MUST ban before opponent moves</li>
              <li>Bans specify exact from→to squares (e.g., e2→e4)</li>
              <li>Each ban is temporary - only for the next move</li>
              <li>
                If a ban leaves opponent in check with no moves = checkmate!
              </li>
              <li>Standard chess rules apply for all moves</li>
            </ul>
          </div>
        </div>

        <div className="bg-background-secondary p-6 rounded-lg shadow-lg text-center">
          <p className="text-lg mb-4">
            Want to learn more about Ban Chess strategy and edge cases?
          </p>
          <button
            onClick={() => router.push("/learn")}
            className="btn-secondary"
          >
            Learn Ban Chess →
          </button>
        </div>
      </div>
    </div>
  );
}
