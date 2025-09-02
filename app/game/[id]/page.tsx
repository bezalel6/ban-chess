"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/components/AuthProvider";

interface GamePageProps {
  params: Promise<{ id: string }>;
}

export default function GamePage({ params }: GamePageProps) {
  const router = useRouter();
  const { gameState } = useGameState();
  const { user } = useAuth();

  useEffect(() => {
    async function redirect() {
      const { id: gameId } = await params;

      // Wait a bit for game state to load
      setTimeout(() => {
        if (gameState && user) {
          // Check if user is a player in this game
          if (gameState.players.white?.id === user.userId) {
            router.replace(`/game/${gameId}/white`);
          } else if (gameState.players.black?.id === user.userId) {
            router.replace(`/game/${gameId}/black`);
          } else {
            router.replace(`/game/${gameId}/spectator`);
          }
        } else {
          // Default to spectator if no game state yet
          router.replace(`/game/${gameId}/spectator`);
        }
      }, 500); // Give game state time to load
    }

    redirect();
  }, [params, gameState, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="loading-spinner mb-4"></div>
        <p className="text-foreground-muted">Determining your role...</p>
      </div>
    </div>
  );
}
