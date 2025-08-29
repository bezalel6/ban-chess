'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ReadyState } from 'react-use-websocket';
import { useGameWebSocket } from '@/contexts/WebSocketContext';
import { useAuth } from '@/components/AuthProvider';
import type { SimpleGameState, SimpleServerMsg, SimpleClientMsg, Action, HistoryEntry, GameEvent } from '@/lib/game-types';
import soundManager from '@/lib/sound-manager';

export function useGameState() {
  const { user } = useAuth();
  const router = useRouter();
  const wsContext = useGameWebSocket();
  
  // Handle null context (should not happen if provider is set up correctly)
  if (!wsContext) {
    throw new Error('useGameState must be used within WebSocketProvider');
  }
  
  const { sendMessage, lastMessage, readyState } = wsContext;
  
  // State management
  const [gameState, setGameState] = useState<SimpleGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);
  
  // Refs for tracking
  const previousFen = useRef<string | null>(null);
  const authSent = useRef(false);
  const moveHistory = useRef<HistoryEntry[]>([]);
  
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
        username: user.username || ''
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
    
    // Parse message first to check type
    let msg: SimpleServerMsg;
    try {
      msg = JSON.parse(lastMessage.data) as SimpleServerMsg;
    } catch (e) {
      console.error('[GameState] Failed to parse WebSocket message:', e);
      return;
    }
    
    // Only log non-clock-update messages to reduce console spam
    if (msg.type !== 'clock-update') {
      console.log('[GameState] WebSocket message:', msg.type, msg);
    }
    
    try {
      switch (msg.type) {
        case 'authenticated': {
          setIsAuthenticated(true);
          // Don't auto-join here - let the game page handle it
          break;
        }
          
        case 'state':
          // Handle history updates
          if (msg.history) {
            // Full history received (new connection/spectator)
            // Check if it's the new format (HistoryEntry[]) or old format (string[])
            if (msg.history.length > 0 && typeof msg.history[0] === 'object') {
              moveHistory.current = msg.history as HistoryEntry[];
            } else {
              // Old format - we'll just clear for now
              // TODO: Could convert BCN strings to HistoryEntry if needed
              moveHistory.current = [];
            }
          } else if (msg.lastMove) {
            // Incremental update - append last move to history
            // Check if this is a new move (not a duplicate)
            const lastHistoryMove = moveHistory.current[moveHistory.current.length - 1];
            if (!lastHistoryMove || lastHistoryMove.fen !== msg.lastMove.fen) {
              moveHistory.current = [...moveHistory.current, msg.lastMove];
            }
          }
          
          // Handle events if provided
          if (msg.events) {
            setGameEvents(msg.events);
          }
          
          // Update game state with current history
          setGameState({
            ...msg,
            history: moveHistory.current,
            timeControl: msg.timeControl,
            clocks: msg.clocks,
            startTime: msg.startTime
          });
          setCurrentGameId(msg.gameId);
          
          // Play sound effects for moves
          if (previousFen.current && msg.fen !== previousFen.current) {
            const prevPieces = (previousFen.current.match(/[prnbqk]/gi) || []).length;
            const currentPieces = (msg.fen.match(/[prnbqk]/gi) || []).length;
            
            soundManager.playMoveSound({
              check: msg.inCheck === true,
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
          // Clear history for new game
          moveHistory.current = [];
          // Server will send a full state message next
          soundManager.play('game-start');
          break;
          
        case 'solo-game-created':
          console.log('[GameState] Solo game created:', msg.gameId);
          // Don't set currentGameId here - let GameClient handle it when joining
          // Navigate immediately - the game page will handle joining
          router.push(`/game/${msg.gameId}`);
          break;
          
        case 'matched':
          console.log('[GameState] Matched with opponent, game:', msg.gameId);
          // Don't set currentGameId here - let GameClient handle it when joining
          // Navigate immediately - the game page will handle joining
          router.push(`/game/${msg.gameId}`);
          break;
          
        case 'queued':
          console.log('[GameState] Queued, position:', msg.position);
          break;
          
        case 'clock-update':
          // Update only the clocks in the current game state
          setGameState(prev => {
            if (prev && prev.gameId === msg.gameId) {
              return {
                ...prev,
                clocks: msg.clocks
              };
            }
            return prev;
          });
          break;
          
        case 'timeout':
          console.log('[GameState] Timeout in game:', msg.gameId, 'Winner:', msg.winner);
          // Update game state with timeout result - server is source of truth
          setGameState(prev => {
            if (prev && prev.gameId === msg.gameId) {
              return {
                ...prev,
                gameOver: true,
                result: `${msg.winner === 'white' ? 'White' : 'Black'} wins on time!`
              };
            }
            return prev;
          });
          soundManager.play('game-end'); // Play sound only when server confirms timeout
          break;
          
        case 'game-event':
          // Add new event to the list
          if (msg.event) {
            setGameEvents(prev => [...prev, msg.event]);
          }
          break;
          
        case 'error':
          console.error('[GameState] Server error:', msg.message);
          setError(msg.message);
          setTimeout(() => setError(null), 5000);
          break;
          
        case 'pong':
          // Heartbeat pong response - handled by WebSocketContext for latency tracking
          // No action needed here
          break;
          
        default: {
          const _exhaustiveCheck: never = msg;
          console.log('[GameState] Unhandled message type:', (_exhaustiveCheck as SimpleServerMsg).type);
        }
      }
    } catch (err) {
      console.error('[GameState] Failed to handle message:', err);
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
  
  const giveTime = useCallback((amount: number = 15) => {
    if (currentGameId && connected) {
      send({ type: 'give-time', gameId: currentGameId, amount });
    } else {
      console.warn('[GameState] Cannot give time: not in game or not connected');
    }
  }, [currentGameId, connected, send]);
  
  return {
    // State
    gameState,
    error,
    connected,
    isAuthenticated,
    currentGameId,
    gameEvents,
    
    // Actions
    sendAction,
    createSoloGame,
    joinQueue,
    leaveQueue,
    joinGame,
    giveTime,
    
    // Raw access if needed
    readyState,
    send
  };
}