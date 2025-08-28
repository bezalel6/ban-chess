'use client';

import { useGameWebSocket } from '@/contexts/WebSocketContext';

export default function GameModeSelector() {
  const { createSoloGame, joinQueue, connected } = useGameWebSocket();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      <button
        onClick={createSoloGame}
        disabled={!connected}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 hover:shadow-lg transition-shadow disabled:opacity-50"
      >
        <h2 className="text-2xl font-bold mb-4">Solo Game</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Play against yourself to practice and explore strategies
        </p>
      </button>
      
      <button
        onClick={joinQueue}
        disabled={!connected}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 hover:shadow-lg transition-shadow disabled:opacity-50"
      >
        <h2 className="text-2xl font-bold mb-4">Find Opponent</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Match with another player online
        </p>
      </button>
    </div>
  );
}