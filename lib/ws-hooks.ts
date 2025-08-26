'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { Move, Ban, GameState, ServerMsg } from './game-types';

interface WebSocketStore {
  ws: WebSocket | null;
  gameState: GameState | null;
  error: string | null;
  connected: boolean;
  authenticated: boolean;
  position: number | null;
  matched: { gameId: string; color: 'white' | 'black'; opponent?: string } | null;
}

class WebSocketManager {
  private store: WebSocketStore = {
    ws: null,
    gameState: null,
    error: null,
    connected: false,
    authenticated: false,
    position: null,
    matched: null,
  };
  
  private listeners = new Set<() => void>();

  constructor(
    // eslint-disable-next-line no-unused-vars
    private _url: string,
    // eslint-disable-next-line no-unused-vars
    private _gameId?: string,
    // eslint-disable-next-line no-unused-vars
    private _user?: { userId: string; username: string }
  ) {
    this.connect();
  }

  private connect() {
    try {
      this.store.ws = new WebSocket(this._url);
      
      this.store.ws.onopen = () => {
        this.updateStore({ connected: true });
        if (this._user) {
          this.authenticate();
        }
      };

      this.store.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data) as ServerMsg;
        this.handleMessage(msg);
      };

      this.store.ws.onerror = () => {
        this.updateStore({ error: 'Connection error occurred' });
      };

      this.store.ws.onclose = () => {
        this.updateStore({ connected: false, authenticated: false });
        // Attempt reconnection after delay
        setTimeout(() => this.connect(), 3000);
      };
    } catch (err) {
      this.updateStore({ 
        error: err instanceof Error ? err.message : 'Failed to connect' 
      });
    }
  }

  private authenticate() {
    if (!this._user || !this.store.ws) return;
    
    this.store.ws.send(JSON.stringify({
      type: 'authenticate',
      userId: this._user.userId,
      username: this._user.username,
    }));
  }

  private handleMessage(msg: ServerMsg) {
    switch (msg.type) {
      case 'authenticated':
        this.updateStore({ authenticated: true });
        if (this._gameId) {
          this.joinGame(this._gameId);
        }
        break;
      
      case 'state':
        this.updateStore({
          gameState: {
            fen: msg.fen,
            pgn: msg.pgn,
            nextAction: msg.nextAction,
            legalMoves: msg.legalMoves || [],
            legalBans: msg.legalBans || [],
            history: msg.history || [],
            turn: msg.turn,
            gameId: msg.gameId,
            playerColor: this.store.gameState?.playerColor,
            players: msg.players,
          }
        });
        break;
      
      case 'joined':
        this.updateStore({
          gameState: {
            ...this.store.gameState!,
            playerColor: msg.color,
            players: msg.players,
          }
        });
        break;
      
      case 'queued':
        this.updateStore({ position: msg.position });
        break;
      
      case 'matched':
        this.updateStore({ matched: msg });
        break;
      
      case 'error':
        this.updateStore({ error: msg.message });
        break;
    }
  }

  private updateStore(updates: Partial<WebSocketStore>) {
    this.store = { ...this.store, ...updates };
    this.listeners.forEach(listener => listener());
  }

  private joinGame(gameId: string) {
    if (!this.store.ws || !this.store.authenticated) return;
    
    this.store.ws.send(JSON.stringify({
      type: 'join-game',
      gameId,
    }));
  }

  getSnapshot = () => this.store;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  sendMove = (move: Move) => {
    if (!this.store.ws || !this._gameId) return;
    
    this.store.ws.send(JSON.stringify({
      type: 'move',
      gameId: this._gameId,
      move,
    }));
  };

  sendBan = (ban: Ban) => {
    if (!this.store.ws || !this._gameId) return;
    
    this.store.ws.send(JSON.stringify({
      type: 'ban',
      gameId: this._gameId,
      ban,
    }));
  };

  joinQueue = () => {
    if (!this.store.ws || !this.store.authenticated) return;
    
    this.store.ws.send(JSON.stringify({
      type: 'join-queue',
    }));
  };

  leaveQueue = () => {
    if (!this.store.ws || !this.store.authenticated) return;
    
    this.store.ws.send(JSON.stringify({
      type: 'leave-queue',
    }));
  };

  disconnect() {
    if (this.store.ws) {
      this.store.ws.close();
    }
  }
}

export function useWebSocket(
  gameId?: string,
  user?: { userId: string; username: string }
) {
  const managerRef = useRef<WebSocketManager | null>(null);
  
  if (!managerRef.current) {
    managerRef.current = new WebSocketManager(
      process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8081',
      gameId,
      user
    );
  }
  
  const store = useSyncExternalStore(
    managerRef.current.subscribe,
    managerRef.current.getSnapshot,
    managerRef.current.getSnapshot
  );
  
  useEffect(() => {
    return () => {
      managerRef.current?.disconnect();
      managerRef.current = null;
    };
  }, []);
  
  return {
    ...store,
    sendMove: managerRef.current.sendMove,
    sendBan: managerRef.current.sendBan,
    joinQueue: managerRef.current.joinQueue,
    leaveQueue: managerRef.current.leaveQueue,
  };
}

export function useQueue(user?: { userId: string; username: string }) {
  return useWebSocket(undefined, user);
}