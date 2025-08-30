'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameWebSocket } from '@/contexts/WebSocketContext';
import { useAuth } from '@/components/AuthProvider';
import { useGameState } from '@/hooks/useGameState';
import { ReadyState } from 'react-use-websocket';
import {
  Wifi,
  WifiOff,
  Activity,
  User,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Move,
  Ban,
  Clock,
  UserPlus,
  Users,
  Crown,
  Shield,
  GamepadIcon,
  Heart,
  Info,
} from 'lucide-react';

interface MessageEvent {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  icon: React.ElementType;
  color: string;
}

export default function WebSocketStatusWidget() {
  const { user } = useAuth();
  const wsContext = useGameWebSocket();
  const { isAuthenticated, currentGameId, gameState } = useGameState();
  const [isExpanded, setIsExpanded] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [lastPingTime, setLastPingTime] = useState<Date | null>(null);
  const [messageEvents, setMessageEvents] = useState<MessageEvent[]>([]);
  const eventIdCounter = useRef(0);

  const readyState = wsContext?.readyState ?? ReadyState.UNINSTANTIATED;
  const lastMessage = wsContext?.lastMessage ?? null;

  // Calculate connection status
  const getConnectionStatus = () => {
    switch (readyState) {
      case ReadyState.CONNECTING:
        return { text: 'Connecting', color: 'text-yellow-500', icon: Activity };
      case ReadyState.OPEN:
        if (!isAuthenticated) {
          return {
            text: 'Authenticating',
            color: 'text-yellow-500',
            icon: User,
          };
        }
        return { text: 'Connected', color: 'text-green-500', icon: Wifi };
      case ReadyState.CLOSING:
        return { text: 'Closing', color: 'text-orange-500', icon: WifiOff };
      case ReadyState.CLOSED:
        return { text: 'Disconnected', color: 'text-red-500', icon: WifiOff };
      case ReadyState.UNINSTANTIATED:
        return { text: 'Not Started', color: 'text-gray-500', icon: WifiOff };
      default:
        return { text: 'Unknown', color: 'text-gray-500', icon: AlertCircle };
    }
  };

  // Parse message type and create event description
  const parseMessageEvent = (
    data: Record<string, unknown>
  ): MessageEvent | null => {
    const id = `msg-${eventIdCounter.current++}`;
    const timestamp = new Date();

    switch (data.type) {
      case 'state':
        if (data.lastMove) {
          const move = data.lastMove as
            | { from?: string; to?: string; san?: string }
            | string;
          const moveDesc =
            typeof move === 'string'
              ? move
              : move.from && move.to
                ? `${move.from}→${move.to}`
                : move.san
                  ? move.san
                  : 'moved';
          return {
            id,
            type: 'move',
            timestamp,
            description: `Move: ${moveDesc}`,
            icon: Move,
            color: 'text-blue-500',
          };
        }
        if (data.nextAction === 'ban') {
          return {
            id,
            type: 'ban-turn',
            timestamp,
            description: 'Ban phase active',
            icon: Ban,
            color: 'text-orange-500',
          };
        }
        return {
          id,
          type: 'state',
          timestamp,
          description: 'Game state synced',
          icon: Info,
          color: 'text-gray-500',
        };

      case 'authenticated':
        return {
          id,
          type: 'auth',
          timestamp,
          description: `Authenticated as ${data.username}`,
          icon: Shield,
          color: 'text-green-500',
        };

      case 'joined':
        return {
          id,
          type: 'joined',
          timestamp,
          description: `Joined game as ${data.color}`,
          icon: UserPlus,
          color: 'text-purple-500',
        };

      case 'matched':
        return {
          id,
          type: 'matched',
          timestamp,
          description: `Matched with ${data.opponent || 'opponent'}`,
          icon: Users,
          color: 'text-indigo-500',
        };

      case 'queued':
        return {
          id,
          type: 'queued',
          timestamp,
          description: `Queue position: ${data.position}`,
          icon: Clock,
          color: 'text-yellow-500',
        };

      case 'solo-game-created':
        return {
          id,
          type: 'solo',
          timestamp,
          description: 'Solo game created',
          icon: GamepadIcon,
          color: 'text-cyan-500',
        };

      case 'clock-update':
        return {
          id,
          type: 'clock',
          timestamp,
          description: 'Clock updated',
          icon: Clock,
          color: 'text-orange-500',
        };

      case 'timeout':
        return {
          id,
          type: 'timeout',
          timestamp,
          description: `${data.winner} wins on time`,
          icon: Crown,
          color: 'text-red-500',
        };

      case 'game-event':
        {
          const event = data.event as {
            type?: string;
            from?: string;
            to?: string;
            amount?: number;
          };
          if (event?.type === 'ban') {
            return {
              id,
              type: 'ban',
              timestamp,
              description: `Ban: ${event.from}-${event.to}`,
              icon: Ban,
              color: 'text-red-500',
            };
          }
          if (event?.type === 'give-time') {
            return {
              id,
              type: 'give-time',
              timestamp,
              description: `+${event.amount}s given`,
              icon: Heart,
              color: 'text-pink-500',
            };
          }
        }
        return null;

      case 'error':
        return {
          id,
          type: 'error',
          timestamp,
          description: String(data.message || 'Unknown error'),
          icon: AlertCircle,
          color: 'text-red-500',
        };

      default:
        return null;
    }
  };

  // Track ping/pong for latency and parse messages
  useEffect(() => {
    if (lastMessage?.data) {
      try {
        const data = JSON.parse(lastMessage.data);

        // Handle ping/pong
        if (data.type === 'pong') {
          if (lastPingTime) {
            const newLatency = Date.now() - lastPingTime.getTime();
            setLatency(newLatency);
          }
        } else if (data.type === 'ping') {
          setLastPingTime(new Date());
        } else {
          // Parse other message types
          const event = parseMessageEvent(data);
          if (event) {
            setMessageEvents(prev => {
              const newEvents = [event, ...prev].slice(0, 5); // Keep last 5 events
              return newEvents;
            });
          }
        }
      } catch {
        // Not JSON, ignore
      }
    }
  }, [lastMessage, lastPingTime]);

  const status = getConnectionStatus();
  const StatusIcon = status.icon;

  // Get WebSocket URL from environment
  const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001';
  const isSecure = wsUrl.startsWith('wss://');

  // Don't render if no WebSocket context
  if (!wsContext) return null;

  return (
    <div className='fixed bottom-4 right-4 z-50'>
      <div
        className={`bg-background-secondary border border-border rounded-lg shadow-lg transition-all duration-300 ${
          isExpanded ? 'w-80' : 'w-48'
        }`}
      >
        {/* Header - Always visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className='w-full px-3 py-2 flex items-center justify-between hover:bg-background-tertiary rounded-t-lg transition-colors'
        >
          <div className='flex items-center gap-2'>
            <StatusIcon className={`h-4 w-4 ${status.color}`} />
            <span className={`text-sm font-medium ${status.color}`}>
              {status.text}
            </span>
          </div>
          {isExpanded ? (
            <ChevronDown className='h-4 w-4 text-muted-foreground' />
          ) : (
            <ChevronUp className='h-4 w-4 text-muted-foreground' />
          )}
        </button>

        {/* Expanded Details */}
        {isExpanded && (
          <div className='px-3 py-2 space-y-2 text-xs border-t border-border'>
            {/* Activity Feed */}
            {messageEvents.length > 0 && (
              <div className='space-y-1 pb-2 border-b border-border'>
                <div className='text-muted-foreground font-semibold mb-1'>
                  Recent Activity:
                </div>
                {messageEvents.map(event => {
                  const EventIcon = event.icon;
                  return (
                    <div
                      key={event.id}
                      className='flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200'
                    >
                      <EventIcon
                        className={`h-3 w-3 ${event.color} flex-shrink-0`}
                      />
                      <span className='text-[11px] truncate flex-1'>
                        {event.description}
                      </span>
                      <span className='text-[10px] text-muted-foreground'>
                        {event.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* User Info */}
            {user && (
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>User:</span>
                <span className='font-mono'>{user.username || 'Guest'}</span>
              </div>
            )}

            {/* WebSocket URL */}
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>Server:</span>
              <div className='flex items-center gap-1'>
                {isSecure && (
                  <span className='text-green-500' title='Secure connection'>
                    🔒
                  </span>
                )}
                <span
                  className='font-mono truncate max-w-[140px]'
                  title={wsUrl}
                >
                  {wsUrl.replace(/^wss?:\/\//, '')}
                </span>
              </div>
            </div>

            {/* Authentication Status */}
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>Auth:</span>
              <span
                className={`font-mono ${isAuthenticated ? 'text-green-500' : 'text-yellow-500'}`}
              >
                {isAuthenticated ? 'Yes' : 'No'}
              </span>
            </div>

            {/* Latency */}
            {latency !== null && (
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>Latency:</span>
                <span
                  className={`font-mono ${
                    latency < 50
                      ? 'text-green-500'
                      : latency < 150
                        ? 'text-yellow-500'
                        : 'text-red-500'
                  }`}
                >
                  {latency}ms
                </span>
              </div>
            )}

            {/* Game Info */}
            {currentGameId && (
              <div className='space-y-1 pt-1 border-t border-border'>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>Game ID:</span>
                  <span
                    className='font-mono text-[10px] truncate max-w-[140px]'
                    title={currentGameId}
                  >
                    {currentGameId.slice(0, 8)}...
                  </span>
                </div>
                {gameState && (
                  <>
                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground'>Playing as:</span>
                      <span className='font-mono'>
                        {gameState.playerColor === 'white'
                          ? '♔ White'
                          : '♚ Black'}
                      </span>
                    </div>
                    {gameState.gameOver && (
                      <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground'>Status:</span>
                        <span className='font-mono text-lichess-orange-500'>
                          Game Over
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Connection State Details */}
            <div className='pt-1 border-t border-border'>
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>Ready State:</span>
                <span className='font-mono'>{readyState}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
