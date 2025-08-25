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

    const ws = new WebSocket('ws://localhost:8081');
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);
      const joinMsg: ClientMsg = { type: 'join', gameId };
      ws.send(JSON.stringify(joinMsg));
    };

    ws.onmessage = (event) => {
      const msg: ServerMsg = JSON.parse(event.data);
      
      if (msg.type === 'state') {
        setGameState({
          fen: msg.fen,
          pgn: msg.pgn,
          nextAction: msg.nextAction,
          legalMoves: msg.legalMoves || [],
          legalBans: msg.legalBans || [],
          history: msg.history || [],
          turn: msg.turn,
          gameId: msg.gameId,
        });
      } else if (msg.type === 'joined') {
        setGameState(prev => prev ? { ...prev, playerColor: msg.color } : null);
      } else if (msg.type === 'error') {
        setError(msg.message);
      }
    };

    ws.onerror = () => {
      setError('WebSocket connection failed');
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [gameId]);

  const createGame = useCallback((newGameId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const createMsg: ClientMsg = { type: 'create', gameId: newGameId };
      wsRef.current.send(JSON.stringify(createMsg));
    }
  }, []);

  const sendMove = useCallback((move: Move) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && gameId) {
      const moveMsg: ClientMsg = { type: 'move', gameId, move };
      wsRef.current.send(JSON.stringify(moveMsg));
    }
  }, [gameId]);

  const sendBan = useCallback((ban: Ban) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && gameId) {
      const banMsg: ClientMsg = { type: 'ban', gameId, ban };
      wsRef.current.send(JSON.stringify(banMsg));
    }
  }, [gameId]);

  return {
    gameState,
    error,
    connected,
    createGame,
    sendMove,
    sendBan,
  };
}