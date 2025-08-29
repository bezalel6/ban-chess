'use client';

import { useGameState } from '@/hooks/useGameState';
import { useAuth } from '@/components/AuthProvider';
import { ReadyState } from 'react-use-websocket';

export default function ConnectionStatusOverlay() {
  const { user } = useAuth();
  const { readyState, isAuthenticated } = useGameState();

  // Don't show overlay if no user (middleware handles redirect)
  if (!user) {
    return null;
  }

  const isConnected = readyState === ReadyState.OPEN && isAuthenticated;

  // Don't show overlay if connected and authenticated
  if (isConnected) {
    return null;
  }

  // Only show overlay when actually trying to connect
  if (readyState === ReadyState.UNINSTANTIATED) {
    return null; // WebSocket not initialized yet
  }

  let message = 'Connecting...';
  if (readyState === ReadyState.CONNECTING) {
    message = 'Connecting to server...';
  } else if (readyState === ReadyState.OPEN && !isAuthenticated) {
    message = 'Authenticating...';
  } else if (readyState === ReadyState.CLOSED) {
    message = 'Connection lost. Reconnecting...';
  } else if (readyState === ReadyState.CLOSING) {
    message = 'Disconnecting...';
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-sm">
      <div className="text-center text-white">
        <div className="loading-spinner mb-4"></div>
        <p className="text-lg font-semibold">{message}</p>
      </div>
    </div>
  );
}
