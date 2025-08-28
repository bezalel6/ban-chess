'use client';

import { useEffect, useSyncExternalStore, useCallback, useMemo } from 'react';
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

// Function to disconnect all WebSocket connections for a user
export function disconnectUserWebSockets(userId: string) {
  const manager = globalManagers.get(userId);
  if (manager) {
    console.log(`[WebSocket] Disconnecting WebSocket for user ${userId}`);
    manager.disconnect();
  }
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
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isIntentionalDisconnect = false;
  private connectionKey: string;

  static getInstance(
    url: string,
    gameId?: string,
    user?: { userId: string; username: string }
  ): WebSocketManager {
    // Use same instance for both queue and game for a given user
    // This prevents disconnection when transitioning from queue to game
    const key = user ? user.userId : 'anonymous';
    
    let instance = globalManagers.get(key);
    if (!instance) {
      instance = new WebSocketManager(url, gameId, user, key);
      globalManagers.set(key, instance);
    } else {
      // Update gameId if transitioning from queue to game
      if (gameId && gameId !== instance.gameId) {
        console.log(`[WebSocket] Updating gameId from ${instance.gameId || 'queue'} to ${gameId}`);
        instance.gameId = gameId;
        // If already authenticated, join the game immediately
        if (instance.store.authenticated && instance.store.ws?.readyState === WebSocket.OPEN) {
          instance.joinGame(gameId);
        }
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
    // Store parameters for use in class methods
    this.url = url;
    this.gameId = gameId;
    this.user = user;
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
      console.log(`[WebSocket] Attempting to connect to: ${this.url}`);
      console.log(`[WebSocket] Connection key: ${this.connectionKey}`);
      console.log(`[WebSocket] GameId: ${this.gameId || 'none (queue mode)'}`);
      this.store.ws = new WebSocket(this.url);
      
      this.store.ws.onopen = () => {
        console.log('[WebSocket] Connected successfully!');
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
        const msg = JSON.parse(event.data) as ServerMsg;
        this.handleMessage(msg);
      };

      this.store.ws.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
        this.updateStore({ error: 'Connection error occurred' });
      };

      this.store.ws.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', { code: event.code, reason: event.reason });
        this.updateStore({ connected: false, authenticated: false });
        
        // Handle session takeover (code 1000 with specific reason)
        if (event.code === 1000 && event.reason === 'Session takeover') {
          console.log('[WebSocket] Session taken over by another connection');
          this.updateStore({ error: 'Your session was opened in another tab or window' });
          // Don't try to reconnect - the other tab has taken over
          return;
        }
        
        if (!this.isIntentionalDisconnect && !this.reconnectTimeout) {
          console.log('[WebSocket] Will reconnect in 3 seconds...');
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
    if (!this.user || !this.store.ws) {
      console.log('[WebSocket] Cannot authenticate - missing user or ws:', { user: this.user, ws: !!this.store.ws });
      return;
    }
    
    console.log('[WebSocket] Sending authentication:', { userId: this.user.userId, username: this.user.username });
    this.store.ws.send(JSON.stringify({
      type: 'authenticate',
      userId: this.user.userId,
      username: this.user.username,
    }));
  }

  private handleMessage(msg: ServerMsg) {
    switch (msg.type) {
      case 'authenticated':
        console.log('[WebSocket] Authentication confirmed');
        this.updateStore({ authenticated: true });
        if (this.gameId) {
          console.log('[WebSocket] Joining game:', this.gameId);
          this.joinGame(this.gameId);
        } else {
          console.log('[WebSocket] No gameId - in queue mode');
        }
        break;
      
      case 'state': {
        // Only update if state actually changed
        const newState: GameState = {
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
          status: msg.status,
          winner: msg.winner,
          isSoloGame: msg.isSoloGame,
        };
        
        console.log('[WebSocket] Game state received:', { 
          gameId: msg.gameId, 
          players: msg.players,
          turn: msg.turn,
          nextAction: msg.nextAction,
          status: msg.status,
          winner: msg.winner
        });
        
        // Deep equality check could be added here for further optimization
        this.updateStore({ gameState: newState });
        break;
      }
      
      case 'joined':
        console.log('[WebSocket] Joined game successfully:', { color: msg.color, players: msg.players });
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
        console.log('[WebSocket] Matched with opponent:', msg);
        this.updateStore({ matched: msg });
        break;
      
      case 'error':
        console.error('[WebSocket] Server error:', msg.message);
        // Don't show session takeover as an error - it's expected behavior
        if (!msg.message.includes('session has been taken over')) {
          this.updateStore({ error: msg.message });
        }
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
    if (!this.store.ws || !this.store.authenticated) {
      console.log('[WebSocket] Cannot join game - not connected or authenticated:', 
        { connected: !!this.store.ws, authenticated: this.store.authenticated });
      return;
    }
    
    console.log('[WebSocket] Sending join-game request for:', gameId);
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
    if (!this.store.ws || !this.gameId) return;
    
    this.store.ws.send(JSON.stringify({
      type: 'move',
      gameId: this.gameId,
      move,
    }));
  };

  sendBan = (ban: Ban) => {
    if (!this.store.ws || !this.gameId) return;
    
    this.store.ws.send(JSON.stringify({
      type: 'ban',
      gameId: this.gameId,
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
  // Get or create manager instance immediately if user exists
  // This ensures the manager is available on first render
  const manager = useMemo(() => {
    if (!user) return null;
    
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8081';
    
    console.log('[WebSocket] Creating/getting manager for user:', user.username);
    
    return WebSocketManager.getInstance(
      wsUrl,
      gameId,
      user
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, user?.userId, user?.username]); // Only recreate if user identity actually changes
  
  // Handle production warning and cleanup
  useEffect(() => {
    if (user) {
      // If we're in production and no explicit WS_URL is set, show an error
      if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !process.env.NEXT_PUBLIC_WS_URL) {
        console.error('[WebSocket] Production deployment detected but NEXT_PUBLIC_WS_URL is not configured!');
        console.error('[WebSocket] Please set NEXT_PUBLIC_WS_URL to your WebSocket server URL');
      }
      
      // Note: We no longer disconnect on page unload because:
      // 1. The server now handles session takeover gracefully
      // 2. This allows users to refresh the page without losing their session
      // 3. Multiple tabs can be handled by the server's session takeover logic
    }
  }, [user]);
  
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
    ws: store.ws, // Expose WebSocket instance for custom messages
  }), [store, sendMove, sendBan, joinQueue, leaveQueue]);
}

export function useQueue(user?: { userId: string; username: string }) {
  return useWebSocket(undefined, user);
}