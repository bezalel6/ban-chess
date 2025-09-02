'use client';

import { useEffect, useState } from 'react';
import { useGameWebSocket } from '@/contexts/WebSocketContext';

interface MessageStats {
  auth: number;
  fullState: number;
  partialState: number;
  clockUpdate: number;
  move: number;
  ban: number;
  other: number;
  total: number;
}

export default function WebSocketStats() {
  const wsContext = useGameWebSocket();
  const [stats, setStats] = useState<MessageStats>({
    auth: 0,
    fullState: 0,
    partialState: 0,
    clockUpdate: 0,
    move: 0,
    ban: 0,
    other: 0,
    total: 0,
  });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!wsContext?.lastMessage) return;

    try {
      const msg = JSON.parse(wsContext.lastMessage.data);
      
      setStats(prev => {
        const newStats = { ...prev, total: prev.total + 1 };
        
        // Categorize message types
        switch (msg.type) {
          case 'authenticated':
            newStats.auth++;
            break;
          case 'state':
            // Check if it's a full state (has players) or partial update
            if (msg.players && msg.history) {
              newStats.fullState++;
            } else {
              newStats.partialState++;
            }
            break;
          case 'clock-update':
            newStats.clockUpdate++;
            break;
          case 'move':
            newStats.move++;
            break;
          case 'ban':
            newStats.ban++;
            break;
          default:
            newStats.other++;
        }
        
        return newStats;
      });
    } catch {
      // Ignore parse errors
    }
  }, [wsContext?.lastMessage]);

  if (!wsContext || stats.total === 0) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-4 right-4 bg-gray-900/95 text-green-400 text-xs font-mono rounded-lg shadow-lg z-50 border border-gray-700 cursor-pointer"
      onClick={() => setShowDetails(!showDetails)}
    >
      {showDetails ? (
        <div className="p-3 min-w-[200px]">
          <div className="text-gray-400 mb-2">WebSocket Stats</div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Auth:</span>
              <span className="text-white">{stats.auth}</span>
            </div>
            <div className="flex justify-between">
              <span>Full State:</span>
              <span className="text-white">{stats.fullState}</span>
            </div>
            <div className="flex justify-between">
              <span>Partial:</span>
              <span className="text-white">{stats.partialState}</span>
            </div>
            <div className="flex justify-between">
              <span>Clock:</span>
              <span className="text-white">{stats.clockUpdate}</span>
            </div>
            <div className="flex justify-between">
              <span>Moves:</span>
              <span className="text-white">{stats.move}</span>
            </div>
            <div className="flex justify-between">
              <span>Bans:</span>
              <span className="text-white">{stats.ban}</span>
            </div>
            <div className="flex justify-between">
              <span>Other:</span>
              <span className="text-white">{stats.other}</span>
            </div>
            <div className="border-t border-gray-600 mt-1 pt-1 flex justify-between">
              <span>Total:</span>
              <span className="text-yellow-400">{stats.total}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-3 py-2 flex items-center gap-2">
          <span className="text-gray-400">WS:</span>
          <span className="text-yellow-400">{stats.total}</span>
          <span className="text-gray-500">msgs</span>
        </div>
      )}
    </div>
  );
}