'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import useWebSocket from 'react-use-websocket';
import { useAuth } from '@/components/AuthProvider';
import { config } from '@/lib/config';

interface WebSocketContextType {
  sendMessage: (message: string) => void;
  lastMessage: MessageEvent<string> | null;
  readyState: number;
}

// This context will provide the raw functions from the hook
const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function useGameWebSocket() {
  return useContext(WebSocketContext);
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const socketUrl = useMemo(() => {
    if (!user || !user.userId || !user.username || !user.provider) return null;

    const url = new URL(config.websocket.url);
    url.searchParams.set('username', user.username);
    url.searchParams.set('providerId', user.userId);
    url.searchParams.set('provider', user.provider);

    console.log('[WebSocketProvider] socketUrl:', url.toString());
    return url.toString();
  }, [user]);

  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
    share: true,
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: attemptNumber =>
      Math.min(Math.pow(2, attemptNumber) * 1000, 10000), // Exponential backoff: 1s, 2s, 4s, 8s, max 10s
    retryOnError: true,
    heartbeat: {
      message: 'ping',
      returnMessage: 'pong',
      interval: 25000, // Send ping every 25 seconds (before server's 30s timeout)
      timeout: 60000, // Allow 60 seconds for response
    },
    filter: message => {
      // Filter out ping/pong messages to prevent unnecessary re-renders
      try {
        const data = JSON.parse(message.data);
        if (data.type === 'pong') {
          return false; // Don't pass pong messages to components
        }
      } catch {
        // Not JSON, pass it through
      }
      return true;
    },
  });

  // Remove authentication from here - it's handled in useGameState hook

  const value = {
    sendMessage,
    lastMessage,
    readyState,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}
