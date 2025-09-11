"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useGameState } from "@/hooks/useGameState";
import { useRouter } from "next/navigation";

export default function OnlinePlayPage() {
  const { user } = useAuth();
  const { connected, joinQueue, leaveQueue } = useGameState(undefined);
  const router = useRouter();

  useEffect(() => {
    if (!connected) return;

    // Join matchmaking queue immediately when connected
    // The useGameState hook will handle the redirect when matched
    joinQueue();

    // Leave queue when component unmounts
    return () => {
      leaveQueue();
    };
  }, [connected, joinQueue, leaveQueue]);

  const handleCancel = () => {
    leaveQueue();
    router.push("/"); // Navigate to home page
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
              {connected
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
