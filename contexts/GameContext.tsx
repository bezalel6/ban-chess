"use client";

import { createContext, useContext, ReactNode, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/lib/toast/toast-context';
import { ClientGameManager } from '@/lib/client-game-manager';
import { useGameWebSocket } from './WebSocketContext';
import { SimpleGameState, SimpleClientMsg } from '@/lib/game-types';
import { ReadyState } from 'react-use-websocket';

interface GameContextValue {
  manager: ClientGameManager;
  gameState: SimpleGameState | null;
  send: (message: SimpleClientMsg) => void;
  connected: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ gameId, children }: { gameId?: string, children: ReactNode }) {
  const ws = useGameWebSocket();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const manager = useMemo(() => new ClientGameManager(), []);
  const [gameState, setGameState] = useState<SimpleGameState | null>(manager.getGameState());
  const connected = ws.readyState === ReadyState.OPEN && ws.isAuthenticated;

  useEffect(() => {
    const unsubscribe = manager.subscribe(setGameState);
    return unsubscribe;
  }, [manager]);

  useEffect(() => {
    if (ws.lastMessage) {
      try {
        const msg = JSON.parse(ws.lastMessage.data);
        manager.handleMessage(msg, user, router, showToast);
      } catch (e) {
        console.error("Failed to parse WebSocket message", e);
      }
    }
  }, [ws.lastMessage, manager, user, router, showToast]);

  const send = (message: SimpleClientMsg) => {
      ws.sendMessage(JSON.stringify(message));
  }

  useEffect(() => {
    if (gameId && connected) {
      if (gameState?.gameId !== gameId) {
        const timer = setTimeout(() => {
          send(manager.joinGameMsg(gameId));
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [gameId, connected, gameState?.gameId, manager, send]);

  const value = { manager, gameState, send, connected };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}