"use client";

import { createContext, useContext, ReactNode } from 'react';
import { gameStore } from '@/lib/game/GameStore';
import type { GameStore } from '@/lib/game/GameStore';

interface GameContextValue {
  gameStore: GameStore;
}

const GameContext = createContext<GameContextValue | null>(null);

/**
 * GameProvider following Lichess pattern - single provider at app root.
 * No longer per-page - this eliminates duplicate message processing.
 */
export function GameProvider({ children }: { children: ReactNode }) {
  // Simply provide access to the singleton GameStore
  // All game logic is handled within GameStore
  const value: GameContextValue = {
    gameStore
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

/**
 * Hook to access the game store
 */
export function useGameStore(): GameStore {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameStore must be used within a GameProvider');
  }
  return context.gameStore;
}