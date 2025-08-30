// True singleton WebSocket that persists across everything
import type { SimpleServerMsg, SimpleClientMsg } from './game-types';

class WebSocketSingleton {
  private static instance: WebSocketSingleton;
  private ws: WebSocket | null = null;
  private listeners = new Set<(msg: SimpleServerMsg) => void>();
  private isAuthenticated = false;
  private currentUser: { userId?: string; username?: string } | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): WebSocketSingleton {
    if (!WebSocketSingleton.instance) {
      WebSocketSingleton.instance = new WebSocketSingleton();
    }
    return WebSocketSingleton.instance;
  }

  connect(user: { userId?: string; username?: string }) {
    console.log(
      '[WS Singleton] connect() called with user:',
      user.username,
      'Current state:',
      {
        wsReady: this.ws?.readyState === WebSocket.OPEN,
        isAuth: this.isAuthenticated,
        sameUser: this.currentUser?.userId === user.userId,
      }
    );

    // If already connected with same user, do nothing
    if (
      this.ws?.readyState === WebSocket.OPEN &&
      this.currentUser?.userId === user.userId &&
      this.isAuthenticated
    ) {
      console.log('[WS Singleton] Already connected and authenticated');
      // Notify listeners that we're already authenticated
      this.listeners.forEach(listener =>
        listener({
          type: 'authenticated',
          userId: user.userId || '',
          username: user.username || '',
        })
      );
      return;
    }

    // If connecting or connected with different user, close and reconnect
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.CONNECTING ||
        this.currentUser?.userId !== user.userId)
    ) {
      console.log('[WS Singleton] Closing existing connection');
      this.ws.close();
      this.ws = null;
      this.isAuthenticated = false;
    }

    // Store user
    this.currentUser = user;

    // Create new connection
    console.log('[WS Singleton] Creating new connection for', user.username);
    this.ws = new WebSocket('ws://localhost:3001');

    this.ws.onopen = () => {
      console.log('[WS Singleton] Connected, authenticating...');
      this.send({
        type: 'authenticate',
        userId: user.userId || '',
        username: user.username || '',
      });
    };

    this.ws.onmessage = event => {
      try {
        const msg = JSON.parse(event.data) as SimpleServerMsg;
        console.log('[WS Singleton] Received:', msg.type);

        if (msg.type === 'authenticated') {
          this.isAuthenticated = true;
          console.log('[WS Singleton] Authenticated successfully');
        }

        // Notify all listeners
        this.listeners.forEach(listener => listener(msg));
      } catch (error) {
        console.error('[WS Singleton] Parse error:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('[WS Singleton] Connection closed');
      this.isAuthenticated = false;
      // Don't set ws to null here - let reconnect handle it
    };

    this.ws.onerror = error => {
      console.error('[WS Singleton] Error:', error);
    };
  }

  send(msg: SimpleClientMsg) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WS Singleton] Sending:', msg.type);
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn('[WS Singleton] Not connected, cannot send:', msg.type);
    }
  }

  subscribe(listener: (msg: SimpleServerMsg) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState() {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      authenticated: this.isAuthenticated,
      user: this.currentUser,
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isAuthenticated = false;
      this.currentUser = null;
    }
  }
}

// Export singleton instance
export const wsConnection = WebSocketSingleton.getInstance();

// Make it available on window for debugging
declare global {
  interface Window {
    wsConnection: WebSocketSingleton;
    wsConnectionInstances: number;
  }
}

if (typeof window !== 'undefined') {
  window.wsConnection = wsConnection;
  // Track how many times this code runs
  window.wsConnectionInstances = (window.wsConnectionInstances || 0) + 1;
  console.log(
    '[WS Singleton] Module loaded, instance count:',
    window.wsConnectionInstances
  );
}
