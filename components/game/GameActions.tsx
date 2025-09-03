"use client";

import { useState } from "react";
import type { SimpleGameState } from "@/lib/game-types";
import { useUserRole } from "@/contexts/UserRoleContext";
import { Flag } from "lucide-react";

interface GameActionsProps {
  gameState: SimpleGameState;
  onResign?: () => void;
  onOfferDraw?: () => void;
  onRequestTakeback?: () => void;
}

export default function GameActions({
  gameState,
  onResign,
  onOfferDraw,
  onRequestTakeback,
}: GameActionsProps) {
  const { role } = useUserRole();
  const isPlayer = role !== null;
  const [drawOffered, setDrawOffered] = useState(false);
  const [takebackRequested, setTakebackRequested] = useState(false);

  // Only show actions if game is not over and user is a player
  if (gameState.gameOver || !isPlayer) {
    return null;
  }

  const handleOfferDraw = () => {
    if (onOfferDraw) {
      onOfferDraw();
      setDrawOffered(true);
      // Reset after 30 seconds
      setTimeout(() => setDrawOffered(false), 30000);
    }
  };

  const handleRequestTakeback = () => {
    if (onRequestTakeback) {
      onRequestTakeback();
      setTakebackRequested(true);
      // Reset after 30 seconds
      setTimeout(() => setTakebackRequested(false), 30000);
    }
  };

  return (
    <div className="bg-background-tertiary rounded-lg p-3">
      <h3 className="text-xs font-semibold text-foreground-muted uppercase mb-3">
        Game Actions
      </h3>
      
      <div className="flex gap-2">
        {/* Resign Icon Button */}
        {onResign && (
          <button
            onClick={onResign}
            className="p-2 text-gray-400 hover:text-white hover:bg-red-500/20 rounded-md transition-colors group"
            title="Resign"
          >
            <Flag className="w-5 h-5 group-hover:text-red-400" />
          </button>
        )}

        {/* Offer Draw Button */}
        {onOfferDraw && (
          <button
            onClick={handleOfferDraw}
            disabled={drawOffered}
            className={`flex-1 px-3 py-2 rounded-md transition-colors font-medium text-sm ${
              drawOffered
                ? 'bg-gray-500/10 text-gray-500 border border-gray-500/30 cursor-not-allowed'
                : 'bg-blue-500/10 text-blue-500 border border-blue-500/30 hover:bg-blue-500/20'
            }`}
          >
            {drawOffered ? 'Draw Offered' : 'Offer Draw'}
          </button>
        )}

        {/* Request Takeback Button */}
        {onRequestTakeback && gameState.history && gameState.history.length > 0 && (
          <button
            onClick={handleRequestTakeback}
            disabled={takebackRequested}
            className={`flex-1 px-3 py-2 rounded-md transition-colors font-medium text-sm ${
              takebackRequested
                ? 'bg-gray-500/10 text-gray-500 border border-gray-500/30 cursor-not-allowed'
                : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 hover:bg-yellow-500/20'
            }`}
          >
            {takebackRequested ? 'Takeback Requested' : 'Request Takeback'}
          </button>
        )}
      </div>

      {/* Pending Actions Display */}
      {(drawOffered || takebackRequested) && (
        <div className="mt-3 p-2 bg-purple-500/10 border border-purple-500/30 rounded-md">
          <p className="text-xs text-purple-400">
            {drawOffered && 'Waiting for opponent to accept draw offer...'}
            {takebackRequested && 'Waiting for opponent to accept takeback...'}
          </p>
        </div>
      )}
    </div>
  );
}