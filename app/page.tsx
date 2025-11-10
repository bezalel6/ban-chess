"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/contexts/GameContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import ActiveGameCard from "@/components/ActiveGameCard";
import InteractiveDemo from "@/components/homepage/InteractiveDemo";
import { useMemo, useEffect, useState } from "react";
import type { SimpleGameState } from "@/lib/game-types";
import Link from "next/link";

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
      gameStore.leaveGame();
    }
  };

  const playNow = () => {
    router.push("/play/practice");
  };

  const findOpponent = () => {
    router.push("/play/online");
  };

  if (loading) {
    return null;
  }

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section with Interactive Demo */}
      <section className="relative">
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-7xl font-bold mb-4">
            <span className="text-lichess-orange-500">Ban</span>
            <span className="text-foreground">Chess</span>
          </h1>
          <p className="text-xl md:text-2xl text-foreground-muted mb-3 max-w-2xl mx-auto">
            Strategic chess where you can block your opponent&apos;s moves
          </p>
          <p className="text-base md:text-lg text-foreground-muted/80 max-w-xl mx-auto">
            Each turn, your opponent first blocks one move you could make, forcing you to adapt your strategy
          </p>
        </div>

        {/* Interactive Demo Board - The Star */}
        <div className="max-w-4xl mx-auto">
          <InteractiveDemo />
        </div>
      </section>

      {/* Active Game Card (if applicable) */}
      {currentGameId && currentGame && !currentGame.gameOver && !isLocalGame && user && (
        <section className="max-w-4xl mx-auto">
          <ActiveGameCard
            gameId={currentGameId}
            gameState={currentGame}
            userId={user.userId}
            onResign={resignGame}
          />
        </section>
      )}

      {/* Play Options - Clear Call to Action */}
      <section className="max-w-md mx-auto">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground mb-4">Ready to play?</h2>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {/* Practice Button - Warm & Inviting */}
            <button
              onClick={playNow}
              className="group relative bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Practice
              </span>
            </button>

            {/* Online Button - Bold & Exciting */}
            <button
              onClick={findOpponent}
              disabled={!isReady}
              className="group relative bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:transform-none disabled:shadow-md"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                {isReady ? "Play Online" : "Connecting..."}
              </span>
            </button>
          </div>

          {/* Subtle Guest Message */}
          {user?.provider === 'guest' && (
            <p className="text-sm text-foreground-muted/70">
              Playing as guest •
              <Link href="/auth/signin" className="text-lichess-orange-500 hover:text-lichess-orange-400 transition-colors ml-1">
                Sign in for rankings
              </Link>
            </p>
          )}
        </div>
      </section>

      {/* Quick Rules - Simplified */}
      <section className="max-w-xl mx-auto">
        <h2 className="text-xl font-semibold text-center mb-6 text-foreground">How it works</h2>

        <div className="grid gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary/30 border border-border/50">
            <div className="flex-shrink-0 w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center">
              <span className="text-red-500 font-bold">1</span>
            </div>
            <p className="text-sm">
              <span className="font-medium text-foreground">Your turn starts</span>
              <span className="text-foreground-muted"> – But first, your opponent blocks one of your moves</span>
            </p>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary/30 border border-border/50">
            <div className="flex-shrink-0 w-8 h-8 bg-orange-500/10 rounded-full flex items-center justify-center">
              <span className="text-orange-500 font-bold">2</span>
            </div>
            <p className="text-sm">
              <span className="font-medium text-foreground">Black starts by blocking</span>
              <span className="text-foreground-muted"> – Black bans a White move before the game begins</span>
            </p>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary/30 border border-border/50">
            <div className="flex-shrink-0 w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center">
              <span className="text-green-500 font-bold">✓</span>
            </div>
            <p className="text-sm">
              <span className="font-medium text-foreground">Checkmate-by-block</span>
              <span className="text-foreground-muted"> – If they&apos;re in check with one escape, block it for checkmate</span>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/rules"
            className="text-lichess-orange-500 hover:text-lichess-orange-400 font-medium inline-flex items-center gap-1 text-sm transition-colors"
          >
            View complete rules
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}

export default function HomePage() {
  return <HomePageContent />;
}