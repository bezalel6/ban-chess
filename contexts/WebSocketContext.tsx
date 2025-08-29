"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import useWebSocket from "react-use-websocket";
import { useAuth } from "@/components/AuthProvider";
import { config } from "@/lib/config";

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
  
  // Build WebSocket URL - authentication is handled via cookies/headers
  const socketUrl = useMemo(() => {
    if (!user) return null;
    
    // Just use the base URL - auth is handled by NextAuth cookies
    return config.websocket.url;
  }, [user]);

  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
    share: true, // Share connection across components
    shouldReconnect: () => true,
    reconnectAttempts: config.websocket.maxReconnectAttempts,
    reconnectInterval: config.websocket.reconnectInterval,
    // Prevent connection dropping during hot reload
    retryOnError: true,
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
