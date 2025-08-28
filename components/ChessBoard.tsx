"use client";

import Chessground from "react-chessground";
import type { ReactChessGroundProps, Key, Dests } from "react-chessground";
import type { SimpleGameState, Move, Ban } from "@/lib/game-types";
import { parseFEN, getNextAction, getCurrentBan, getWhoBans } from "@/lib/game-types";
import "react-chessground/dist/styles/chessground.css";
import { BanChess } from "ban-chess.ts";

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
  // Parse the FEN to understand the game state
  const fenData = parseFEN(gameState.fen);
  const nextAction = getNextAction(gameState.fen);
  const whoBans = getWhoBans(gameState.fen);
  const currentBan = getCurrentBan(gameState.fen);

  // Create a temporary game instance to get legal moves/bans
  const tempGame = new BanChess(gameState.fen);
  const legalActions = nextAction === "ban" ? tempGame.legalBans() : tempGame.legalMoves();

  // Board orientation:
  // - During ban phase: show from the perspective of who is banning
  // - During move phase: show from the perspective of who is moving
  // - For solo games: switch based on current action
  let orientation: "white" | "black";
  if (gameState.isSoloGame) {
    // In solo mode, switch perspective based on who's acting
    if (nextAction === "ban") {
      // Show from the banning player's perspective
      orientation = whoBans || "white";
      console.log("[ChessBoard] Ban phase - showing from", orientation, "perspective (whoBans:", whoBans, ")");
    } else {
      // Show from the moving player's perspective
      orientation = fenData.turn;
      console.log("[ChessBoard] Move phase - showing from", orientation, "perspective");
    }
  } else {
    // In multiplayer, always show from player's perspective
    orientation = playerColor || "white";
  }
  
  console.log("[ChessBoard] FEN:", gameState.fen);
  console.log("[ChessBoard] Next action:", nextAction, "Current ban:", currentBan);
  console.log("[ChessBoard] Orientation:", orientation, "isSoloGame:", gameState.isSoloGame);

  // Determine if the current player can act
  // During ban phase, the player who bans is specified in the FEN (b:ban = black bans, w:ban = white bans)
  // During move phase, it's the player whose turn it is
  const isMyTurn =
    gameState.isSoloGame ||
    (nextAction === "move" && fenData.turn === playerColor) ||
    (nextAction === "ban" && whoBans === playerColor);

  // Convert legal moves/bans to chessground format
  const dests: Dests = new Map<Key, Key[]>();
  
  console.log("[ChessBoard] Legal actions count:", legalActions.length, "type:", typeof legalActions[0]);
  if (legalActions.length > 0) {
    console.log("[ChessBoard] First few legal actions:", JSON.stringify(legalActions.slice(0, 5)));
  }
  
  legalActions.forEach((action: string | { from: string; to: string }) => {
    // Handle both move and ban formats from ban-chess.ts
    let from: Key, to: Key;
    
    if (typeof action === 'string') {
      // String format like "e2e4"
      from = action.substring(0, 2) as Key;
      to = action.substring(2, 4) as Key;
    } else if (action && typeof action === 'object' && 'from' in action && 'to' in action) {
      // Object format like { from: "e2", to: "e4" }
      from = action.from as Key;
      to = action.to as Key;
    } else {
      console.warn("[ChessBoard] Unknown action format:", action);
      return;
    }
    
    if (!dests.has(from)) {
      dests.set(from, []);
    }
    dests.get(from)!.push(to);
  });
  
  console.log("[ChessBoard] Dests map size:", dests.size, "isMyTurn:", isMyTurn);
  console.log("[ChessBoard] Dests entries:", Array.from(dests.entries()).slice(0, 3));
  if (dests.size > 0) {
    const firstEntry = Array.from(dests.entries())[0];
    console.log("[ChessBoard] Sample dest entry:", firstEntry[0], "->", firstEntry[1]);
  }

  // CRITICAL: movableColor tells chessground which color pieces can be moved/selected
  // During ban phase: we're selecting the OPPONENT's pieces (to ban their moves)
  // During move phase: we're selecting the current player's pieces
  // fenData.turn is already 'white' or 'black' from parseFEN
  let movableColor: 'white' | 'black' | undefined;
  if (nextAction === "ban") {
    // Ban phase: Select the pieces whose moves will be banned
    // fenData.turn is who moves AFTER the ban, so we select their pieces
    movableColor = fenData.turn;
  } else {
    // Move phase: Select the pieces of the player whose turn it is
    movableColor = fenData.turn;
  }
  
  console.log("[ChessBoard] movableColor:", movableColor, "nextAction:", nextAction, "fenData.turn:", fenData.turn, "whoBans:", whoBans);
  
  // Debug: log the actual config being passed to chessground
  console.log("[ChessBoard] Final config:", {
    orientation,
    movableColor,
    isMyTurn,
    destsSize: dests.size,
    showDests: true,
    destsStructure: dests instanceof Map ? 'Map' : typeof dests,
    allDests: Array.from(dests.entries())
  });

  const config: ReactChessGroundProps = {
    fen: fenData.position, // Use only the position part of FEN
    orientation,
    coordinates: true,
    autoCastle: true,
    highlight: {
      lastMove: true,
      check: true,
    },
    animation: {
      enabled: true,
      duration: 200,
    },
    movable: {
      free: false,
      color: isMyTurn ? movableColor : undefined,
      dests: isMyTurn ? dests : new Map(),
      showDests: true,
      rookCastle: false, // Disable special castling logic that might interfere
      events: {
        after: (orig: string, dest: string) => {
          console.log(`[ChessBoard] Action performed: ${orig} -> ${dest}, nextAction: ${nextAction}`);
          if (nextAction === "ban") {
            onBan({ from: orig, to: dest });
          } else {
            // Check if it's a promotion move
            // Check the destination rank for pawn promotions
            const isPromotion = 
              (fenData.turn === 'white' && orig[1] === '7' && dest[1] === '8') || 
              (fenData.turn === 'black' && orig[1] === '2' && dest[1] === '1');
            
            onMove({ 
              from: orig, 
              to: dest,
              promotion: isPromotion ? 'q' : undefined
            });
          }
        },
      },
    },
    selectable: {
      enabled: isMyTurn,
    },
    premovable: {
      enabled: false,
    },
    drawable: {
      enabled: true,
      visible: true,
      defaultSnapToValidMove: false,
      eraseOnClick: false,
      shapes: currentBan
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
  
  console.log("[ChessBoard] Rendering with config orientation:", config.orientation);

  // Handle check highlighting
  const inCheck = gameState.fen.includes("+") || gameState.fen.includes("#");
  if (inCheck) {
    config.check = true;
  }

  // Force re-render when switching between ban and move phases
  // This ensures chessground properly reinitializes with the new configuration
  const boardKey = `${nextAction}-${fenData.turn}-${whoBans || 'none'}-${gameState.fen}`;

  return (
    <div className="chess-board-container">
      <Chessground 
        key={boardKey}
        {...config} 
      />

      <style jsx>{`
        .chess-board-container {
          width: 100%;
          max-width: 600px;
          aspect-ratio: 1;
        }
      `}</style>
    </div>
  );
}