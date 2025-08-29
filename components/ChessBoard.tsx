"use client";

import "@bezalel6/react-chessground/dist/react-chessground.css";
import Chessground from "@bezalel6/react-chessground";
import { useState } from "react";
import type {
  ReactChessGroundProps,
  Key,
  Dests,
} from "@bezalel6/react-chessground";
import type { SimpleGameState, Move, Ban } from "@/lib/game-types";
import { parseFEN, getCurrentBan } from "@/lib/game-types";

// Dynamic import of ReactChessground with SSR disabled
// const Chessground = dynamic(() => import("@bezalel6/react-chessground"), {
//   ssr: false,
//   loading: () => (
//     <div className="flex items-center justify-center w-full h-full">
//       <div className="loading-spinner" />
//     </div>
//   ),
// });

interface ChessBoardProps {
  gameState: SimpleGameState;
  onMove: (move: Move) => void;
  onBan: (ban: Ban) => void;
  playerColor?: "white" | "black";
}

// Helper function to get piece at a square from FEN position
function getPieceAt(fen: string, square: string): string | null {
  const file = square.charCodeAt(0) - 97; // a=0, b=1, etc.
  const rank = 8 - parseInt(square[1]); // 8=0, 7=1, etc.

  const rows = fen.split("/");
  const row = rows[rank];

  let col = 0;
  for (const char of row) {
    if (/\d/.test(char)) {
      col += parseInt(char);
    } else {
      if (col === file) {
        return char;
      }
      col++;
    }
  }
  return null;
}

export default function ChessBoard({
  gameState,
  onMove,
  onBan,
  playerColor = "white",
}: ChessBoardProps) {
  const [promotionMove, setPromotionMove] = useState<{
    from: string;
    to: string;
  } | null>(null);
  // Safety check: If gameState is invalid, return a placeholder
  if (!gameState || !gameState.fen) {
    return (
      <div className="chess-board-outer">
        <div className="chess-board-inner flex items-center justify-center">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  const fenData = parseFEN(gameState.fen);
  const currentBan = getCurrentBan(gameState.fen);
  const nextAction = gameState.nextAction || "move";

  // Use the inCheck field from game state (sent by server)
  const isInCheck = gameState.inCheck || false;

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
    isInCheck, // Add check state to debug output
  });

  // Extra debug for ban display
  if (currentBan) {
    console.log("[ChessBoard] BAN SHOULD BE VISIBLE:", currentBan);
  } else {
    console.log("[ChessBoard] No ban to display");
  }

  // More stable board key - only remount when position actually changes
  const boardKey = `${fenData.position}-${fenData.turn}-${
    gameState.gameOver ? "over" : "active"
  }`;

  const config: ReactChessGroundProps = {
    fen: fenData.position,
    orientation,
    coordinates: true,
    autoCastle: true,
    highlight: {
      lastMove: true,
    },
    check: isInCheck ? fenData.turn : undefined,
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
            // Check if this is a pawn promotion
            const piece = getPieceAt(fenData.position, orig);
            const isPromotion = piece === "P" || piece === "p";
            const destRank = dest[1];

            if (isPromotion && (destRank === "8" || destRank === "1")) {
              // Store the move and show promotion dialog
              setPromotionMove({ from: orig, to: dest });
            } else {
              onMove({
                from: orig,
                to: dest,
                promotion: undefined,
              });
            }
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
    <div className="chess-board-outer">
      <div className="chess-board-inner">
        <Chessground key={boardKey} {...config} />
      </div>

      {/* Promotion Dialog */}
      {promotionMove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">
              Choose promotion piece:
            </h3>
            <div className="flex gap-4">
              {(["q", "r", "b", "n"] as const).map((piece) => (
                <button
                  key={piece}
                  onClick={() => {
                    onMove({
                      from: promotionMove.from,
                      to: promotionMove.to,
                      promotion: piece,
                    });
                    setPromotionMove(null);
                  }}
                  className="w-16 h-16 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center text-3xl font-bold"
                >
                  {piece === "q"
                    ? "♕"
                    : piece === "r"
                    ? "♖"
                    : piece === "b"
                    ? "♗"
                    : "♘"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
