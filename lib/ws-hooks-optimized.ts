'use client';

import { useEffect, useRef, useState, useSyncExternalStore, useCallback, useMemo } from 'react';
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

// Global singleton management
const globalManagers = new Map<string, WebSocketManager>();

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

  static getInstance(
    url: string,
    gameId?: string,
    user?: { userId: string; username: string }
  ): WebSocketManager {
    const key = user ? `${user.userId}-${gameId || 'queue'}` : 'anonymous';
    
    let instance = globalManagers.get(key);
    if (!instance) {
      instance = new WebSocketManager(url, gameId, user, key);
      globalManagers.set(key, instance);
    }
    
    return instance;
  }

  private constructor(
    private _url: string,
    private _gameId?: string,
    private _user?: { userId: string; username: string },
    connectionKey?: string
  ) {
    this.connectionKey = connectionKey || 'default';
    this.connect();
  }

  private connect() {
    if (this.isIntentionalDisconnect) return;
    
    if (this.store.ws?.readyState === WebSocket.CONNECTING || 
        this.store.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    
    try {
      this.store.ws = new WebSocket(this._url);
      
      this.store.ws.onopen = () => {
        console.log('WebSocket connected');
        this.updateStore({ connected: true, error: null });
        
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
        // Only update if state actually changed
        const newState = {
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
        };
        
        // Deep equality check could be added here for further optimization
        this.updateStore({ gameState: newState });
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
        if (this.store.position !== msg.position) {
          this.updateStore({ position: msg.position });
        }
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
    // Only notify listeners if something actually changed
    let hasChanges = false;
    for (const [key, value] of Object.entries(updates)) {
      if (this.store[key as keyof WebSocketStore] !== value) {
        hasChanges = true;
        break;
      }
    }
    
    if (hasChanges) {
      this.store = { ...this.store, ...updates };
      this.listeners.forEach(listener => listener());
    }
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
    globalManagers.delete(this.connectionKey);
  }
}

export function useWebSocket(
  gameId?: string,
  user?: { userId: string; username: string }
) {
  const managerRef = useRef<WebSocketManager | null>(null);
  
  // Get or create manager instance
  useEffect(() => {
    if (user && !managerRef.current) {
      managerRef.current = WebSocketManager.getInstance(
        process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8081',
        gameId,
        user
      );
    }
    
    return () => {
      // Don't disconnect on unmount - let the global instance persist
      // Only disconnect when the component using this hook is truly done
    };
  }, [gameId, user]);
  
  const manager = managerRef.current;
  
  // Create stable empty store for initial render
  const emptyStore = useMemo<WebSocketStore>(() => ({
    ws: null,
    gameState: null,
    error: null,
    connected: false,
    authenticated: false,
    position: null,
    matched: null,
  }), []);
  
  const store = useSyncExternalStore(
    manager ? manager.subscribe : () => () => {},
    manager ? manager.getSnapshot : () => emptyStore,
    manager ? manager.getSnapshot : () => emptyStore
  );
  
  // Memoize action functions to prevent re-renders
  const sendMove = useCallback((move: Move) => {
    manager?.sendMove(move);
  }, [manager]);
  
  const sendBan = useCallback((ban: Ban) => {
    manager?.sendBan(ban);
  }, [manager]);
  
  const joinQueue = useCallback(() => {
    manager?.joinQueue();
  }, [manager]);
  
  const leaveQueue = useCallback(() => {
    manager?.leaveQueue();
  }, [manager]);
  
  return useMemo(() => ({
    ...store,
    sendMove,
    sendBan,
    joinQueue,
    leaveQueue,
  }), [store, sendMove, sendBan, joinQueue, leaveQueue]);
}

export function useQueue(user?: { userId: string; username: string }) {
  return useWebSocket(undefined, user);
}