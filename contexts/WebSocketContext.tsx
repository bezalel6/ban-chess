'use client';

import { createContext, useContext, ReactNode } from 'react';
import useWebSocket from 'react-use-websocket';
import { useAuth } from '@/components/AuthProvider';

// This context will provide the raw functions from the hook
const WebSocketContext = createContext<any>(null);

export function useGameWebSocket() {
  return useContext(WebSocketContext);
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const socketUrl = user ? 'ws://localhost:8081' : null;

  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
    share: true, // This is the most important part
    shouldReconnect: () => true,
  });

  // Authenticate on connect
  useEffect(() => {
    if (user && readyState === ReadyState.OPEN) {
      sendMessage(JSON.stringify({ 
        type: 'authenticate', 
        userId: user.userId, 
        username: user.username 
      }));
    }
  }, [user, readyState, sendMessage]);

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
