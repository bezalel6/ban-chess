"use client";

import "@bezalel6/react-chessground/dist/react-chessground.css";
import Chessground from "@bezalel6/react-chessground";
import { useState, memo, useMemo } from "react";
import type {
  ReactChessGroundProps,
  Key,
  Dests,
} from "@bezalel6/react-chessground";
import type { SimpleGameState, Move, Ban } from "@/lib/game-types";
import { parseFEN, getCurrentBan } from "@/lib/game-types";
import { useAuth } from "@/components/AuthProvider";

interface ChessBoardProps {
  gameState: SimpleGameState;
  onMove: (move: Move) => void;
  onBan: (ban: Ban) => void;
  playerColor?: "white" | "black"; // Optional override for solo games
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

const ChessBoard = memo(function ChessBoard({
  gameState,
  onMove,
  onBan,
  playerColor: overridePlayerColor,
}: ChessBoardProps) {
  const { user } = useAuth();
  const [_promotionMove, _setPromotionMove] = useState<{
    from: string;
    to: string;
  } | null>(null);

  // Determine the player's role based on their user ID
  const playerRole = useMemo(() => {
    if (!user?.userId) return "spectator";
    if (!gameState?.players) return "spectator";

    // Check if user is white player
    if (gameState.players.white?.id === user.userId) {
      return "white";
    }

    // Check if user is black player
    if (gameState.players.black?.id === user.userId) {
      return "black";
    }

    // Otherwise, user is a spectator
    return "spectator";
  }, [user?.userId, gameState?.players]);

  // Determine the actual player color to use
  // For solo games, use the override (which comes from server)
  // For multiplayer, use the determined role
  const playerColor = useMemo(() => {
    if (!gameState) return "white";
    if (gameState.isSoloGame) {
      return overridePlayerColor || "white";
    }
    // For multiplayer, return the player's actual color or default to white for spectators
    return playerRole === "spectator" ? "white" : playerRole;
  }, [gameState, overridePlayerColor, playerRole]);

  // Parse FEN data
  const fenData = useMemo(() => {
    if (!gameState?.fen) return null;
    return parseFEN(gameState.fen);
  }, [gameState?.fen]);

  // Determine board orientation
  // Solo games: Show the perspective of the current turn
  // Multiplayer: Show the player's fixed color (or white for spectators)
  const orientation = useMemo(() => {
    if (!fenData) return playerColor;
    if (gameState?.isSoloGame) {
      // In solo games, board flips to show current player's perspective
      return fenData.turn;
    }
    // In multiplayer, board is fixed to player's color
    return playerColor;
  }, [gameState?.isSoloGame, fenData, playerColor]);

  // Determine if this player can make moves
  const canMove = useMemo(() => {
    if (!gameState || !fenData) return false;

    // Game must not be over
    if (gameState.gameOver) return false;

    // Must have legal actions available
    if (!gameState.legalActions || gameState.legalActions.length === 0)
      return false;

    // In solo games, player can always move
    if (gameState.isSoloGame) return true;

    // In multiplayer, only the player whose turn it is can move
    // Spectators cannot move
    if (playerRole === "spectator") return false;

    // Check if it's this player's turn
    return fenData.turn === playerRole;
  }, [gameState, fenData, playerRole]);

  // Determine which color pieces can be moved
  const movableColor = useMemo(() => {
    if (!canMove) return undefined;

    // In solo games, player can move both colors
    if (gameState?.isSoloGame) return "both";

    // In multiplayer, only move pieces of player's color when it's their turn
    return playerRole === "spectator"
      ? undefined
      : (playerRole as "white" | "black");
  }, [canMove, gameState?.isSoloGame, playerRole]);

  // Safety check: If gameState or fenData is invalid, return a placeholder
  if (!gameState || !gameState.fen || !fenData) {
    return (
      <div className="chess-board-outer">
        <div className="chess-board-inner flex items-center justify-center">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  // Extract values from parsed FEN and game state
  const currentBan = getCurrentBan(gameState.fen);
  const nextAction = gameState.nextAction || "move";
  const isInCheck = gameState.inCheck || false;

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

  // Debug logging
  console.log("[ChessBoard] State:", {
    userId: user?.userId,
    playerRole,
    turn: fenData.turn,
    nextAction,
    orientation,
    movableColor,
    canMove,
    legalActionCount: gameState.legalActions?.length || 0,
    isSoloGame: gameState.isSoloGame,
    playerColor,
    players: gameState.players,
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
    coordinates: false,
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
              _setPromotionMove({ from: orig, to: dest });
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
    </div>
  );
});

export default ChessBoard;
