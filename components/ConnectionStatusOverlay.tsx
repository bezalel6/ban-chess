'use client';

import { useGameState } from '@/hooks/useGameState';
import { useAuth } from '@/components/AuthProvider';
import { ReadyState } from 'react-use-websocket';
import { useState, useEffect } from 'react';

export default function ConnectionStatusOverlay() {
  const { user } = useAuth();
  const { readyState, isAuthenticated } = useGameState();
  const [showOverlay, setShowOverlay] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  useEffect(() => {
    // Only show overlay after a delay to avoid flashing during normal reconnects
    let timer: ReturnType<typeof setTimeout>;

    const shouldShow =
      user &&
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

  // Don't show overlay if no user or not needed
  if (!user || !showOverlay) {
    return null;
  }

  let message = 'Connecting...';
  if (readyState === ReadyState.CONNECTING) {
    message =
      reconnectAttempt > 0
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
    <div className='fixed inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-sm'>
      <div className='text-center text-white'>
        <div className='loading-spinner mb-4'></div>
        <p className='text-lg font-semibold'>{message}</p>
      </div>
    </div>
  );
}
