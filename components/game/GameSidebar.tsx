"use client";

import type { SimpleGameState, GameEvent } from "@/lib/game-types";
import { getGamePermissions } from "@/lib/game-utils";
import { useAuth } from "@/components/AuthProvider";
import { useGameState } from "@/hooks/useGameState";
import PlayerInfo from "./PlayerInfo";
import MoveList from "./MoveList";
import GameEventLog from "./GameEventLog";

interface GameSidebarProps {
  gameState: SimpleGameState;
  gameEvents?: GameEvent[];
  onGiveTime?: () => void;
}

export default function GameSidebar({
  gameState,
  gameEvents = [],
  onGiveTime,
}: GameSidebarProps) {
  const { user } = useAuth();
  const { game } = useGameState();
  const permissions = getGamePermissions(gameState, game, user?.userId, gameState.activePlayer);
  const { role, orientation, isPlayer } = permissions;

  const whitePlayer = gameState.players.white?.username || "Waiting...";
  const blackPlayer = gameState.players.black?.username || "Waiting...";

  // Use the activePlayer from server state (which comes from ban-chess.ts v3.0.0 APIs)
  const activeColor = gameState.activePlayer || "white";

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
    ((role === "white" && !playerIsWhite) ||
      (role === "black" && playerIsWhite));
  const canGiveTimeToBottom =
    isPlayer &&
    ((role === "white" && playerIsWhite) ||
      (role === "black" && !playerIsWhite));

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
          !gameState.gameOver
        }
        onGiveTime={onGiveTime}
      />
      <div className="my-2 border-t border-border"></div>
      {/* Fixed height for 4 rows of moves (approximately 120px) */}
      <div className="h-[120px] overflow-hidden">
        <MoveList history={gameState.history || []} />
      </div>
      <div className="my-2 border-t border-border"></div>
      {/* Event log section */}
      <div className="h-[150px] overflow-hidden mb-2">
        <GameEventLog events={gameEvents} />
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
          !gameState.gameOver
        }
        onGiveTime={onGiveTime}
      />
    </div>
  );
}
