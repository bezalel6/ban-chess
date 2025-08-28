// This is a true singleton that will persist across module reloads.
import type { SimpleServerMsg, SimpleClientMsg } from './game-types';

// --- TRUE SINGLETON IMPLEMENTATION ---
// By attaching the instance to the global object, we ensure that even with
// Next.js Fast Refresh, there is only ONE instance of the WebSocket client.
const globalForWs = globalThis as unknown as { wsClientInstance: WebSocketClient | undefined };

class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Set<(msg: SimpleServerMsg) => void> = new Set();
  private url: string;
  private connectionPromise: Promise<void> | null = null;
  private isConnecting: boolean = false;

  constructor() {
    this.url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8081';
  }

  public connect(user: { userId: string; username: string }): Promise<void> {
    // If we are already connected, resolve immediately.
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    // If a connection attempt is already in progress, return the existing promise.
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = new Promise((resolve, reject) => {
      console.log('[WS Client] Initiating connection...');
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnecting = false;
        console.log('[WS Client] Connected.');
        this.send({ type: 'authenticate', userId: user.userId, username: user.username });
        resolve();
      };

      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data) as SimpleServerMsg;
        this.listeners.forEach(listener => listener(msg));
      };

      this.ws.onclose = (event) => {
        this.isConnecting = false;
        console.log('[WS Client] Disconnected.', event.reason);
        this.ws = null;
        this.connectionPromise = null;
      };

      this.ws.onerror = (error) => {
        this.isConnecting = false;
        console.error('[WS Client] Error:', error);
        this.ws = null;
        this.connectionPromise = null;
        reject(new Error('WebSocket connection failed'));
      };
    });

    return this.connectionPromise;
  }

  public send(msg: SimpleClientMsg) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn('[WS Client] Cannot send message, socket not open.', msg);
    }
  }

  public subscribe(listener: (msg: SimpleServerMsg) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getConnectionState(): 'connected' | 'disconnected' {
    return this.ws?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected';
  }
}

// Assign the instance to the global object if it doesn't exist, otherwise reuse it.
if (!globalForWs.wsClientInstance) {
  globalForWs.wsClientInstance = new WebSocketClient();
}

export const wsClient = globalForWs.wsClientInstance;
