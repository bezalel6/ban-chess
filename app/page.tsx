"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function HomePage() {
  const [inQueue, setInQueue] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const wsRef = useRef<WebSocket | null>(null);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    return () => {
      // Clean up WebSocket on unmount
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const joinQueue = () => {
    if (!isAuthenticated || !user) {
      setError("Please set a username first");
      return;
    }

    setInQueue(true);
    setError(null);

    const ws = new WebSocket("ws://localhost:8081");
    wsRef.current = ws;

    ws.onopen = () => {
      // Send user ID with join-queue message
      ws.send(JSON.stringify({ 
        type: "join-queue",
        userId: user.userId,
        username: user.username
      }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "queued") {
        setQueuePosition(msg.position);
        // Store player ID for later use
        if (msg.playerId) {
          sessionStorage.setItem(`playerId`, msg.playerId);
        }
      } else if (msg.type === "matched") {
        // Store game info in sessionStorage for the game page
        sessionStorage.setItem(`gameColor-${msg.gameId}`, msg.color);
        sessionStorage.setItem(`playerId-${msg.gameId}`, msg.playerId);
        // Redirect to game
        router.push(`/game/${msg.gameId}`);
      } else if (msg.type === "error") {
        setError(msg.message);
        setInQueue(false);
      }
    };

    ws.onerror = () => {
      setError("Connection failed");
      setInQueue(false);
    };

    ws.onclose = () => {
      setInQueue(false);
      setQueuePosition(null);
    };
  };

  const leaveQueue = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "leave-queue" }));
      wsRef.current.close();
    }
    setInQueue(false);
    setQueuePosition(null);
  };

  return (
    <div className="container-custom">
      <div className="text-center mt-12">
        <h1 className="text-5xl mb-5">
          ♟️ Ban Chess Web
        </h1>
        <p className="text-lg text-dark-200 mb-10">
          Play Ban Chess online - a variant where you can ban your opponent&apos;s
          moves!
        </p>

        {user && (
          <div className="mb-8 text-lg text-success-400">
            Playing as: <strong>{user.username}</strong>
          </div>
        )}

        <div className="game-info max-w-lg mx-auto">
          {!inQueue ? (
            <>
              <h2 className="mb-8 text-gray-100">
                Ready to Play?
              </h2>
              <button
                onClick={joinQueue}
                className="text-2xl px-10 py-5 w-full max-w-xs"
              >
                Join Queue
              </button>
            </>
          ) : (
            <>
              <h2 className="mb-8 text-gray-100">
                Finding Opponent...
              </h2>
              <div className="mb-8">
                <div className="loading-spinner" />
                {queuePosition && (
                  <p className="text-lg mt-5">
                    Position in queue: {queuePosition}
                  </p>
                )}
              </div>
              <button
                onClick={leaveQueue}
                className="bg-error-400 text-lg px-5 py-2.5 hover:bg-red-600"
              >
                Leave Queue
              </button>
            </>
          )}

          {error && (
            <div className="error mt-5">
              {error}
            </div>
          )}
        </div>

        <div className="mt-15 text-dark-300">
          <h3 className="mb-4 text-gray-100">
            How to Play Ban Chess
          </h3>
          <ol className="text-left max-w-2xl mx-auto leading-relaxed">
            <li>Black bans one of White&apos;s opening moves</li>
            <li>White makes their first move (with the ban in effect)</li>
            <li>White bans one of Black&apos;s possible responses</li>
            <li>Black makes their move (with the ban in effect)</li>
            <li>Pattern continues: Ban → Move → Ban → Move...</li>
            <li>Win by checkmating your opponent!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
