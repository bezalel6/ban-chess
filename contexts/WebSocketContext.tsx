'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import type { SimpleGameState, SimpleServerMsg, SimpleClientMsg, Action } from '@/lib/game-types';
import { useAuth } from '@/components/AuthProvider';

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
export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  
  const [gameState, setGameState] = useState<SimpleGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const didAuthRef = useRef(false);
  
  // WebSocket URL - stable URL that doesn't change
  const socketUrl = user ? 'ws://localhost:8081' : null;
  
  // react-use-websocket hook with auto-reconnect
  const {
    sendMessage: wsSend,
    lastMessage,
    readyState,
  } = useWebSocket(socketUrl, {
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: (attemptNumber) => Math.min(1000 * Math.pow(2, attemptNumber), 10000),
    share: true, // CRITICAL: Share the connection across all components and navigation
    filter: () => false, // Don't filter any messages
    retryOnError: true,
    onOpen: () => {
      console.log('[WSContext] WebSocket connected');
      didAuthRef.current = false; // Reset auth flag on new connection
    },
    onClose: () => {
      console.log('[WSContext] WebSocket disconnected');
      setIsAuthenticated(false);
      didAuthRef.current = false;
    },
    onError: (error) => {
      console.error('[WSContext] WebSocket error:', error);
      setError('Connection error. Please refresh the page.');
    },
  });

  // Send helper that only sends when connected
  const sendMessage = useCallback((msg: SimpleClientMsg) => {
    if (readyState === ReadyState.OPEN) {
      console.log('[WSContext] Sending:', msg.type);
      wsSend(JSON.stringify(msg));
    } else {
      console.warn('[WSContext] Cannot send, WebSocket not open:', msg.type);
    }
  }, [readyState, wsSend]);

  // Authenticate when connection opens
  useEffect(() => {
    if (readyState === ReadyState.OPEN && user && !didAuthRef.current) {
      didAuthRef.current = true;
      console.log('[WSContext] Authenticating user:', user.username);
      sendMessage({ 
        type: 'authenticate', 
        userId: user.userId, 
        username: user.username 
      });
    }
  }, [readyState, user, sendMessage]);

  // Handle incoming messages
  useEffect(() => {
    if (!lastMessage) return;
    
    try {
      const msg = JSON.parse(lastMessage.data) as SimpleServerMsg;
      console.log('[WSContext] Received:', msg.type);
      
      switch (msg.type) {
        case 'authenticated': {
          setIsAuthenticated(true);
          
          // Auto-join game based on current URL
          const path = window.location.pathname;
          if (path.startsWith('/game/')) {
            const id = path.split('/')[2];
            if (id && id !== gameId) {
              setGameId(id);
              sendMessage({ type: 'join-game', gameId: id });
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
          break;
          
        case 'solo-game-created':
          // Join the game before navigating
          sendMessage({ type: 'join-game', gameId: msg.gameId });
          setGameId(msg.gameId);
          // Small delay to ensure join is processed
          setTimeout(() => {
            router.push(`/game/${msg.gameId}`);
          }, 100);
          break;
          
        case 'matched':
          // Join the game before navigating
          sendMessage({ type: 'join-game', gameId: msg.gameId });
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
    } catch (err) {
      console.error('[WSContext] Failed to parse message:', err);
    }
  }, [lastMessage, router, sendMessage, gameId]);

  // Action handlers
  const sendAction = useCallback((action: Action) => {
    if (gameId && isAuthenticated) {
      sendMessage({ type: 'action', gameId, action });
    } else {
      console.warn('[WSContext] Cannot send action: not in game or not authenticated');
    }
  }, [gameId, isAuthenticated, sendMessage]);

  const createSoloGame = useCallback(() => {
    if (isAuthenticated) {
      sendMessage({ type: 'create-solo-game' });
    } else {
      setError('Not connected to server. Please refresh and try again.');
    }
  }, [isAuthenticated, sendMessage]);

  const joinQueue = useCallback(() => {
    if (isAuthenticated) {
      sendMessage({ type: 'join-queue' });
    } else {
      setError('Not connected to server. Please refresh and try again.');
    }
  }, [isAuthenticated, sendMessage]);

  const leaveQueue = useCallback(() => {
    if (isAuthenticated) {
      sendMessage({ type: 'leave-queue' });
    }
  }, [isAuthenticated, sendMessage]);

  const value = {
    gameState,
    error,
    connected: readyState === ReadyState.OPEN && isAuthenticated,
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