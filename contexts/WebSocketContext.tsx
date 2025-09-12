"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
  useMemo,
} from "react";
import { useAuth } from "@/components/AuthProvider";
import { wsManager, type ConnectionState } from "@/lib/websocket/WebSocketManager";
import { gameStore } from "@/lib/game/GameStore";

interface WebSocketContextType {
  connectionState: ConnectionState;
  isReady: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within WebSocketProvider");
  }
  return context;
}

/**
 * WebSocketProvider using the singleton WebSocketManager.
 * Following Lichess pattern - single connection at app level.
 */
export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    wsManager.getConnectionState()
  );

  // Connect when user is available
  useEffect(() => {
    if (user?.userId && user?.username) {
      // Connect with auth data
      wsManager.connect({
        userId: user.userId,
        username: user.username,
      });

      // Update GameStore with user info
      gameStore.setUser(user.userId, user.username);

      // Send authentication message once connected
      const unsubscribe = wsManager.subscribeToConnectionState((state) => {
        if (state.connected && !state.authenticated) {
          wsManager.send({
            type: "authenticate",
            userId: user.userId,
            username: user.username,
            provider: user.provider || "credentials",
          });
        }
      });

      return unsubscribe;
    } else {
      // Disconnect if no user
      wsManager.disconnect();
      gameStore.setUser(null, null);
    }
  }, [user]);

  // Subscribe to connection state changes
  useEffect(() => {
    const unsubscribe = wsManager.subscribeToConnectionState(setConnectionState);
    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      connectionState,
      isReady: wsManager.isReady(),
    }),
    [connectionState]
  );

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Temporary compatibility shim for existing code
export function useGameWebSocket() {
  const context = useWebSocket();
  
  // Return a compatibility object that mimics the old interface
  // This will be removed once all components are migrated
  return {
    sendMessage: (message: string) => wsManager.send(JSON.parse(message)),
    lastMessage: null, // Components should use GameStore instead
    readyState: context.connectionState.connected ? 1 : 0, // WebSocket.OPEN = 1
    isAuthenticated: context.connectionState.authenticated,
  };
}