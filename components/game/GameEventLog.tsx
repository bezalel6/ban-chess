'use client';

import { GameEvent } from '@/lib/game-types';
import { useMemo } from 'react';

interface GameEventLogProps {
  events: GameEvent[];
}

export default function GameEventLog({ events }: GameEventLogProps) {
  // Sort events by timestamp (most recent first)
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => b.timestamp - a.timestamp);
  }, [events]);

  const getEventColorClass = (type: GameEvent['type']) => {
    switch (type) {
      case 'time-given': 
        return 'text-blue-400';
      case 'checkmate': 
        return 'text-red-400';
      case 'stalemate':
      case 'draw': 
        return 'text-yellow-400';
      case 'timeout':
        return 'text-orange-400';
      case 'move-made':
      case 'ban-made':
        return 'text-foreground-muted';
      case 'game-started':
      case 'player-joined':
        return 'text-green-400';
      case 'resignation':
        return 'text-red-300';
      default: 
        return 'text-foreground-muted';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="bg-background-secondary rounded-lg p-4 h-full flex flex-col">
      <h3 className="text-sm font-semibold mb-3 text-foreground">Game Events</h3>
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {sortedEvents.length === 0 ? (
          <div className="text-xs text-foreground-muted italic">
            No events yet
          </div>
        ) : (
          sortedEvents.map((event, index) => (
            <div 
              key={`${event.timestamp}-${index}`} 
              className="text-xs flex flex-col gap-1 pb-2 border-b border-background-tertiary last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="opacity-60 text-[10px] font-mono">
                  {formatTime(event.timestamp)}
                </span>
                <span className={`${getEventColorClass(event.type)} font-medium`}>
                  {event.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
              <div className="text-foreground-muted pl-2">
                {event.message}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}