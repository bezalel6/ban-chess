"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useGameStore } from "@/contexts/GameContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useRouter } from "next/navigation";

function OnlinePlayContent() {
  const { user } = useAuth();
  const gameStore = useGameStore();
  const { isReady } = useWebSocket();
  const router = useRouter();
  const hasJoinedRef = useRef(false);

  // Handle joining the queue when connected
  useEffect(() => {
    if (isReady && !hasJoinedRef.current) {
      gameStore.joinQueue();
      hasJoinedRef.current = true;
    }
  }, [isReady, gameStore]);

  // Handle cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Only leave queue if we actually joined
      if (hasJoinedRef.current) {
        gameStore.leaveQueue();
      }
    };
  }, [gameStore]);

  const handleCancel = () => {
    gameStore.leaveQueue();
    hasJoinedRef.current = false;
    router.push("/");
  };

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background-secondary rounded-xl p-8 shadow-2xl border border-border max-w-sm w-full mx-4">
          <div className="text-center">
            <div className="loading-spinner mb-4"></div>
            <p className="text-foreground-muted">Redirecting to sign in...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background-secondary rounded-xl p-8 shadow-2xl border border-border max-w-md w-full mx-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Finding a Match
          </h2>
          <p className="text-foreground-muted mb-6">
            Please wait while we connect you with another player.
          </p>

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
          </div>

          <button
            onClick={handleCancel}
            className="btn-secondary w-full"
            aria-label="Cancel matchmaking"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OnlinePlayPage() {
  return <OnlinePlayContent />;
}