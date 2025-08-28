'use client';

import { useSyncExternalStore, useCallback, useMemo } from 'react';
import type { SimpleGameState, SimpleServerMsg, SimpleClientMsg, Action } from './game-types';

interface WebSocketStore {
  ws: WebSocket | null;
  gameState: SimpleGameState | null;
  error: string | null;
  connected: boolean;
  authenticated: boolean;
  position: number | null; // Queue position
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
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isIntentionalDisconnect = false;
  private connectionKey: string;

  static getInstance(
    url: string,
    gameId?: string,
    user?: { userId: string; username: string }
  ): WebSocketManager {
    const key = user ? user.userId : 'anonymous';
    
    let instance = globalManagers.get(key);
    if (!instance) {
      instance = new WebSocketManager(url, gameId, user, key);
      globalManagers.set(key, instance);
    } else if (gameId && gameId !== instance.gameId) {
      instance.gameId = gameId;
      if (instance.store.authenticated && instance.store.ws?.readyState === WebSocket.OPEN) {
        instance.joinGame(gameId);
      }
    }
    
    return instance;
  }

  private constructor(
    private url: string,
    private gameId?: string,
    private user?: { userId: string; username: string },
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
      console.log(`[WebSocket] Connecting to: ${this.url}`);
      this.store.ws = new WebSocket(this.url);
      
      this.store.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.updateStore({ connected: true, error: null });
        
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
        
        if (this.user) {
          this.authenticate();
        }
      };

      this.store.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data) as SimpleServerMsg;
        this.handleMessage(msg);
      };

      this.store.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.updateStore({ error: 'Connection error occurred' });
      };

      this.store.ws.onclose = (event) => {
        console.log('[WebSocket] Closed:', event.code, event.reason);
        this.updateStore({ connected: false, authenticated: false });
        
        if (event.code === 1000 && event.reason === 'Session takeover') {
          this.updateStore({ error: 'Your session was opened in another tab' });
          return;
        }
        
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
    if (!this.user || !this.store.ws) return;
    
    const msg: SimpleClientMsg = {
      type: 'authenticate',
      userId: this.user.userId,
      username: this.user.username,
    };
    
    this.store.ws.send(JSON.stringify(msg));
  }

  private handleMessage(msg: SimpleServerMsg) {
    switch (msg.type) {
      case 'authenticated':
        console.log('[WebSocket] Authenticated');
        this.updateStore({ authenticated: true });
        if (this.gameId) {
          this.joinGame(this.gameId);
        }
        break;
      
      case 'state': {
        // Update game state with FEN
        const newState: SimpleGameState = {
          fen: msg.fen,
          gameId: msg.gameId,
          players: msg.players,
          playerColor: this.store.gameState?.playerColor,
          isSoloGame: msg.isSoloGame,
        };
        this.updateStore({ gameState: newState });
        break;
      }
      
      case 'joined':
        console.log('[WebSocket] Joined game:', msg.gameId);
        this.updateStore({
          gameState: {
            fen: this.store.gameState?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 b:ban',
            gameId: msg.gameId,
            players: msg.players,
            playerColor: msg.color,
            isSoloGame: msg.isSoloGame,
          }
        });
        break;
      
      case 'queued':
        this.updateStore({ position: msg.position });
        break;
      
      case 'matched':
        console.log('[WebSocket] Matched:', msg);
        this.updateStore({ matched: msg });
        break;
        
      case 'solo-game-created':
        console.log('[WebSocket] Solo game created:', msg.gameId);
        // Navigate to the game
        if (typeof window !== 'undefined') {
          window.location.href = `/game/${msg.gameId}`;
        }
        break;
      
      case 'error':
        console.error('[WebSocket] Error:', msg.message);
        if (!msg.message.includes('session has been taken over')) {
          this.updateStore({ error: msg.message });
        }
        break;
    }
  }

  private updateStore(updates: Partial<WebSocketStore>) {
    this.store = { ...this.store, ...updates };
    this.listeners.forEach(listener => listener());
  }

  private joinGame(gameId: string) {
    if (!this.store.ws || !this.store.authenticated) return;
    
    const msg: SimpleClientMsg = {
      type: 'join-game',
      gameId,
    };
    
    this.store.ws.send(JSON.stringify(msg));
  }

  getSnapshot = () => this.store;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  sendAction = (action: Action) => {
    if (!this.store.ws || !this.gameId) return;
    
    const msg: SimpleClientMsg = {
      type: 'action',
      gameId: this.gameId,
      action,
    };
    
    this.store.ws.send(JSON.stringify(msg));
  };

  createSoloGame = () => {
    if (!this.store.ws || !this.store.authenticated) return;
    
    const msg: SimpleClientMsg = {
      type: 'create-solo-game',
    };
    
    this.store.ws.send(JSON.stringify(msg));
  };

  joinQueue = () => {
    if (!this.store.ws || !this.store.authenticated) return;
    
    const msg: SimpleClientMsg = {
      type: 'join-queue',
    };
    
    this.store.ws.send(JSON.stringify(msg));
  };

  leaveQueue = () => {
    if (!this.store.ws || !this.store.authenticated) return;
    
    const msg: SimpleClientMsg = {
      type: 'leave-queue',
    };
    
    this.store.ws.send(JSON.stringify(msg));
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
  const manager = useMemo(() => {
    if (!user) return null;
    
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8081';
    return WebSocketManager.getInstance(wsUrl, gameId, user);
  }, [gameId, user]);
  
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
  
  const sendAction = useCallback((action: Action) => {
    manager?.sendAction(action);
  }, [manager]);
  
  const createSoloGame = useCallback(() => {
    manager?.createSoloGame();
  }, [manager]);
  
  const joinQueue = useCallback(() => {
    manager?.joinQueue();
  }, [manager]);
  
  const leaveQueue = useCallback(() => {
    manager?.leaveQueue();
  }, [manager]);
  
  return useMemo(() => ({
    ...store,
    sendAction,
    createSoloGame,
    joinQueue,
    leaveQueue,
  }), [store, sendAction, createSoloGame, joinQueue, leaveQueue]);
}