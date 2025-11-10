"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useGameStore } from "@/contexts/GameContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useRouter } from "next/navigation";
import { wsManager } from "@/lib/websocket/WebSocketManager";
import type { SimpleServerMsg } from "@/lib/game-types";

function OnlinePlayContent() {
  const { user } = useAuth();
  const gameStore = useGameStore();
  const { isReady } = useWebSocket();
  const router = useRouter();
  const [queueExpired, setQueueExpired] = useState(false);
  const [expiredMessage, setExpiredMessage] = useState("");

  useEffect(() => {
    // Now we always have a user (either authenticated or anonymous)
    if (!isReady) return;

    // Join the matchmaking queue
    gameStore.joinQueue();
    setQueueExpired(false); // Reset state when joining queue

    // Listen for queue expiration
    const unsubscribeExpired = wsManager.subscribe('queue-expired', (msg: SimpleServerMsg) => {
      if (msg.type === 'queue-expired') {
        setQueueExpired(true);
        setExpiredMessage(msg.message);
      }
    });

    // Listen for game creation from matchmaking
    const unsubscribe = gameStore.subscribeToAll((state) => {
      if (state && state.gameId && state.players?.white && state.players?.black) {
        // Game has been created by matchmaking
        router.push(`/game/${state.gameId}`);
      }
    });

    return () => {
      gameStore.leaveQueue();
      unsubscribe();
      unsubscribeExpired();
    };
  }, [user, isReady, gameStore, router]);

  const handleCancel = () => {
    gameStore.leaveQueue();
    router.push("/");
  };

  const handleRequeue = () => {
    gameStore.joinQueue();
    setQueueExpired(false);
    setExpiredMessage("");
  };

  // No need to check for user - we always have one (authenticated or anonymous)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background-secondary rounded-xl p-8 shadow-2xl border border-border max-w-md w-full mx-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {queueExpired ? "Queue Expired" : "Finding a Match"}
          </h2>
          <p className="text-foreground-muted mb-6">
            {queueExpired
              ? expiredMessage || "You were removed from the queue due to inactivity."
              : "Please wait while we connect you with another player."}
          </p>

          {queueExpired ? (
            <div className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <p className="text-yellow-600 dark:text-yellow-400 text-sm">
                  Queue timeout after 60 seconds to prevent inactive players from blocking matches.
                </p>
              </div>
              <button
                onClick={handleRequeue}
                className="btn-primary w-full mb-3"
                aria-label="Re-join queue"
              >
                Re-join Queue
              </button>
              <button
                onClick={handleCancel}
                className="btn-secondary w-full"
                aria-label="Return to home"
              >
                Return Home
              </button>
            </div>
          ) : (
            <>
              <div className="bg-background/50 rounded-lg p-6 border border-border/50 mb-6">
                <div className="loading-spinner mb-4"></div>
                <p className="text-foreground font-medium">
                  {isReady
                    ? "In queue for an online game..."
                    : "Connecting to server..."}
                </p>
                <p className="text-foreground-subtle text-sm mt-2">
                  You&apos;ll be redirected when a match is found.
                </p>
                <p className="text-foreground-subtle text-xs mt-2">
                  Queue expires after 60 seconds of waiting
                </p>
              </div>

              <button
                onClick={handleCancel}
                className="btn-secondary w-full"
                aria-label="Cancel matchmaking"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnlinePlayPage() {
  return <OnlinePlayContent />;
}