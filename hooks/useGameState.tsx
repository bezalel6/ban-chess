'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ReadyState } from 'react-use-websocket';
import { useGameWebSocket } from '@/contexts/WebSocketContext';
import { useAuth } from '@/components/AuthProvider';
import type { SimpleGameState, SimpleServerMsg, SimpleClientMsg, Action } from '@/lib/game-types';
import soundManager from '@/lib/sound-manager';

export function useGameState() {
  const { user } = useAuth();
  const router = useRouter();
  const { sendMessage, lastMessage, readyState } = useGameWebSocket();
  
  // State management
  const [gameState, setGameState] = useState<SimpleGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  
  // Refs for tracking
  const previousFen = useRef<string | null>(null);
  const authSent = useRef(false);
  
  // Connection status
  const connected = readyState === ReadyState.OPEN && isAuthenticated;
  
  // Send helper with JSON stringify
  const send = useCallback((msg: SimpleClientMsg) => {
    if (readyState === ReadyState.OPEN) {
      console.log('[GameState] Sending:', msg.type);
      sendMessage(JSON.stringify(msg));
    } else {
      console.warn('[GameState] Cannot send, not connected:', msg.type);
    }
  }, [readyState, sendMessage]);
  
  // Authenticate when connection opens
  useEffect(() => {
    if (readyState === ReadyState.OPEN && user && !authSent.current) {
      authSent.current = true;
      console.log('[GameState] Authenticating:', user.username);
      send({
        type: 'authenticate',
        userId: user.userId || '',
        username: user.username
      });
    }
    
    // Reset auth flag when connection closes
    if (readyState !== ReadyState.OPEN) {
      authSent.current = false;
      setIsAuthenticated(false);
    }
  }, [readyState, user, send]);
  
  // Handle incoming messages
  useEffect(() => {
    if (!lastMessage) return;
    
    try {
      const msg = JSON.parse(lastMessage.data) as SimpleServerMsg;
      console.log('[GameState] Received:', msg.type);
      
      switch (msg.type) {
        case 'authenticated': {
          setIsAuthenticated(true);
          // Don't auto-join here - let the game page handle it
          break;
        }
          
        case 'state':
          setGameState(msg);
          setCurrentGameId(msg.gameId);
          // Play sound effects for moves
          if (previousFen.current && msg.fen !== previousFen.current) {
            const wasCheck = previousFen.current.includes('+');
            const isCheck = msg.fen.includes('+');
            const prevPieces = (previousFen.current.match(/[prnbqk]/gi) || []).length;
            const currentPieces = (msg.fen.match(/[prnbqk]/gi) || []).length;
            
            soundManager.playMoveSound({
              check: !wasCheck && isCheck,
              capture: currentPieces < prevPieces,
            });
          }
          previousFen.current = msg.fen;
          
          if (msg.gameOver) {
            console.log('[GameState] Game Over:', msg.result);
            soundManager.play('game-end');
          }
          break;
          
        case 'joined':
          console.log('[GameState] Joined game:', msg.gameId);
          setCurrentGameId(msg.gameId);
          // Server will send a full state message next
          soundManager.play('game-start');
          break;
          
        case 'solo-game-created':
          console.log('[GameState] Solo game created:', msg.gameId);
          setCurrentGameId(msg.gameId);
          // Navigate immediately - the game page will handle joining
          router.push(`/game/${msg.gameId}`);
          break;
          
        case 'matched':
          console.log('[GameState] Matched with opponent, game:', msg.gameId);
          setCurrentGameId(msg.gameId);
          // Navigate immediately - the game page will handle joining
          router.push(`/game/${msg.gameId}`);
          break;
          
        case 'queued':
          console.log('[GameState] Queued, position:', msg.position);
          break;
          
        case 'error':
          console.error('[GameState] Server error:', msg.message);
          setError(msg.message);
          setTimeout(() => setError(null), 5000);
          break;
          
        default:
          console.log('[GameState] Unhandled message type:', msg.type);
      }
    } catch (err) {
      console.error('[GameState] Failed to parse message:', err);
    }
  }, [lastMessage, send, router, currentGameId]);
  
  // Action handlers
  const sendAction = useCallback((action: Action) => {
    if (currentGameId && connected) {
      send({ type: 'action', gameId: currentGameId, action });
    } else {
      console.warn('[GameState] Cannot send action: not in game or not connected');
    }
  }, [currentGameId, connected, send]);
  
  const createSoloGame = useCallback(() => {
    if (connected) {
      send({ type: 'create-solo-game' });
    } else {
      setError('Not connected to server. Please wait...');
    }
  }, [connected, send]);
  
  const joinQueue = useCallback(() => {
    if (connected) {
      send({ type: 'join-queue' });
    } else {
      setError('Not connected to server. Please wait...');
    }
  }, [connected, send]);
  
  const leaveQueue = useCallback(() => {
    if (connected) {
      send({ type: 'leave-queue' });
    }
  }, [connected, send]);
  
  const joinGame = useCallback((gameId: string) => {
    if (connected) {
      setCurrentGameId(gameId);
      send({ type: 'join-game', gameId });
    } else {
      setError('Not connected to server. Please wait...');
    }
  }, [connected, send]);
  
  return {
    // State
    gameState,
    error,
    connected,
    isAuthenticated,
    currentGameId,
    
    // Actions
    sendAction,
    createSoloGame,
    joinQueue,
    leaveQueue,
    joinGame,
    
    // Raw access if needed
    readyState,
    send
  };
}