"use client";

import type { SimpleGameState } from "@/lib/game-types";
import { parseFEN } from "@/lib/game-types";
import { useUserRole } from "@/contexts/UserRoleContext";

import PlayerInfo from "./PlayerInfo";
import MoveList from "./MoveList";
import GameActions from "./GameActions";
import CompactNavigation from "./CompactNavigation";

interface GameSidebarProps {
  gameState: SimpleGameState;
  onGiveTime?: () => void;
  onResign?: () => void;
  onOfferDraw?: () => void;
  onAcceptDraw?: () => void;
  onDeclineDraw?: () => void;
  onMoveSelect?: (moveIndex: number) => void;
  currentMoveIndex?: number;
  isLocalGame?: boolean;
  onFlipBoard?: () => void;
  onToggleAutoFlip?: () => void;
  autoFlipEnabled?: boolean;
  isViewingHistory?: boolean;
  onReturnToLive?: () => void;
}

export default function GameSidebar({
  gameState,
  onGiveTime,
  onResign,
  onOfferDraw,
  onAcceptDraw,
  onDeclineDraw,
  onMoveSelect,
  currentMoveIndex,
  isLocalGame = false,
  onFlipBoard,
  onToggleAutoFlip,
  autoFlipEnabled,
  isViewingHistory = false,
  onReturnToLive,
}: GameSidebarProps) {
    const { role, orientation } = useUserRole();
  const isPlayer = role !== null;
  const { turn } = parseFEN(gameState.fen);

  const whitePlayer = gameState.players.white?.username || "Waiting...";
  const blackPlayer = gameState.players.black?.username || "Waiting...";

  // Use activePlayer from BanChess instance to determine who is active
  const activeColor = gameState.activePlayer || turn;

  // For players, show active color based on the game state
  // For spectators, default behavior applies

  const isWhiteActive = activeColor === "white" && !gameState.gameOver;
  const isBlackActive = activeColor === "black" && !gameState.gameOver;

  // Determine who is top and bottom based on board orientation
  const playerIsWhite = orientation === "white";
  const topPlayer = playerIsWhite ? blackPlayer : whitePlayer;
  const bottomPlayer = playerIsWhite ? whitePlayer : blackPlayer;
  const isTopActive = playerIsWhite ? isBlackActive : isWhiteActive;
  const isBottomActive = playerIsWhite ? isWhiteActive : isBlackActive;

  // Get clocks for each player
  const topClock = playerIsWhite
    ? gameState.clocks?.black
    : gameState.clocks?.white;
  const bottomClock = playerIsWhite
    ? gameState.clocks?.white
    : gameState.clocks?.black;

  // Determine if player can give time (only to opponent, only if they're playing)
  const canGiveTimeToTop =
    isPlayer &&
    ((role === "white" && playerIsWhite) ||
      (role === "black" && !playerIsWhite));
  const canGiveTimeToBottom =
    isPlayer &&
    ((role === "white" && !playerIsWhite) ||
      (role === "black" && playerIsWhite));

  return (
    <div className="bg-background-secondary rounded-lg p-4 flex flex-col shadow-lg h-fit">
      <PlayerInfo
        username={topPlayer}
        isTurn={isTopActive}
        clock={topClock}
        isClockActive={isTopActive}
        canGiveTime={
          canGiveTimeToTop &&
          !!onGiveTime &&
          !!gameState.timeControl &&
          !gameState.gameOver &&
          !isLocalGame
        }
        onGiveTime={onGiveTime}
        isOnline={topPlayer !== "Waiting..."}
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
            onReturnToLive={onReturnToLive}
            onToggleAutoFlip={onToggleAutoFlip}
            autoFlipEnabled={autoFlipEnabled}
            isLocalGame={isLocalGame}
          />
        </div>
      )}
      <div className="my-2 border-t border-border"></div>
      {/* Game Actions section */}
      <div className="mb-2">
        <GameActions 
          gameState={gameState}
          onResign={onResign}
          onOfferDraw={onOfferDraw}
          onAcceptDraw={onAcceptDraw}
          onDeclineDraw={onDeclineDraw}
        />
      </div>
      <div className="my-2 border-t border-border"></div>
      <PlayerInfo
        username={bottomPlayer}
        isTurn={isBottomActive}
        clock={bottomClock}
        isClockActive={isBottomActive}
        canGiveTime={
          canGiveTimeToBottom &&
          !!onGiveTime &&
          !!gameState.timeControl &&
          !gameState.gameOver &&
          !isLocalGame
        }
        onGiveTime={onGiveTime}
        isOnline={bottomPlayer !== "Waiting..."}
      />
    </div>
  );
}
