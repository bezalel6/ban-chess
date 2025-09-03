"use client";

import type { SimpleGameState } from "@/lib/game-types";
import StaticPlayerInfo from "./StaticPlayerInfo";
import MoveList from "./MoveList";
import GameActions from "./GameActions";
import CompactNavigation from "./CompactNavigation";

interface CompletedGameSidebarProps {
  gameState: SimpleGameState;
  onMoveSelect?: (moveIndex: number) => void;
  currentMoveIndex?: number;
  onFlipBoard?: () => void;
  isViewingHistory?: boolean;
}

export default function CompletedGameSidebar({
  gameState,
  onMoveSelect,
  currentMoveIndex,
  onFlipBoard,
  isViewingHistory = false,
}: CompletedGameSidebarProps) {
  const whitePlayer = gameState.players.white?.username || "White";
  const blackPlayer = gameState.players.black?.username || "Black";

  return (
    <div className="bg-background-secondary rounded-lg p-4 flex flex-col shadow-lg h-fit">
      <StaticPlayerInfo
        username={blackPlayer}
        clock={gameState.clocks?.black}
      />
      <div className="my-2 border-t border-border"></div>
      {/* Fixed height for 4 rows of moves (approximately 120px) */}
      <div className="h-[120px]">
        <MoveList 
          history={gameState.history || []} 
          gameState={gameState}
          onMoveSelect={onMoveSelect}
          currentMoveIndex={currentMoveIndex}
        />
      </div>
      {/* Compact Navigation */}
      {onFlipBoard && (
        <div className="mt-2">
          <CompactNavigation
            currentMoveIndex={currentMoveIndex ?? null}
            totalMoves={gameState.history?.length || 0}
            isViewingHistory={isViewingHistory}
            onNavigate={onMoveSelect || (() => {})}
            onFlipBoard={onFlipBoard}
            // No onReturnToLive for completed games
            isLocalGame={false}
          />
        </div>
      )}
      <div className="my-2 border-t border-border"></div>
      {/* Game Actions section */}
      <div className="mb-2">
        <GameActions 
          gameState={gameState}
          onResign={() => {}} // No-op for completed games
        />
      </div>
      <div className="my-2 border-t border-border"></div>
      <StaticPlayerInfo
        username={whitePlayer}
        clock={gameState.clocks?.white}
      />
    </div>
  );
}