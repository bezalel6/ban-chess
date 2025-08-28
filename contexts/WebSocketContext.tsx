'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { SimpleGameState, SimpleServerMsg, Action } from '@/lib/game-types';
import { useAuth } from '@/components/AuthProvider';
import globalWS from '@/lib/global-ws';

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
  const [connected, setConnected] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Connect the global WebSocket
    globalWS.connect(user);

    // Subscribe to messages
    const unsubscribe = globalWS.subscribe((msg: SimpleServerMsg) => {
      console.log('[WSContext] Received:', msg.type);
      
      switch (msg.type) {
        case 'authenticated': {
          setConnected(true);
          // Auto-join game based on current path
          const path = window.location.pathname;
          if (path.startsWith('/game/')) {
            const id = path.split('/')[2];
            setGameId(id);
            globalWS.send({ type: 'join-game', gameId: id });
          }
          break;
        }
        
        case 'state':
          setGameState(msg);
          break;
        
        case 'joined':
          setGameId(msg.gameId);
          setGameState({
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 b:ban',
            gameId: msg.gameId,
            players: msg.players,
            playerColor: msg.color,
            isSoloGame: msg.isSoloGame,
          });
          break;
          
        case 'solo-game-created':
          // Join the game first
          globalWS.send({ type: 'join-game', gameId: msg.gameId });
          setGameId(msg.gameId);
          // Then navigate
          router.push(`/game/${msg.gameId}`);
          break;
          
        case 'error':
          setError(msg.message);
          setTimeout(() => setError(null), 5000);
          break;
      }
    });

    // Update connection status periodically
    const statusInterval = setInterval(() => {
      setConnected(globalWS.getState() === 'connected');
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(statusInterval);
      // Don't disconnect globalWS here - it persists across components
    };
  }, [user, router]);

  const sendAction = useCallback((action: Action) => {
    if (gameId) {
      globalWS.send({ type: 'action', gameId, action });
    } else {
      console.warn('[WSContext] Cannot send action: no game ID');
    }
  }, [gameId]);

  const createSoloGame = useCallback(() => {
    globalWS.send({ type: 'create-solo-game' });
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