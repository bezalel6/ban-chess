"use client";

import Chessground from "react-chessground";
import type { ReactChessGroundProps, Key, Dests } from "react-chessground";
import type {
  SimpleGameState,
  Move,
  Ban,
  HistoryEntry,
} from "@/lib/game-types";
import { parseFEN, getCurrentBan } from "@/lib/game-types";
import "react-chessground/dist/styles/chessground.css";

interface ChessBoardProps {
  gameState: SimpleGameState;
  onMove: (move: Move) => void;
  onBan: (ban: Ban) => void;
  playerColor?: "white" | "black";
}

export default function ChessBoard({
  gameState,
  onMove,
  onBan,
  playerColor = "white",
}: ChessBoardProps) {
  const fenData = parseFEN(gameState.fen);
  const currentBan = getCurrentBan(gameState.fen);
  const nextAction = gameState.nextAction || "move";

  // Check if we're in check - look at the LAST MOVE in history for "+" notation
  let isInCheck = false;
  if (
    gameState.history &&
    gameState.history.length > 0 &&
    typeof gameState.history[0] === "object"
  ) {
    const entries = gameState.history as HistoryEntry[];
    // Find the last move (not ban) in the history
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].actionType === "move") {
        isInCheck = entries[i].san?.includes("+") || false;
        break;
      }
    }
  }

  // Solo games: Show the perspective of the acting player (playerColor from server)
  // Multiplayer: Show the player's fixed color
  const orientation = gameState.isSoloGame
    ? gameState.playerColor
    : playerColor;

  // Build legal moves map from server
  const dests: Dests = new Map<Key, Key[]>();
  if (gameState.legalActions) {
    gameState.legalActions.forEach((action: string) => {
      const from = action.substring(0, 2) as Key;
      const to = action.substring(2, 4) as Key;

      if (!dests.has(from)) {
        dests.set(from, []);
      }
      dests.get(from)!.push(to);
    });
  }

  // SIMPLE: If server sends legal actions AND game is not over, you can move
  // Otherwise, you can't
  const canMove =
    !gameState.gameOver &&
    gameState.legalActions &&
    gameState.legalActions.length > 0;

  // For solo games: The player can move pieces for BOTH sides.
  // The `dests` map, which only contains legal moves for the current action,
  // will ensure that only the correct pieces can actually be moved.
  // For multiplayer: Use the player's color if it's their turn.
  const movableColor = gameState.isSoloGame
    ? "both"
    : canMove && fenData.turn === playerColor
    ? playerColor
    : undefined;

  // Debug logging
  console.log("[ChessBoard] State:", {
    turn: fenData.turn,
    nextAction,
    orientation,
    movableColor,
    canMove,
    legalActionCount: gameState.legalActions?.length || 0,
    isSoloGame: gameState.isSoloGame,
    playerColor,
    currentBan,
    banState: fenData.banState,
  });

  // Extra debug for ban display
  if (currentBan) {
    console.log("[ChessBoard] BAN SHOULD BE VISIBLE:", currentBan);
  } else {
    console.log("[ChessBoard] No ban to display");
  }

  const boardKey = `${fenData.turn}-${nextAction}-${
    gameState.legalActions?.length || 0
  }`;

  const config: ReactChessGroundProps = {
    fen: fenData.position,
    orientation,
    coordinates: true,
    autoCastle: true,
    highlight: {
      lastMove: true,
      check: isInCheck === true,
    },
    lastMove: undefined,
    animation: {
      enabled: true,
      duration: 200,
    },
    movable: {
      free: false,
      color: movableColor,
      dests: canMove ? dests : new Map(),
      showDests: true,
      events: {
        after: (orig: string, dest: string) => {
          if (nextAction === "ban") {
            onBan({ from: orig, to: dest });
          } else {
            onMove({
              from: orig,
              to: dest,
              promotion: undefined, // Let server handle promotions
            });
          }
        },
      },
    },
    selectable: {
      enabled: canMove,
    },
    premovable: {
      enabled: false,
    },
    drawable: {
      enabled: true,
      visible: true,
      autoShapes: currentBan
        ? [
            {
              orig: currentBan.from as Key,
              dest: currentBan.to as Key,
              brush: "red",
            },
          ]
        : [],
    },
  };
  console.log(config.fen);
  console.log("[ChessBoard] Check state:", isInCheck);

  return (
    <div className="chess-board-wrapper">
      {/* Board Container - Clean and simple */}
      <div className="chess-board-container">
        <Chessground key={boardKey} {...config} />
      </div>

      <style jsx>{`
        .chess-board-wrapper {
          width: 100%;
          aspect-ratio: 1;
        }
        .chess-board-container {
          width: 100%;
          height: 100%;
          position: relative;
          isolation: isolate;
        }
      `}</style>
    </div>
  );
}
