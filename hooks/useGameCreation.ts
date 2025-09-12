"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/contexts/GameContext";

interface GameCreationResult {
  gameId?: string;
  redirect?: string;
  status?: string;
  message?: string;
  error?: string;
}

export function useGameCreation() {
  const router = useRouter();
  const gameStore = useGameStore();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGame = useCallback(async (type: 'solo' | 'online') => {
    setIsCreating(true);
    setError(null);

    try {
      // Create game via HTTP API first
      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create game');
      }

      const result: GameCreationResult = await response.json();

      if (result.gameId && result.redirect) {
        // For solo games, we get an immediate game ID
        // Tell the WebSocket to join this game
        gameStore.joinGame(result.gameId);
        
        // Navigate to the game page
        router.push(result.redirect);
        
      } else if (result.status === 'queued') {
        // For online games, handle matchmaking
        // The WebSocket will handle the queue joining
        gameStore.joinQueue();
        
        // Stay on the current page (which should show matchmaking UI)
        return result;
      }

      return result;
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [router, gameStore]);

  return {
    createGame,
    isCreating,
    error,
  };
}