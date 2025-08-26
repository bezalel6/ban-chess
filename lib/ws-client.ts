'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { ClientMsg, ServerMsg, GameState, Move, Ban } from './game-types';

interface UseWebSocketOptions {
  userId?: string;
  username?: string;
}

export function useWebSocket(gameId: string | null, options?: UseWebSocketOptions) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!gameId) return;

    let ws: WebSocket | null = null;
    let isConnecting = true;

    const connect = () => {
      ws = new WebSocket('ws://localhost:8081');
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isConnecting) return;

        setConnected(true);
        setError(null);

        // Send authentication if credentials provided
        if (options?.userId && options?.username) {
          const authMsg: ClientMsg = { 
            type: 'authenticate', 
            userId: options.userId, 
            username: options.username 
          };
          ws?.send(JSON.stringify(authMsg));
        } else {
          // If no auth credentials, we can't proceed
          setError('Authentication required');
          console.error('No authentication credentials provided');
        }
      };

      ws.onmessage = (event) => {
        if (!isConnecting) return;

        const msg: ServerMsg = JSON.parse(event.data);

        switch (msg.type) {
          case 'authenticated': {
            setAuthenticated(true);
            console.log('WebSocket authenticated:', msg.username);
            
            // Join the game after authentication
            const joinMsg: ClientMsg = { type: 'join-game', gameId };
            ws?.send(JSON.stringify(joinMsg));
            break;
          }

          case 'state':
            setGameState((prev) => ({
              fen: msg.fen,
              pgn: msg.pgn,
              nextAction: msg.nextAction,
              legalMoves: msg.legalMoves || [],
              legalBans: msg.legalBans || [],
              history: msg.history || [],
              turn: msg.turn,
              gameId: msg.gameId,
              playerColor: prev?.playerColor, // Preserve player color
              players: msg.players,
            }));
            break;

          case 'matched':
            // This happens when redirected from queue
            setGameState({
              fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
              pgn: '',
              nextAction: 'ban',
              legalMoves: [],
              legalBans: [],
              history: [],
              turn: 'black', // Black bans first
              gameId: msg.gameId,
              playerColor: msg.color,
              players: msg.opponent ? 
                (msg.color === 'white' ? { white: options?.username, black: msg.opponent } : 
                 { white: msg.opponent, black: options?.username }) : undefined,
            });
            break;

          case 'joined':
            console.log('Received joined message with color:', msg.color);
            setGameState((prev) =>
              prev
                ? { ...prev, playerColor: msg.color, players: msg.players }
                : {
                    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                    pgn: '',
                    nextAction: 'ban',
                    legalMoves: [],
                    legalBans: [],
                    history: [],
                    turn: 'black',
                    gameId,
                    playerColor: msg.color,
                    players: msg.players,
                  }
            );
            break;

          case 'error':
            setError(msg.message);
            // Don't clear error automatically - let the UI handle it
            break;
        }
      };

      ws.onerror = () => {
        if (!isConnecting) return;
        setError('WebSocket connection failed');
        setConnected(false);
        setAuthenticated(false);
      };

      ws.onclose = () => {
        if (!isConnecting) return;
        setConnected(false);
        setAuthenticated(false);
        
        // Attempt to reconnect after 2 seconds
        if (isConnecting) {
          setTimeout(() => {
            if (isConnecting) {
              console.log('Attempting to reconnect...');
              connect();
            }
          }, 2000);
        }
      };
    };

    connect();

    return () => {
      isConnecting = false;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [gameId, options?.userId, options?.username]);

  const sendMove = useCallback(
    (move: Move) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && authenticated && gameId) {
        const moveMsg: ClientMsg = { type: 'move', gameId, move };
        wsRef.current.send(JSON.stringify(moveMsg));
      } else {
        setError('Not connected or authenticated');
      }
    },
    [gameId, authenticated]
  );

  const sendBan = useCallback(
    (ban: Ban) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && authenticated && gameId) {
        const banMsg: ClientMsg = { type: 'ban', gameId, ban };
        wsRef.current.send(JSON.stringify(banMsg));
      } else {
        setError('Not connected or authenticated');
      }
    },
    [gameId, authenticated]
  );

  return {
    gameState,
    error,
    connected,
    authenticated,
    sendMove,
    sendBan,
  };
}

// Hook for queue functionality
export function useQueue(options?: UseWebSocketOptions) {
  const [position, setPosition] = useState<number | null>(null);
  const [matched, setMatched] = useState<{ gameId: string; color: 'white' | 'black'; opponent?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let isConnecting = true;

    const connect = () => {
      ws = new WebSocket('ws://localhost:8081');
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isConnecting) return;

        setConnected(true);
        setError(null);

        // Send authentication if credentials provided
        if (options?.userId && options?.username) {
          const authMsg: ClientMsg = { 
            type: 'authenticate', 
            userId: options.userId, 
            username: options.username 
          };
          ws?.send(JSON.stringify(authMsg));
        } else {
          setError('Authentication required');
          console.error('No authentication credentials provided');
        }
      };

      ws.onmessage = (event) => {
        if (!isConnecting) return;

        const msg: ServerMsg = JSON.parse(event.data);

        switch (msg.type) {
          case 'authenticated':
            setAuthenticated(true);
            console.log('Queue WebSocket authenticated:', msg.username);
            break;

          case 'queued':
            setPosition(msg.position);
            break;

          case 'matched':
            setMatched({ 
              gameId: msg.gameId, 
              color: msg.color, 
              opponent: msg.opponent 
            });
            // Store color in sessionStorage for game page
            sessionStorage.setItem(`gameColor-${msg.gameId}`, msg.color);
            break;

          case 'error':
            setError(msg.message);
            break;
        }
      };

      ws.onerror = () => {
        if (!isConnecting) return;
        setError('WebSocket connection failed');
        setConnected(false);
        setAuthenticated(false);
      };

      ws.onclose = () => {
        if (!isConnecting) return;
        setConnected(false);
        setAuthenticated(false);
        setPosition(null);
      };
    };

    connect();

    return () => {
      isConnecting = false;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [options?.userId, options?.username]);

  const joinQueue = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && authenticated) {
      const joinMsg: ClientMsg = { type: 'join-queue' };
      wsRef.current.send(JSON.stringify(joinMsg));
    } else {
      setError('Not connected or authenticated');
    }
  }, [authenticated]);

  const leaveQueue = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && authenticated) {
      const leaveMsg: ClientMsg = { type: 'leave-queue' };
      wsRef.current.send(JSON.stringify(leaveMsg));
      setPosition(null);
    }
  }, [authenticated]);

  return {
    position,
    matched,
    error,
    connected,
    authenticated,
    joinQueue,
    leaveQueue,
  };
}