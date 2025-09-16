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
    <div className="space-y-16 pb-12">
      {/* Hero Section with Interactive Demo */}
      <section className="relative">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-lichess-orange-500">Ban</span>
            <span className="text-foreground">Chess</span>
          </h1>
          <p className="text-xl md:text-2xl text-foreground-muted max-w-3xl mx-auto">
            Chess with a twist: players can ban opponent moves
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
      <section className="max-w-lg mx-auto">
        <div className="text-center space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Practice Button - Warm & Inviting */}
            <button
              onClick={playNow}
              className="group relative bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-5 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative text-lg">Practice</span>
            </button>
            
            {/* Online Button - Bold & Exciting */}
            <button
              onClick={findOpponent}
              disabled={!isReady}
              className="group relative bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-5 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:transform-none disabled:shadow-md"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative text-lg">
                {isReady ? "Play Online" : "Connecting..."}
              </span>
            </button>
          </div>

          {/* Subtle Guest Message */}
          {user?.provider === 'guest' && (
            <p className="text-sm text-foreground-muted/80">
              Playing as guest • 
              <Link href="/auth/signin" className="text-lichess-orange-500 hover:text-lichess-orange-400 transition-colors ml-1">
                Sign in for rankings
              </Link>
            </p>
          )}
        </div>
      </section>

      {/* Quick Rules - Simplified */}
      <section className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-foreground">Quick Rules</h2>
        
        <div className="grid gap-6 text-left">
          <div className="flex items-start gap-4 p-4 rounded-lg bg-background-secondary/50">
            <div className="flex-shrink-0 w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
              <span className="text-red-600 font-bold text-sm">1</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Black bans first</h3>
              <p className="text-foreground-muted text-sm">Black starts by banning one of White&apos;s possible moves</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 p-4 rounded-lg bg-background-secondary/50">
            <div className="flex-shrink-0 w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
              <span className="text-orange-600 font-bold text-sm">2</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Bans expire quickly</h3>
              <p className="text-foreground-muted text-sm">Each ban only lasts for one move</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 p-4 rounded-lg bg-background-secondary/50">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">3</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Alternate actions</h3>
              <p className="text-foreground-muted text-sm">Players alternate between moving and banning</p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Link 
            href="/rules" 
            className="text-lichess-orange-500 hover:text-lichess-orange-400 font-medium inline-flex items-center gap-2 transition-colors"
          >
            Complete Rules
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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