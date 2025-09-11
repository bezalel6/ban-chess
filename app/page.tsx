"use client";

import { useAuth } from "@/components/AuthProvider";
import { useGameState } from "@/hooks/useGameState";
import { useRouter } from "next/navigation";
import SignInPanel from "@/components/SignInPanel";
import ActiveGameCard from "@/components/ActiveGameCard";

export default function HomePage() {
  const { user, loading } = useAuth();
  const { connected, currentGameId, gameState, resignGame, isLocalGame } = useGameState();
  const router = useRouter();

  const playOffline = () => {
    router.push("/play/practice");
  };

  const playSolo = () => {
    router.push("/play/solo");
  };

  const playOnline = () => {
    router.push("/play/online");
  };

  // Don't show anything while loading to avoid flash
  if (loading) {
    return null;
  }

  // Show sign-in prompt if not authenticated, but still allow local play
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

        <div className="w-full max-w-lg px-4">
          <div className="bg-background-secondary p-8 rounded-xl shadow-lg">
            <h2 className="text-lg font-semibold text-center mb-6">
              Choose how to play
            </h2>
            
            {/* Practice option - no auth required */}
            <button
              onClick={playOffline}
              className="w-full mb-4 px-6 py-3 bg-lichess-green-500 hover:bg-lichess-green-600 text-white rounded-lg transition-colors text-lg font-semibold"
            >
              Start Practice (No Sign-in Required)
            </button>
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-foreground-muted/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-background-secondary text-foreground-muted">
                  Or sign in for online play
                </span>
              </div>
            </div>
            
            <SignInPanel compact />
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground max-w-md">
          <p>
            Practice ban chess locally by playing both sides, or sign in to find online opponents.
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
        {/* Show active game status if player is in a game (but not local games) */}
        {currentGameId && gameState && !gameState.gameOver && !isLocalGame && (
          <ActiveGameCard
            gameId={currentGameId}
            gameState={gameState}
            userId={user.userId}
            onResign={resignGame}
          />
        )}

        {/* Show play options if no active game (or only local game running) */}
        {(!currentGameId || !gameState || gameState.gameOver || isLocalGame) && (
          <div className="bg-background-secondary p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Play</h2>
            <div className="flex flex-col gap-4 w-full">
              <button
                onClick={playOffline}
                className="btn-primary py-4 text-lg bg-lichess-green-500 hover:bg-lichess-green-600 text-white"
              >
                Practice Locally
              </button>
              <button
                onClick={playOnline}
                disabled={!connected}
                className="btn-primary py-4 text-lg"
              >
                Find Online Opponent
              </button>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-foreground-muted hover:text-foreground transition-colors">
                  Test server mode
                </summary>
                <div className="mt-3">
                  <button
                    onClick={playSolo}
                    disabled={!connected}
                    className="btn-secondary py-3 text-sm bg-blue-600 hover:bg-blue-700 text-white w-full"
                  >
                    Practice Online (test server flow)
                  </button>
                </div>
              </details>
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
        )}

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
        </div>
      </div>
    </div>
  );
}
