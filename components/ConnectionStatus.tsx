"use client";

import { useEffect, useState } from "react";
import { wsConnection } from "@/lib/websocket-singleton";

type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

export function ConnectionStatus() {
  const [wsState, setWsState] = useState<ConnectionState>("disconnected");
  const [showDetails, setShowDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    // Check initial state
    const checkState = () => {
      const state = wsConnection.getState();
      if (state.connected && state.authenticated) {
        setWsState("connected");
        setErrorMessage("");
      } else if (state.connected && !state.authenticated) {
        setWsState("connecting");
        setErrorMessage("");
      } else {
        setWsState("disconnected");
      }
    };

    checkState();

    // Subscribe to WebSocket messages
    const unsubscribe = wsConnection.subscribe((msg) => {
      if (msg.type === "authenticated") {
        setWsState("connected");
        setErrorMessage("");
        // Auto-hide details after successful connection
        setTimeout(() => setShowDetails(false), 3000);
      } else if (msg.type === "error") {
        setWsState("error");
        setErrorMessage(msg.message || "Connection error");
        setShowDetails(true); // Auto-show details on error
      }
    });

    // Poll connection state
    const interval = setInterval(checkState, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const stateConfig = {
    connecting: {
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      icon: "🔄",
      label: "Connecting...",
    },
    connected: {
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      icon: "✅",
      label: "Connected",
    },
    disconnected: {
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      icon: "🔌",
      label: "Disconnected",
    },
    error: {
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      icon: "❌",
      label: "Connection Error",
    },
  };

  const config = stateConfig[wsState];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-3 shadow-lg transition-all duration-300 ${
          showDetails ? "w-80" : "w-auto"
        }`}
      >
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`flex items-center gap-2 ${config.color} font-medium text-sm focus:outline-none`}
        >
          <span className="text-lg">{config.icon}</span>
          <span>{config.label}</span>
          {wsState === "error" && (
            <span className="ml-2 text-xs">Click for details</span>
          )}
        </button>

        {showDetails && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-gray-500">Status:</span>
                <span className={config.color}>{config.label}</span>
              </div>
              
              {errorMessage && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-500">Error:</span>
                  <span className="text-red-600">{errorMessage}</span>
                </div>
              )}

              {wsState === "disconnected" && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  <p className="font-semibold mb-1">Troubleshooting:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Check if WebSocket server is running (npm run dev:ws)</li>
                    <li>Verify Redis is running (docker ps)</li>
                    <li>Check .env.local for NEXT_PUBLIC_WEBSOCKET_URL</li>
                  </ul>
                </div>
              )}

              {wsState === "error" && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                  <p className="font-semibold mb-1">Common Causes:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>WebSocket server crashed - check logs</li>
                    <li>Redis not running - start with: docker run -d -p 6379:6379 redis</li>
                    <li>Network issues or incorrect URL</li>
                    <li>Authentication failure</li>
                  </ul>
                </div>
              )}

              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => {
                    const state = wsConnection.getState();
                    if (state.user) {
                      wsConnection.disconnect();
                      setTimeout(() => {
                        wsConnection.connect(state.user!);
                      }, 100);
                    }
                  }}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}