"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useState,
  useRef,
  useEffect,
} from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { useAuth } from "@/components/AuthProvider";
import { config } from "@/lib/config";

interface WebSocketContextType {
  sendMessage: (message: string) => void;
  lastMessage: MessageEvent<string> | null;
  readyState: number;
  isAuthenticated: boolean;
}

// This context will provide the raw functions from the hook
const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function useGameWebSocket() {
  return useContext(WebSocketContext);
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const authSentRef = useRef(false);

  const socketUrl = useMemo(() => {
    // Only connect if user is authenticated
    // Cookies will be sent automatically with the WebSocket handshake
    if (!user || !user.userId || !user.username || !user.provider) return null;

    // No need to add auth params to URL - cookies will handle authentication
    const url = config.websocket.url;
    console.log("[WebSocketProvider] Connecting with session cookies to:", url);
    return url;
  }, [user]);

  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
    share: true,
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: (attemptNumber) =>
      Math.min(Math.pow(2, attemptNumber) * 1000, 10000), // Exponential backoff: 1s, 2s, 4s, 8s, max 10s
    retryOnError: true,
    heartbeat: {
      message: "ping",
      returnMessage: "pong",
      interval: 25000, // Send ping every 25 seconds (before server's 30s timeout)
      timeout: 60000, // Allow 60 seconds for response
    },
    filter: (message) => {
      // Filter out ping/pong messages to prevent unnecessary re-renders
      try {
        const data = JSON.parse(message.data);
        if (data.type === "pong") {
          return false; // Don't pass pong messages to components
        }
      } catch {
        // Not JSON, pass it through
      }
      return true;
    },
  });

  // Monitor connection state for authentication status
  useEffect(() => {
    // Connection is authenticated automatically via cookies during handshake
    if (readyState === ReadyState.OPEN && user) {
      console.log("[WebSocketProvider] Connection established with cookie authentication");
      // No need to send authentication message - server validates cookies automatically
    }

    // Reset auth flag when connection closes
    if (readyState === ReadyState.CLOSED || readyState === ReadyState.CLOSING) {
      authSentRef.current = false;
      setIsAuthenticated(false);
    }
  }, [readyState, user]);

  // Listen for authentication confirmation
  useEffect(() => {
    if (!lastMessage) return;
    try {
      const data = JSON.parse(lastMessage.data);
      if (data.type === "authenticated") {
        setIsAuthenticated(true);
        console.log("[WebSocketProvider] Authenticated successfully");
      }
    } catch {
      // Not JSON or not an auth message
    }
  }, [lastMessage]);

  const value = {
    sendMessage,
    lastMessage,
    readyState,
    isAuthenticated,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}
