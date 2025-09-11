'use client';

import { useGameWebSocket } from '@/contexts/WebSocketContext';
import { useAuth } from '@/components/AuthProvider';
import { ReadyState } from 'react-use-websocket';
import { useState, useEffect } from 'react';

export default function ConnectionStatusOverlay() {
  const { user } = useAuth();
  const ws = useGameWebSocket();
  const [showOverlay, setShowOverlay] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const readyState = ws?.readyState ?? ReadyState.UNINSTANTIATED;
  const isAuthenticated = ws?.isAuthenticated ?? false;

  useEffect(() => {
    // Only show overlay after a delay to avoid flashing during normal reconnects
    let timer: ReturnType<typeof setTimeout>;
    
    const shouldShow = user && 
      readyState !== ReadyState.UNINSTANTIATED &&
      !(readyState === ReadyState.OPEN && isAuthenticated);
    
    if (shouldShow) {
      // Wait 1.5 seconds before showing overlay to avoid brief disconnections
      timer = setTimeout(() => {
        setShowOverlay(true);
      }, 1500);
    } else {
      setShowOverlay(false);
      setReconnectAttempt(0);
    }
    
    return () => clearTimeout(timer);
  }, [user, readyState, isAuthenticated]);

  // Track reconnection attempts
  useEffect(() => {
    if (readyState === ReadyState.CLOSED && showOverlay) {
      setReconnectAttempt(prev => prev + 1);
    }
  }, [readyState, showOverlay]);

  if (!ws) {
    return null;
  }

  // Don't show overlay if no user or not needed
  if (!user || !showOverlay) {
    return null;
  }

  let message = 'Connecting...';
  if (readyState === ReadyState.CONNECTING) {
    message = reconnectAttempt > 0 
      ? `Reconnecting... (attempt ${reconnectAttempt})`
      : 'Connecting to server...';
  } else if (readyState === ReadyState.OPEN && !isAuthenticated) {
    message = 'Authenticating...';
  } else if (readyState === ReadyState.CLOSED) {
    message = 'Connection lost. Reconnecting...';
  } else if (readyState === ReadyState.CLOSING) {
    message = 'Disconnecting...';
  }

  return (
    <div className="fixed bottom-4 left-4 bg-gray-900/95 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-3 border border-gray-700">
      <div className="flex gap-1">
        <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse"></span>
        <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse delay-100"></span>
        <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse delay-200"></span>
      </div>
      <p className="text-sm">{message}</p>
    </div>
  );
}
