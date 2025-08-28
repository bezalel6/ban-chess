'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { SimpleGameState, SimpleServerMsg, Action } from '@/lib/game-types';
import { useAuth } from '@/components/AuthProvider';
import { wsClient } from '@/lib/ws-client-singleton';

// --- Context Definition ---
interface WebSocketContextType {
  gameState: SimpleGameState | null;
  error: string | null;
  connected: boolean;
  sendAction: (action: Action) => void;
  createSoloGame: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

// --- Provider Component ---
export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  
  const [gameState, setGameState] = useState<SimpleGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(wsClient.getConnectionState() === 'connected');
  const [gameId, setGameId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      return path.startsWith('/game/') ? path.split('/')[2] : null;
    }
    return null;
  });

  useEffect(() => {
    if (!user) return;

    wsClient.connect(user).catch(err => {
      console.error("Failed to connect WebSocket:", err);
      setError("Failed to connect to the server.");
    });

    const unsubscribe = wsClient.subscribe((msg: SimpleServerMsg) => {
      console.log('[Provider] Received:', msg.type, msg);
      switch (msg.type) {
        case 'authenticated':
          setConnected(true);
          if (gameId) {
            wsClient.send({ type: 'join-game', gameId });
          }
          break;
        
        case 'state':
          setGameState(msg);
          break;
        
        case 'joined':
          setGameId(msg.gameId);
          setGameState(prev => ({
            ...prev,
            fen: prev?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 b:ban',
            gameId: msg.gameId,
            players: msg.players,
            playerColor: msg.color,
            isSoloGame: msg.isSoloGame,
          }));
          break;
          
        case 'solo-game-created':
          router.push(`/game/${msg.gameId}`);
          break;
          
        case 'error':
          setError(msg.message);
          break;
      }
    });

    // This handles the case where the connection might drop
    const interval = setInterval(() => {
      setConnected(wsClient.getConnectionState() === 'connected');
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user, router, gameId]);

  const sendAction = useCallback((action: Action) => {
    if (gameId) {
      wsClient.send({ type: 'action', gameId, action });
    } else {
      console.warn('[Provider] Cannot send action: no game ID.');
    }
  }, [gameId]);

  const createSoloGame = useCallback(() => {
    wsClient.send({ type: 'create-solo-game' });
  }, []);

  const value = {
    gameState,
    error,
    connected,
    sendAction,
    createSoloGame,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}