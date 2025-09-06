"use client";

import type { SimpleGameState } from "@/lib/game-types";
import { useUserRole } from "@/contexts/UserRoleContext";
import { Flag, Handshake } from "lucide-react";

interface GameActionsProps {
  gameState: SimpleGameState;
  onResign?: () => void;
  onOfferDraw?: () => void;
  onAcceptDraw?: () => void;
  onDeclineDraw?: () => void;
}

export default function GameActions({
  gameState,
  onResign,
  onOfferDraw,
  onAcceptDraw,
  onDeclineDraw,
}: GameActionsProps) {
  const { role } = useUserRole();
  const isPlayer = role !== null;

  // Only show actions if game is not over and user is a player
  if (gameState.gameOver || !isPlayer) {
    return null;
  }

  // Check if there's an active draw offer
  const hasDrawOffer = !!gameState.drawOfferedBy;
  const isMyDrawOffer = gameState.drawOfferedBy === role;
  const isOpponentDrawOffer = hasDrawOffer && !isMyDrawOffer;

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

        {/* Draw Offer Icon Button */}
        {!hasDrawOffer && onOfferDraw && (
          <button
            onClick={onOfferDraw}
            className="p-2 text-gray-400 hover:text-white hover:bg-blue-500/20 rounded-md transition-colors group"
            title="Offer Draw"
          >
            <Handshake className="w-5 h-5 group-hover:text-blue-400" />
          </button>
        )}

        {/* When you offered a draw */}
        {isMyDrawOffer && (
          <button
            disabled
            className="p-2 text-gray-500 bg-gray-500/10 rounded-md cursor-not-allowed"
            title="Draw Offered - Waiting for response"
          >
            <Handshake className="w-5 h-5" />
          </button>
        )}

        {/* When opponent offered a draw */}
        {isOpponentDrawOffer && onAcceptDraw && onDeclineDraw && (
          <>
            <button
              onClick={onAcceptDraw}
              className="flex-1 px-3 py-2 rounded-md transition-colors font-medium text-sm bg-green-500/10 text-green-500 border border-green-500/30 hover:bg-green-500/20"
            >
              Accept Draw
            </button>
            <button
              onClick={onDeclineDraw}
              className="px-3 py-2 rounded-md transition-colors font-medium text-sm bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20"
            >
              Decline
            </button>
          </>
        )}
      </div>

      {/* Pending Draw Offer Display */}
      {hasDrawOffer && (
        <div className="mt-3 p-2 bg-purple-500/10 border border-purple-500/30 rounded-md">
          <p className="text-xs text-purple-400">
            {isMyDrawOffer 
              ? 'Waiting for opponent to respond to draw offer...'
              : 'Your opponent has offered a draw'}
          </p>
        </div>
      )}
    </div>
  );
}