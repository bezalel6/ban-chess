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

  // Connect when user is available (including anonymous users)
  useEffect(() => {
    if (user?.userId && user?.username) {
      // Connect with auth data (works for both anonymous and authenticated users)
      wsManager.connect({
        userId: user.userId,
        username: user.username,
      });

      // Send authentication message once connected
      // Anonymous users have provider: 'guest'
      const unsubscribe = wsManager.subscribeToConnectionState((state) => {
        if (state.connected && !state.authenticated) {
          wsManager.send({
            type: "authenticate",
            userId: user.userId,
            username: user.username,
            provider: user.provider || "guest", // Default to guest for anonymous users
          });
        }
      });

      return unsubscribe;
    }
    // Note: We don't disconnect if no user - anonymous users are created automatically
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