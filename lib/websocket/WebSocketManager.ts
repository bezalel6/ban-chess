import { config } from '@/lib/config';

type MessageHandler<T = unknown> = (message: T) => void;
type ConnectionStateHandler = (state: ConnectionState) => void;

export interface ConnectionState {
  connected: boolean;
  authenticated: boolean;
  reconnectAttempts: number;
  lastError?: string;
}

export interface WebSocketMessage {
  type: string;
  messageId?: string;
  [key: string]: unknown;
}

/**
 * Singleton WebSocket manager following Lichess architecture patterns.
 * Maintains a single WebSocket connection for the entire application.
 */
export class WebSocketManager {
  private static instance: WebSocketManager;
  private connection: WebSocket | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private connectionHandlers: Set<ConnectionStateHandler> = new Set();
  private processedMessages: Set<string> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private connectionState: ConnectionState = {
    connected: false,
    authenticated: false,
    reconnectAttempts: 0
  };
  private messageQueue: WebSocketMessage[] = [];
  private authData?: { userId: string; username: string };

  private constructor() {
    // Private constructor for singleton pattern
    if (typeof window !== 'undefined') {
      // Make available for debugging
      (window as unknown as { wsManager: WebSocketManager }).wsManager = this;
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Connect to WebSocket server
   */
  public connect(authData?: { userId: string; username: string }): void {
    // Store auth data for reconnection
    if (authData) {
      this.authData = authData;
    }

    // If already connected and authenticated, do nothing
    if (this.connection?.readyState === WebSocket.OPEN && this.connectionState.authenticated) {
      console.log('[WSManager] Already connected and authenticated');
      return;
    }

    // If connecting, wait
    if (this.connection?.readyState === WebSocket.CONNECTING) {
      console.log('[WSManager] Connection already in progress');
      return;
    }

    this.disconnect();
    this.establishConnection();
  }

  /**
   * Establish WebSocket connection
   */
  private establishConnection(): void {
    const url = config.websocket.url;
    console.log('[WSManager] Establishing connection to:', url);

    try {
      this.connection = new WebSocket(url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('[WSManager] Failed to create WebSocket:', error);
      this.handleConnectionError(error);
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.connection) return;

    this.connection.onopen = () => {
      console.log('[WSManager] Connected');
      this.reconnectAttempts = 0;
      this.updateConnectionState({ 
        connected: true, 
        authenticated: false,
        reconnectAttempts: 0 
      });
      
      // Send queued messages
      this.flushMessageQueue();
      
      // Start heartbeat
      this.startHeartbeat();
    };

    this.connection.onmessage = (event) => {
      this.handleMessage(event);
    };

    this.connection.onclose = (event) => {
      console.log('[WSManager] Connection closed:', event.code, event.reason);
      this.updateConnectionState({ 
        connected: false, 
        authenticated: false,
        reconnectAttempts: this.reconnectAttempts 
      });
      
      this.stopHeartbeat();
      
      // Auto-reconnect unless explicitly closed
      if (event.code !== 1000) {
        this.scheduleReconnect();
      }
    };

    this.connection.onerror = (error) => {
      console.error('[WSManager] WebSocket error:', error);
      this.handleConnectionError(error);
    };
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // Skip pong messages
      if (message.type === 'pong') {
        return;
      }

      // Handle authentication
      if (message.type === 'authenticated') {
        this.updateConnectionState({ 
          ...this.connectionState,
          authenticated: true 
        });
        console.log('[WSManager] Authenticated successfully');
      }

      // Check for duplicate messages
      if (message.messageId) {
        if (this.processedMessages.has(message.messageId)) {
          console.log('[WSManager] Skipping duplicate message:', message.messageId);
          return;
        }
        
        this.processedMessages.add(message.messageId);
        
        // Cleanup old message IDs
        if (this.processedMessages.size > 1000) {
          const ids = Array.from(this.processedMessages);
          this.processedMessages = new Set(ids.slice(-500));
        }
      }

      // Route message to handlers
      this.routeMessage(message);
      
    } catch (error) {
      console.error('[WSManager] Failed to parse message:', error);
    }
  }

  /**
   * Route message to registered handlers
   */
  private routeMessage(message: WebSocketMessage): void {
    // Global handlers (*)
    const globalHandlers = this.messageHandlers.get('*') || new Set();
    globalHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('[WSManager] Handler error:', error);
      }
    });

    // Type-specific handlers
    const handlers = this.messageHandlers.get(message.type) || new Set();
    handlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('[WSManager] Handler error:', error);
      }
    });
  }

  /**
   * Subscribe to messages
   * @param messageType - Message type to subscribe to, or '*' for all messages
   * @param handler - Handler function
   * @returns Unsubscribe function
   */
  public subscribe<T = unknown>(messageType: string, handler: MessageHandler<T>): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    
    this.messageHandlers.get(messageType)!.add(handler as MessageHandler<unknown>);
    
    return () => {
      this.messageHandlers.get(messageType)?.delete(handler as MessageHandler<unknown>);
      if (this.messageHandlers.get(messageType)?.size === 0) {
        this.messageHandlers.delete(messageType);
      }
    };
  }

  /**
   * Subscribe to connection state changes
   */
  public subscribeToConnectionState(handler: ConnectionStateHandler): () => void {
    this.connectionHandlers.add(handler);
    
    // Send current state immediately
    handler(this.connectionState);
    
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  /**
   * Send message through WebSocket
   */
  public send(message: unknown): void {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    
    if (this.connection?.readyState === WebSocket.OPEN) {
      this.connection.send(messageStr);
    } else {
      console.warn('[WSManager] Not connected, queueing message');
      this.messageQueue.push(message as WebSocketMessage);
    }
  }

  /**
   * Disconnect WebSocket
   */
  public disconnect(): void {
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    if (this.connection) {
      this.connection.close(1000, 'Client disconnect');
      this.connection = null;
    }
    
    this.updateConnectionState({
      connected: false,
      authenticated: false,
      reconnectAttempts: 0
    });
  }

  /**
   * Update connection state and notify listeners
   */
  private updateConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.connectionHandlers.forEach(handler => {
      try {
        handler(state);
      } catch (error) {
        console.error('[WSManager] Connection handler error:', error);
      }
    });
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: unknown): void {
    const errorMsg = (error as Error)?.message || 'Unknown error';
    this.updateConnectionState({
      ...this.connectionState,
      lastError: errorMsg
    });
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.reconnectAttempts++;
    const delay = Math.min(Math.pow(2, this.reconnectAttempts) * 1000, 30000); // Max 30s
    
    console.log(`[WSManager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect(this.authData);
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.connection?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 25000); // Every 25 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.connection?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Check if connected and authenticated
   */
  public isReady(): boolean {
    return this.connectionState.connected && this.connectionState.authenticated;
  }
}

// Export singleton instance for convenience
export const wsManager = WebSocketManager.getInstance();