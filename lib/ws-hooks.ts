'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
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

// Global map to track WebSocket instances by user
const globalConnections = new Map<string, WebSocketManager>();

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
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isIntentionalDisconnect = false;
  private connectionKey: string;

  constructor(
     
    private _url: string,
     
    private _gameId?: string,
     
    private _user?: { userId: string; username: string }
  ) {
    this.connectionKey = _user ? `${_user.userId}-${_gameId || 'queue'}` : 'anonymous';
    
    // Check if a connection already exists for this user
    const existing = globalConnections.get(this.connectionKey);
    if (existing) {
      // Return the existing connection instead of creating a new one
      return existing;
    }
    
    // Register this connection globally
    globalConnections.set(this.connectionKey, this);
    this.connect();
  }

  private connect() {
    // Don't reconnect if intentionally disconnected
    if (this.isIntentionalDisconnect) return;
    
    // Don't create multiple connections
    if (this.store.ws?.readyState === WebSocket.CONNECTING || 
        this.store.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    
    try {
      this.store.ws = new WebSocket(this._url);
      
      this.store.ws.onopen = () => {
        console.log('WebSocket connected');
        this.updateStore({ connected: true, error: null });
        // Clear any pending reconnect
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
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
        // Only attempt reconnection if not intentionally disconnected
        if (!this.isIntentionalDisconnect && !this.reconnectTimeout) {
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.connect();
          }, 3000);
        }
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
    this.isIntentionalDisconnect = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.store.ws) {
      this.store.ws.close();
      this.store.ws = null;
    }
    // Remove from global connections
    globalConnections.delete(this.connectionKey);
  }
}

export function useWebSocket(
  gameId?: string,
  user?: { userId: string; username: string }
) {
  const managerRef = useRef<WebSocketManager | null>(null);
  
  // Create manager once on first render if user is provided
  if (!managerRef.current && user) {
    managerRef.current = new WebSocketManager(
      process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8081',
      gameId,
      user
    );
  }
  
  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.disconnect();
        managerRef.current = null;
      }
    };
  }, []); // Empty dependency array - only cleanup on unmount
  
  // Create a stable empty store for when no manager exists
  const emptyStore = useRef<WebSocketStore>({
    ws: null,
    gameState: null,
    error: null,
    connected: false,
    authenticated: false,
    position: null,
    matched: null,
  }).current;
  
  const manager = managerRef.current;
  const store = useSyncExternalStore(
    manager ? manager.subscribe : () => () => {},
    manager ? manager.getSnapshot : () => emptyStore,
    manager ? manager.getSnapshot : () => emptyStore
  );
  
  return {
    ...store,
    sendMove: manager ? manager.sendMove : () => {},
    sendBan: manager ? manager.sendBan : () => {},
    joinQueue: manager ? manager.joinQueue : () => {},
    leaveQueue: manager ? manager.leaveQueue : () => {},
  };
}

export function useQueue(user?: { userId: string; username: string }) {
  return useWebSocket(undefined, user);
}