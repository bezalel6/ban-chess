"use client";

import { createContext, useContext, ReactNode } from "react";
import useWebSocket from "react-use-websocket";
import { useAuth } from "@/components/AuthProvider";

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
  const socketUrl = user 
    ? `ws://localhost:8081?username=${encodeURIComponent(user.username)}&providerId=${encodeURIComponent(user.userId)}&provider=lichess`
    : null;

  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
    share: true, // Share connection across components
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 1000,
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
