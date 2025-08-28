// Global WebSocket manager - lives outside React lifecycle
import type { SimpleServerMsg, SimpleClientMsg } from './game-types';

class GlobalWebSocket {
  private ws: WebSocket | null = null;
  private listeners = new Set<(msg: SimpleServerMsg) => void>();
  private messageQueue: SimpleClientMsg[] = [];
  private currentUser: { userId: string; username: string } | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Check if we're in the browser
    if (typeof window !== 'undefined') {
      // Attempt to restore connection on page load
      this.init();
    }
  }

  private init() {
    // Get user from session if available
    const storedUser = this.getStoredUser();
    if (storedUser) {
      this.connect(storedUser);
    }
  }

  private getStoredUser(): { userId: string; username: string } | null {
    if (typeof window === 'undefined') return null;
    const stored = sessionStorage.getItem('chess-user');
    return stored ? JSON.parse(stored) : null;
  }

  private storeUser(user: { userId: string; username: string }) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('chess-user', JSON.stringify(user));
    }
  }

  connect(user: { userId: string; username: string }) {
    // Don't reconnect if already connected with same user
    if (this.ws?.readyState === WebSocket.OPEN && 
        this.currentUser?.userId === user.userId) {
      console.log('[GlobalWS] Already connected with same user');
      return;
    }

    // Store user for reconnection
    this.currentUser = user;
    this.storeUser(user);

    // Close existing connection if different user
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }

    const url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8081';
    console.log('[GlobalWS] Connecting to', url);
    
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[GlobalWS] Connected');
      this.reconnectAttempts = 0;
      
      // Authenticate
      this.send({ type: 'authenticate', userId: user.userId, username: user.username });
      
      // Send any queued messages
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift()!;
        this.send(msg);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as SimpleServerMsg;
        console.log('[GlobalWS] Received:', msg.type);
        
        // Notify all listeners
        this.listeners.forEach(listener => {
          try {
            listener(msg);
          } catch (error) {
            console.error('[GlobalWS] Listener error:', error);
          }
        });
      } catch (error) {
        console.error('[GlobalWS] Failed to parse message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('[GlobalWS] Disconnected:', event.code, event.reason);
      this.ws = null;
      
      // Attempt reconnection if not intentional disconnect
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('[GlobalWS] Error:', error);
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    console.log(`[GlobalWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      if (this.currentUser) {
        this.connect(this.currentUser);
      }
    }, delay);
  }

  send(msg: SimpleClientMsg) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[GlobalWS] Sending:', msg.type);
      this.ws.send(JSON.stringify(msg));
    } else {
      console.log('[GlobalWS] Queueing message:', msg.type);
      this.messageQueue.push(msg);
    }
  }

  subscribe(listener: (msg: SimpleServerMsg) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): 'connected' | 'connecting' | 'disconnected' {
    if (!this.ws) return 'disconnected';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      default: return 'disconnected';
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    this.messageQueue = [];
    this.currentUser = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('chess-user');
    }
  }
}

// Create global instance
const globalWS = new GlobalWebSocket();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as unknown as { globalWS: GlobalWebSocket }).globalWS = globalWS;
}

export default globalWS;