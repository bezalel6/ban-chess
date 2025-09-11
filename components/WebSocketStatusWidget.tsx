"use client";

import { useState, useEffect } from "react";
import { useGameWebSocket } from "@/contexts/WebSocketContext";
import { useAuth } from "@/components/AuthProvider";
import { useGameState } from "@/hooks/useGameState";
import { ReadyState } from "react-use-websocket";
import {
  Wifi,
  WifiOff,
  Activity,
  User,
  AlertCircle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

export default function WebSocketStatusWidget() {
  const { user } = useAuth();
  const wsContext = useGameWebSocket();
  const { isAuthenticated, currentGameId, gameState } = useGameState(undefined, { disableToasts: true });
  const [isExpanded, setIsExpanded] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [lastPingTime, setLastPingTime] = useState<Date | null>(null);

  const readyState = wsContext?.readyState ?? ReadyState.UNINSTANTIATED;
  const lastMessage = wsContext?.lastMessage ?? null;

  // Calculate connection status
  const getConnectionStatus = () => {
    switch (readyState) {
      case ReadyState.CONNECTING:
        return { text: "Connecting", color: "text-yellow-500", icon: Activity };
      case ReadyState.OPEN: {
        if (!isAuthenticated) {
          return {
            text: "Authenticating",
            color: "text-yellow-500",
            icon: User,
          };
        }
        const adminSuffix = user?.isAdmin ? " (Admin)" : "";
        return { text: `Connected${adminSuffix}`, color: "text-green-500", icon: Wifi };
      }
      case ReadyState.CLOSING:
        return { text: "Closing", color: "text-orange-500", icon: WifiOff };
      case ReadyState.CLOSED:
        return { text: "Disconnected", color: "text-red-500", icon: WifiOff };
      case ReadyState.UNINSTANTIATED:
        return { text: "Not Started", color: "text-gray-500", icon: WifiOff };
      default:
        return { text: "Unknown", color: "text-gray-500", icon: AlertCircle };
    }
  };

  // Track ping/pong for latency
  useEffect(() => {
    if (lastMessage?.data) {
      try {
        const data = JSON.parse(lastMessage.data);
        if (data.type === "pong") {
          if (lastPingTime) {
            const newLatency = Date.now() - lastPingTime.getTime();
            setLatency(newLatency);
          }
        } else if (data.type === "ping") {
          setLastPingTime(new Date());
        }
      } catch {
        // Not JSON, ignore
      }
    }
  }, [lastMessage, lastPingTime]);

  const status = getConnectionStatus();
  const StatusIcon = status.icon;

  // Get WebSocket URL from environment
  const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:3001";
  const isSecure = wsUrl.startsWith("wss://");

  // Don't render if no WebSocket context
  if (!wsContext) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`bg-background-secondary border border-border rounded-lg shadow-lg transition-all duration-300 ${
          isExpanded ? "w-80" : "w-48"
        }`}
      >
        {/* Header - Always visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-background-tertiary rounded-t-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${status.color}`} />
            <span className={`text-sm font-medium ${status.color}`}>
              {status.text}
            </span>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="px-3 py-2 space-y-2 text-xs border-t border-border">
            {/* User Info */}
            {user && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">User:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono">{user.username || "Guest"}</span>
                  {user.isAdmin && (
                    <span className="text-yellow-500 text-xs font-bold" title="Administrator">
                      ADMIN
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* WebSocket URL */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Server:</span>
              <div className="flex items-center gap-1">
                {isSecure && (
                  <span className="text-green-500" title="Secure connection">
                    🔒
                  </span>
                )}
                <span
                  className="font-mono truncate max-w-[140px]"
                  title={wsUrl}
                >
                  {wsUrl.replace(/^wss?:\/\//, "")}
                </span>
              </div>
            </div>

            {/* Authentication Status */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Auth:</span>
              <span
                className={`font-mono ${isAuthenticated ? "text-green-500" : "text-yellow-500"}`}
              >
                {isAuthenticated ? "Yes" : "No"}
              </span>
            </div>

            {/* Latency */}
            {latency !== null && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Latency:</span>
                <span
                  className={`font-mono ${
                    latency < 50
                      ? "text-green-500"
                      : latency < 150
                        ? "text-yellow-500"
                        : "text-red-500"
                  }`}
                >
                  {latency}ms
                </span>
              </div>
            )}

            {/* Game Info */}
            {currentGameId && (
              <div className="space-y-1 pt-1 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Game ID:</span>
                  <span
                    className="font-mono text-[10px] truncate max-w-[140px]"
                    title={currentGameId}
                  >
                    {currentGameId.slice(0, 8)}...
                  </span>
                </div>
                {gameState && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">White:</span>
                      <span className="font-mono text-xs">
                        {gameState.players.white?.username || "Waiting..."}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Black:</span>
                      <span className="font-mono text-xs">
                        {gameState.players.black?.username || "Waiting..."}
                      </span>
                    </div>
                    {gameState.gameOver && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="font-mono text-lichess-orange-500">
                          Game Over
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Connection State Details */}
            <div className="pt-1 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ready State:</span>
                <span className="font-mono">{readyState}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
