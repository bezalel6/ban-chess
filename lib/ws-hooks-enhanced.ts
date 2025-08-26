'use client';

import { useEffect, useRef, useSyncExternalStore, useCallback } from 'react';
import { useOptimistic } from 'react';
import type { Move, Ban, GameState, ServerMsg, ClientMsg } from './game-types';

// Enhanced WebSocket store with offline support
interface WebSocketStore {
  ws: WebSocket | null;
  gameState: GameState | null;
  error: string | null;
  connected: boolean;
  authenticated: boolean;
  position: number | null;
  matched: { gameId: string; color: 'white' | 'black'; opponent?: string } | null;
  reconnectAttempts: number;
  isOnline: boolean;
  pendingMessages: ClientMsg[];
  lastHeartbeat: number;
}

// Connection states for better UX
export type ConnectionState = 'connecting' | 'connected' | 'authenticating' | 'authenticated' | 'disconnected' | 'reconnecting';

class EnhancedWebSocketManager {
  private store: WebSocketStore = {
    ws: null,
    gameState: null,
    error: null,
    connected: false,
    authenticated: false,
    position: null,
    matched: null,
    reconnectAttempts: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingMessages: [],
    lastHeartbeat: Date.now(),
  };

  private listeners = new Set<() => void>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds

  constructor(
    private readonly url: string,
    private readonly gameId?: string,
    private readonly user?: { userId: string; username: string }
  ) {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }

    this.connect();
  }

  private handleOnline = () => {
    this.updateStore({ isOnline: true, error: null });
    if (!this.store.connected) {
      this.connect();
    }
  };

  private handleOffline = () => {
    this.updateStore({ isOnline: false, error: 'You are offline' });
  };

  private getReconnectDelay(): number {
    // Exponential backoff with jitter
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.store.reconnectAttempts),
      this.maxReconnectDelay
    );
    
    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return delay + jitter;
  }

  private connect() {
    if (!this.store.isOnline) {
      return;
    }

    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      // Close existing connection if any
      if (this.store.ws) {
        this.store.ws.close();
      }

      this.store.ws = new WebSocket(this.url);
      
      this.store.ws.onopen = () => {
        console.log('WebSocket connected');
        this.updateStore({ 
          connected: true, 
          error: null, 
          reconnectAttempts: 0 
        });
        
        this.startHeartbeat();
        
        if (this.user) {
          this.authenticate();
        }
        
        // Send any pending messages
        this.flushPendingMessages();
      };

      this.store.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as ServerMsg;
          this.handleMessage(msg);
          this.updateStore({ lastHeartbeat: Date.now() });
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      this.store.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.updateStore({ error: 'Connection error occurred' });
      };

      this.store.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.updateStore({ connected: false, authenticated: false });
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

    } catch (err) {
      console.error('WebSocket connection failed:', err);
      this.updateStore({ 
        error: err instanceof Error ? err.message : 'Failed to connect',
        connected: false 
      });
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.store.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateStore({ 
        error: 'Connection failed after maximum retry attempts. Please refresh the page.' 
      });
      return;
    }

    const delay = this.getReconnectDelay();
    this.updateStore({ reconnectAttempts: this.store.reconnectAttempts + 1 });
    
    this.reconnectTimer = setTimeout(() => {
      if (this.store.isOnline) {
        console.log(`Reconnection attempt ${this.store.reconnectAttempts}/${this.maxReconnectAttempts}`);
        this.connect();
      }
    }, delay);
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.store.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' } as ClientMsg);
        
        // Check if we haven't received a message in too long
        const timeSinceLastHeartbeat = Date.now() - this.store.lastHeartbeat;
        if (timeSinceLastHeartbeat > 60000) { // 1 minute
          console.warn('No heartbeat received, reconnecting...');
          this.connect();
        }
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private authenticate() {
    if (!this.user || !this.store.ws) return;
    
    this.send({
      type: 'authenticate',
      userId: this.user.userId,
      username: this.user.username,
    });
  }

  private send(msg: ClientMsg) {
    if (this.store.ws?.readyState === WebSocket.OPEN) {
      this.store.ws.send(JSON.stringify(msg));
    } else {
      // Queue message if not connected
      this.store.pendingMessages.push(msg);
      this.updateStore({ pendingMessages: [...this.store.pendingMessages] });
    }
  }

  private flushPendingMessages() {
    const messages = [...this.store.pendingMessages];
    this.updateStore({ pendingMessages: [] });
    
    messages.forEach(msg => {
      if (this.store.ws?.readyState === WebSocket.OPEN) {
        this.store.ws.send(JSON.stringify(msg));
      }
    });
  }

  private handleMessage(msg: ServerMsg) {
    switch (msg.type) {
      case 'authenticated':
        this.updateStore({ authenticated: true });
        if (this.gameId) {
          this.joinGame(this.gameId);
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

      // Handle ping/pong for heartbeat
      case 'pong':
        // Server responded to our ping
        break;
    }
  }

  private updateStore(updates: Partial<WebSocketStore>) {
    this.store = { ...this.store, ...updates };
    this.listeners.forEach(listener => listener());
  }

  private joinGame(gameId: string) {
    if (!this.store.authenticated) return;
    
    this.send({
      type: 'join-game',
      gameId,
    });
  }

  getSnapshot = () => this.store;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  // Public methods
  sendMove = (move: Move) => {
    if (!this.gameId) return;
    
    this.send({
      type: 'move',
      gameId: this.gameId,
      move,
    });
  };

  sendBan = (ban: Ban) => {
    if (!this.gameId) return;
    
    this.send({
      type: 'ban',
      gameId: this.gameId,
      ban,
    });
  };

  joinQueue = () => {
    this.send({ type: 'join-queue' });
  };

  leaveQueue = () => {
    this.send({ type: 'leave-queue' });
  };

  getConnectionState = (): ConnectionState => {
    if (!this.store.isOnline) return 'disconnected';
    if (!this.store.connected) return 'connecting';
    if (this.store.connected && !this.store.authenticated) return 'authenticating';
    if (this.store.authenticated) return 'authenticated';
    return 'disconnected';
  };

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopHeartbeat();
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    
    if (this.store.ws) {
      this.store.ws.close();
    }
  }
}

// Enhanced hook with optimistic updates
export function useEnhancedWebSocket(
  gameId?: string,
  user?: { userId: string; username: string }
) {
  const managerRef = useRef<EnhancedWebSocketManager | null>(null);
  
  if (!managerRef.current) {
    managerRef.current = new EnhancedWebSocketManager(
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

  // Optimistic updates for moves
  const [optimisticGameState, addOptimisticMove] = useOptimistic(
    store.gameState,
    (currentState, optimisticMove: { type: 'move' | 'ban'; data: Move | Ban }): GameState | null => {
      if (!currentState) return currentState;
      
      // Create a proper HistoryEntry for optimistic update
      const optimisticEntry = {
        actionType: optimisticMove.type as 'move' | 'ban',
        action: optimisticMove.data,
        player: currentState.playerColor!,
        san: '', // Will be filled by server
        turnNumber: currentState.history.length + 1,
        fen: currentState.fen, // Keep current FEN for now
      };
      
      // Create optimistic state update
      return {
        ...currentState,
        // Add optimistic move to history (will be replaced by server state)
        history: [...currentState.history, optimisticEntry],
      };
    }
  );

  // Enhanced move function with optimistic updates
  const sendMoveOptimistic = useCallback((move: Move) => {
    // Add optimistic update
    addOptimisticMove({ type: 'move', data: move });
    // Send actual move
    managerRef.current?.sendMove(move);
  }, [addOptimisticMove]);

  const sendBanOptimistic = useCallback((ban: Ban) => {
    // Add optimistic update
    addOptimisticMove({ type: 'ban', data: ban });
    // Send actual ban
    managerRef.current?.sendBan(ban);
  }, [addOptimisticMove]);
  
  useEffect(() => {
    return () => {
      managerRef.current?.disconnect();
      managerRef.current = null;
    };
  }, []);
  
  return {
    ...store,
    gameState: optimisticGameState || store.gameState,
    connectionState: managerRef.current.getConnectionState(),
    sendMove: sendMoveOptimistic,
    sendBan: sendBanOptimistic,
    joinQueue: managerRef.current.joinQueue,
    leaveQueue: managerRef.current.leaveQueue,
  };
}

// Convenience hook for queue functionality
export function useEnhancedQueue(user?: { userId: string; username: string }) {
  return useEnhancedWebSocket(undefined, user);
}