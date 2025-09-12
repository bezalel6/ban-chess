"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/contexts/GameContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import ActiveGameCard from "@/components/ActiveGameCard";
import { useMemo, useEffect, useState } from "react";
import type { SimpleGameState } from "@/lib/game-types";

function HomePageContent() {
  const { user, loading } = useAuth();
  const gameStore = useGameStore();
  const { isReady } = useWebSocket();
  const router = useRouter();
  const [currentGame, setCurrentGame] = useState<SimpleGameState | null>(null);

  // Get current game if any
  useEffect(() => {
    const gameId = gameStore.getCurrentGameId();
    if (gameId) {
      const unsubscribe = gameStore.subscribeToGame(gameId, (state) => {
        setCurrentGame(state);
      });
      return unsubscribe;
    } else {
      setCurrentGame(null);
    }
  }, [gameStore]);

  const currentGameId = currentGame?.gameId;
  const isLocalGame = useMemo(() => {
    if (!currentGame || !currentGame.players) return false;
    return currentGame.players.white?.id === currentGame.players.black?.id;
  }, [currentGame]);

  const resignGame = () => {
    if (currentGameId) {
      // Resign is a special action - we'll need to handle this differently
      // For now, just leave the game which effectively resigns
      gameStore.leaveGame();
    }
  };

  const playOffline = () => {
    router.push("/play/practice");
  };

  const playSolo = () => {
    router.push("/play/solo");
  };

  const playOnline = () => {
    router.push("/play/online");
  };

  if (loading) {
    return null;
  }

  // Now we always have a user (either authenticated or anonymous)

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">
          <span className="text-lichess-orange-500">Ban</span>
          <span className="text-foreground">Chess</span>
        </h1>
        <p className="text-foreground-muted">
          {user?.provider === 'guest' 
            ? 'Playing anonymously' 
            : `Playing as ${user?.username || 'Anonymous'}`}
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {currentGameId && currentGame && !currentGame.gameOver && !isLocalGame && user && (
          <ActiveGameCard
            gameId={currentGameId}
            gameState={currentGame}
            userId={user.userId}
            onResign={resignGame}
          />
        )}

        {(!currentGameId || !currentGame || currentGame.gameOver || isLocalGame) && (
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
                disabled={!isReady}
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
                    disabled={!isReady}
                    className="btn-secondary py-3 text-sm bg-blue-600 hover:bg-blue-700 text-white w-full"
                  >
                    Practice Online (test server flow)
                  </button>
                </div>
              </details>
            </div>
            {!isReady && (
              <div className="text-center pt-4">
                <div className="loading-spinner mb-4"></div>
                <p className="text-foreground-muted">
                  Connecting to game server...
                </p>
              </div>
            )}
          </div>
        )}

        <div className="bg-background-secondary p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">How to Play</h2>
          <div className="space-y-3 text-foreground-muted">
            <p>BanChess adds a unique twist to traditional chess:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong className="text-foreground">Ban Phase:</strong> Before
                each move, ban a square your opponent cannot move to
              </li>
              <li>
                <strong className="text-foreground">Strategic Depth:</strong>{" "}
                Control the board by limiting your opponent&apos;s options
              </li>
              <li>
                <strong className="text-foreground">New Tactics:</strong> Create
                unique checkmate patterns with banned squares
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return <HomePageContent />;
}