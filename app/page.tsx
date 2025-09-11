"use client";

import { useAuth } from "@/components/AuthProvider";
import { useGame } from "@/contexts/GameContext";
import { useRouter } from "next/navigation";
import { GameProviderWrapper } from "@/components/GameProviderWrapper";
import ActiveGameCard from "@/components/ActiveGameCard";
import { useMemo } from "react";

function HomePageContent() {
  const { user, loading } = useAuth();
  const { manager, gameState, send, connected } = useGame();
  const router = useRouter();

  const currentGameId = gameState?.gameId;
  const isLocalGame = useMemo(() => {
    if (!gameState || !gameState.players) return false;
    return gameState.players.white?.id === gameState.players.black?.id;
  }, [gameState]);

  const resignGame = () => {
    if (currentGameId) {
      send(manager.resignGameMsg(currentGameId));
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

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        {/* ... same as before */}
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
        {currentGameId && gameState && !gameState.gameOver && !isLocalGame && (
          <ActiveGameCard
            gameId={currentGameId}
            gameState={gameState}
            userId={user.userId}
            onResign={resignGame}
          />
        )}

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

        {/* ... same as before */}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <GameProviderWrapper>
      <HomePageContent />
    </GameProviderWrapper>
  );
}