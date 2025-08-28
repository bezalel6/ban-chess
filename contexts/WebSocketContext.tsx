'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { SimpleGameState, SimpleServerMsg, Action } from '@/lib/game-types';
import { useAuth } from '@/components/AuthProvider';
import { wsConnection } from '@/lib/websocket-singleton-client';
import soundManager from '@/lib/sound-manager';

// --- Context Definition ---
interface WebSocketContextType {
  gameState: SimpleGameState | null;
  error: string | null;
  connected: boolean;
  sendAction: (action: Action) => void;
  createSoloGame: () => void;
  joinQueue: () => void;
  leaveQueue: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function useGameWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useGameWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

// --- Provider Component ---
let providerCount = 0;

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    providerCount++;
    console.log('[WSContext] Provider mounted, count:', providerCount);
    return () => {
      providerCount--;
      console.log('[WSContext] Provider unmounted, count:', providerCount);
    };
  }, []);
  
  const [gameState, setGameState] = useState<SimpleGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const previousFen = useRef<string | null>(null);
  
  // --- Sound Effect Logic ---
  useEffect(() => {
    if (gameState && gameState.fen !== previousFen.current) {
      // Don't play sound on initial load
      if (previousFen.current !== null) {
        const wasCheck = previousFen.current.includes('+');
        const isCheck = gameState.fen.includes('+');
        
        // Simple piece count check for captures
        const prevPieces = (previousFen.current.match(/[prnbqk]/gi) || []).length;
        const currentPieces = (gameState.fen.match(/[prnbqk]/gi) || []).length;

        soundManager.playMoveSound({
          check: !wasCheck && isCheck,
          capture: currentPieces < prevPieces,
          // More complex events like castle would require more detailed move info
        });
      }
      
      if (gameState.gameOver) {
        soundManager.play('game-end');
      }

      previousFen.current = gameState.fen;
    }
  }, [gameState]);

  // Connect and subscribe to singleton
  useEffect(() => {
    if (!user || !user.userId) return;
    
    console.log('[WSContext] Setting up WebSocket for user:', user.username);
    
    // Connect the singleton
    wsConnection.connect({ userId: user.userId, username: user.username });
    
    // Check initial state
    const initialState = wsConnection.getState();
    console.log('[WSContext] Initial state:', initialState);
    if (initialState.connected && initialState.authenticated) {
      setConnected(true);
      // Check if we need to join a game
      const path = window.location.pathname;
      if (path.startsWith('/game/')) {
        const id = path.split('/')[2];
        if (id && id !== gameId) {
          console.log('[WSContext] Auto-joining game on mount:', id);
          setGameId(id);
          wsConnection.send({ type: 'join-game', gameId: id });
        }
      }
    }
    
    // Subscribe to messages
    const unsubscribe = wsConnection.subscribe((msg: SimpleServerMsg) => {
      console.log('[WSContext] Received:', msg.type);
      
      switch (msg.type) {
        case 'authenticated': {
          setConnected(true);
          
          // Auto-join game based on current URL
          const path = window.location.pathname;
          if (path.startsWith('/game/')) {
            const id = path.split('/')[2];
            if (id && id !== gameId) {
              setGameId(id);
              wsConnection.send({ type: 'join-game', gameId: id });
            }
          }
          break;
        }
        
        case 'state':
          setGameState(msg);
          // Check for game over
          if (msg.gameOver) {
            console.log('[WSContext] Game Over:', msg.result);
          }
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
          soundManager.play('game-start');
          break;
          
        case 'solo-game-created':
          // Join the game before navigating
          wsConnection.send({ type: 'join-game', gameId: msg.gameId });
          setGameId(msg.gameId);
          // Small delay to ensure join is processed
          setTimeout(() => {
            router.push(`/game/${msg.gameId}`);
          }, 100);
          break;
          
        case 'matched':
          // Join the game before navigating
          wsConnection.send({ type: 'join-game', gameId: msg.gameId });
          setGameId(msg.gameId);
          setTimeout(() => {
            router.push(`/game/${msg.gameId}`);
          }, 100);
          break;
          
        case 'error':
          setError(msg.message);
          setTimeout(() => setError(null), 5000);
          break;
      }
    });
    
    // Check connection state periodically
    const interval = setInterval(() => {
      const state = wsConnection.getState();
      setConnected(state.connected && state.authenticated);
    }, 1000);
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router]); // Intentionally omit gameId to avoid infinite loop
  
  // Handle game joins when URL changes
  useEffect(() => {
    if (!connected) return;
    
    const path = window.location.pathname;
    if (path.startsWith('/game/')) {
      const id = path.split('/')[2];
      if (id && id !== gameId) {
        console.log('[WSContext] URL changed, joining game:', id);
        setGameId(id);
        wsConnection.send({ type: 'join-game', gameId: id });
      }
    }
  }, [connected, gameId]);
  
  // Action handlers
  const sendAction = useCallback((action: Action) => {
    if (gameId && connected) {
      wsConnection.send({ type: 'action', gameId, action });
    } else {
      console.warn('[WSContext] Cannot send action: not in game or not connected');
    }
  }, [gameId, connected]);
  
  const createSoloGame = useCallback(() => {
    if (connected) {
      wsConnection.send({ type: 'create-solo-game' });
    } else {
      setError('Not connected to server. Please refresh and try again.');
    }
  }, [connected]);
  
  const joinQueue = useCallback(() => {
    if (connected) {
      wsConnection.send({ type: 'join-queue' });
    } else {
      setError('Not connected to server. Please refresh and try again.');
    }
  }, [connected]);
  
  const leaveQueue = useCallback(() => {
    if (connected) {
      wsConnection.send({ type: 'leave-queue' });
    }
  }, [connected]);
  
  const value = {
    gameState,
    error,
    connected,
    sendAction,
    createSoloGame,
    joinQueue,
    leaveQueue,
  };
  
  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}