'use client';

import { useState } from 'react';
import { useGameWebSocket } from '@/contexts/WebSocketContext';

export default function QueueSection() {
  const { joinQueue, leaveQueue, connected, error } = useGameWebSocket();
  const [inQueue, setInQueue] = useState(false);
  
  const handleJoinQueue = () => {
    joinQueue();
    setInQueue(true);
  };
  
  const handleLeaveQueue = () => {
    leaveQueue();
    setInQueue(false);
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">Matchmaking</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {!connected ? (
        <p className="text-gray-500">Connecting to server...</p>
      ) : inQueue ? (
        <div>
          <p className="mb-4 text-gray-600 dark:text-gray-300">
            Looking for an opponent...
          </p>
          <button
            onClick={handleLeaveQueue}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Leave Queue
          </button>
        </div>
      ) : (
        <button
          onClick={handleJoinQueue}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
        >
          Find Opponent
        </button>
      )}
    </div>
  );
}