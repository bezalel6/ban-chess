'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { ClientMsg, ServerMsg, GameState, Move, Ban } from './game-types';

export function useWebSocket(gameId: string | null) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!gameId) return;

    let ws: WebSocket | null = null;
    let isConnecting = true;

    // Get player color from sessionStorage (set by queue match)
    const storedColor = Math.random() % 2 == 0 ? 'white' : 'black';
    // const storedColor = sessionStorage.getItem(`gameColor-${gameId}`) as 'white' | 'black' | null;
    console.log('Stored color from sessionStorage:', storedColor);
    if (storedColor) {
      setGameState({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        pgn: '',
        nextAction: 'ban',
        legalMoves: [],
        legalBans: [],
        history: [],
        turn: 'black',
        gameId,
        playerColor: storedColor,
      });
    }

    const connect = () => {
      ws = new WebSocket('ws://localhost:8081');
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isConnecting) return;

        setConnected(true);
        setError(null);

        // Join the game
        const joinMsg: ClientMsg = { type: 'join-game', gameId };
        ws?.send(JSON.stringify(joinMsg));
      };

      ws.onmessage = (event) => {
        if (!isConnecting) return;

        const msg: ServerMsg = JSON.parse(event.data);

        if (msg.type === 'state') {
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
          }));
        } else if (msg.type === 'matched') {
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
          });
        } else if (msg.type === 'joined') {
          console.log('Received joined message with color:', msg.color);
          setGameState((prev) =>
            prev
              ? { ...prev, playerColor: msg.color }
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
                }
          );
        } else if (msg.type === 'error') {
          setError(msg.message);
        }
      };

      ws.onerror = () => {
        if (!isConnecting) return;
        setError('WebSocket connection failed');
        setConnected(false);
      };

      ws.onclose = () => {
        if (!isConnecting) return;
        setConnected(false);
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
  }, [gameId]);

  const sendMove = useCallback(
    (move: Move) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && gameId) {
        const moveMsg: ClientMsg = { type: 'move', gameId, move };
        wsRef.current.send(JSON.stringify(moveMsg));
      }
    },
    [gameId]
  );

  const sendBan = useCallback(
    (ban: Ban) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && gameId) {
        const banMsg: ClientMsg = { type: 'ban', gameId, ban };
        wsRef.current.send(JSON.stringify(banMsg));
      }
    },
    [gameId]
  );

  return {
    gameState,
    error,
    connected,
    sendMove,
    sendBan,
  };
}
