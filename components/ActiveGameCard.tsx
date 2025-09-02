"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SimpleGameState } from "@/lib/game-types";

interface ActiveGameCardProps {
  gameId: string;
  gameState: SimpleGameState;
  userId: string;
  onResign: () => void;
}

export default function ActiveGameCard({
  gameId,
  gameState,
  userId,
  onResign,
}: ActiveGameCardProps) {
  const router = useRouter();
  const [showResignConfirm, setShowResignConfirm] = useState(false);

  const opponentUsername =
    gameState.players.white?.id === userId
      ? gameState.players.black?.username || "Opponent"
      : gameState.players.white?.username || "Opponent";

  const handleResign = () => {
    onResign();
    setShowResignConfirm(false);
  };

  return (
    <div className="bg-yellow-500/10 border-2 border-yellow-500 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-yellow-500">
        Game in Progress
      </h2>
      <p className="text-foreground mb-4">
        You have an active game against <strong>{opponentUsername}</strong>
      </p>
      <div className="flex gap-4 items-center">
        <button
          onClick={() => router.push(`/game/${gameId}`)}
          className="btn-primary py-3 px-6 flex-1"
        >
          Continue Game →
        </button>
        
        <div className="flex-1">
          {!showResignConfirm ? (
            <button
              onClick={() => setShowResignConfirm(true)}
              className="w-full py-3 px-6 bg-background-secondary text-foreground rounded-lg hover:bg-red-600 hover:text-white transition-all duration-200 border border-border"
            >
              Resign Game
            </button>
          ) : (
            <div className="flex gap-2 animate-in slide-in-from-right duration-200">
              <button
                onClick={() => setShowResignConfirm(false)}
                className="flex-1 py-3 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleResign}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-semibold"
              >
                Confirm
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}