"use client";

import { useEffect, useState } from "react";
import { wsManager } from "@/lib/websocket/WebSocketManager";
import { useWebSocket } from "@/contexts/WebSocketContext";

type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

export function ConnectionStatus() {
  const { connectionState } = useWebSocket();
  const [wsState, setWsState] = useState<ConnectionState>("disconnected");
  const [showDetails, setShowDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    // Update state based on connection state
    if (connectionState.connected && connectionState.authenticated) {
      setWsState("connected");
      setErrorMessage("");
      // Auto-hide details after successful connection
      setTimeout(() => setShowDetails(false), 3000);
    } else if (connectionState.connected && !connectionState.authenticated) {
      setWsState("connecting");
      setErrorMessage("");
    } else if (connectionState.lastError) {
      setWsState("error");
      setErrorMessage(connectionState.lastError);
      setShowDetails(true); // Auto-show details on error
    } else {
      setWsState("disconnected");
    }
  }, [connectionState]);

  // Subscribe to error messages
  useEffect(() => {
    const unsubscribe = wsManager.subscribe("error", (msg: { message?: string }) => {
      setWsState("error");
      setErrorMessage(msg.message || "Connection error");
      setShowDetails(true);
    });

    return unsubscribe;
  }, []);

  const handleReconnect = () => {
    window.location.reload();
  };

  const getStatusColor = () => {
    switch (wsState) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (wsState) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Authenticating...";
      case "error":
        return "Error";
      default:
        return "Disconnected";
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-background-secondary border border-border shadow-lg hover:shadow-xl transition-all ${
          wsState === "error" ? "animate-pulse" : ""
        }`}
        aria-label="WebSocket connection status"
      >
        <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${
          wsState === "connecting" ? "animate-pulse" : ""
        }`} />
        <span className="text-xs font-medium">
          WebSocket: {getStatusText()}
        </span>
      </button>

      {showDetails && (
        <div className="absolute bottom-full right-0 mb-2 w-64 p-4 rounded-lg bg-background-secondary border border-border shadow-xl">
          <h3 className="font-semibold mb-2">Connection Details</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-foreground-muted">Status:</span>
              <span className={`font-medium ${
                wsState === "connected" ? "text-green-500" :
                wsState === "error" ? "text-red-500" :
                "text-foreground"
              }`}>
                {getStatusText()}
              </span>
            </div>

            {errorMessage && (
              <div className="pt-2 border-t border-border">
                <p className="text-red-500 text-xs">{errorMessage}</p>
              </div>
            )}

            {wsState === "disconnected" && (
              <button
                onClick={handleReconnect}
                className="w-full mt-2 px-3 py-1 bg-primary text-white rounded text-xs hover:bg-primary-hover transition-colors"
              >
                Reconnect
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}