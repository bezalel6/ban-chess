"use client";

import { useState, useEffect } from "react";
import { useGameWebSocket } from "@/contexts/WebSocketContext";
import { useAuth } from "@/components/AuthProvider";
import { useGame } from "@/contexts/GameContext";
import { ReadyState } from "react-use-websocket";
import {
  Wifi,
  WifiOff,
  Activity,
  User,
  AlertCircle,
  // ChevronUp,
  // ChevronDown,
} from "lucide-react";

export default function WebSocketStatusWidget() {
  const { user } = useAuth();
  const wsContext = useGameWebSocket();
  const { gameState } = useGame();
  // const [isExpanded, setIsExpanded] = useState(false);
  // const [latency, setLatency] = useState<number | null>(null);
  const [lastPingTime, setLastPingTime] = useState<Date | null>(null);

  const readyState = wsContext?.readyState ?? ReadyState.UNINSTANTIATED;
  const isAuthenticated = wsContext?.isAuthenticated ?? false;
  const lastMessage = wsContext?.lastMessage ?? null;
  const currentGameId = gameState?.gameId;

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

  useEffect(() => {
    if (lastMessage?.data) {
      try {
        const data = JSON.parse(lastMessage.data);
        if (data.type === "pong") {
          if (lastPingTime) {
            // const newLatency = Date.now() - lastPingTime.getTime();
            // setLatency(newLatency);
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
  // const StatusIcon = status.icon;

  // const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:3001";
  // const isSecure = wsUrl.startsWith("wss://");

  if (!wsContext) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* ... same as before */}
    </div>
  );
}
