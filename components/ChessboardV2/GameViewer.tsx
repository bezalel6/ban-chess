"use client";

import React, { useState, useCallback, useMemo } from "react";
import { BanChess } from "ban-chess.ts";
import ChessboardV2 from "./Chessboard";
import MovesList from "./MovesList";
import type { Move, Ban, Square } from "@/lib/game-types";

interface GameViewerProps {
  initialBcn: string[];
  className?: string;
}

export default function GameViewer({ 
  initialBcn, 
  className = ""
}: GameViewerProps) {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(initialBcn.length - 1);
  
  // Create game instance at current position and get history with SAN
  const { game, movesWithSan } = useMemo(() => {
    // Replay up to current move
    const actionsToReplay = initialBcn.slice(0, currentMoveIndex + 1);
    const replayedGame = BanChess.replayFromActions(actionsToReplay);
    replayedGame.setIndicatorConfig({ pgn: true, san: true, serialization: true });
    
    // Get full game to extract SAN notation
    const fullGame = BanChess.replayFromActions(initialBcn);
    const history = fullGame.history();
    
    // Create moves array with SAN notation where available
    const movesWithSan = initialBcn.map((bcn, index) => {
      const historyEntry = history[index];
      if (historyEntry && historyEntry.san && bcn.startsWith('m:')) {
        return historyEntry.san;
      }
      return bcn;
    });
    
    return { game: replayedGame, movesWithSan };
  }, [initialBcn, currentMoveIndex]);
  
  // Get destinations from current game position
  const destinations = useMemo(() => {
    const destsMap = new Map<Square, Square[]>();
    if (!game) return destsMap;
    
    const legalActions = game.getLegalActions();
    const actionType = game.getActionType();
    
    legalActions.forEach((action) => {
      if (actionType === "ban" && "ban" in action) {
        const { from, to } = action.ban;
        if (!destsMap.has(from)) {
          destsMap.set(from, []);
        }
        destsMap.get(from)!.push(to);
      } else if (actionType === "move" && "move" in action) {
        const { from, to } = action.move;
        if (!destsMap.has(from)) {
          destsMap.set(from, []);
        }
        destsMap.get(from)!.push(to);
      }
    });
    
    return destsMap;
  }, [game]);
  
  // Navigation handlers
  const handleMoveClick = useCallback((index: number) => {
    setCurrentMoveIndex(index);
  }, []);
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      setCurrentMoveIndex(prev => Math.max(0, prev - 1));
    } else if (e.key === "ArrowRight") {
      setCurrentMoveIndex(prev => Math.min(initialBcn.length - 1, prev + 1));
    } else if (e.key === "ArrowUp" || e.key === "Home") {
      setCurrentMoveIndex(0);
    } else if (e.key === "ArrowDown" || e.key === "End") {
      setCurrentMoveIndex(initialBcn.length - 1);
    }
  }, [initialBcn.length]);
  
  // Set up keyboard listeners
  React.useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
  
  // No-op handlers since this is a viewer
  const handleMove = useCallback((move: Move) => {
    console.log("Move in viewer:", move);
  }, []);
  
  const handleBan = useCallback((ban: Ban) => {
    console.log("Ban in viewer:", ban);
  }, []);
  
  // Create game state
  const gameState = {
    gameId: "viewer-game",
    fen: game.fen(),
    players: {
      white: { id: "viewer-white", username: "White" },
      black: { id: "viewer-black", username: "Black" },
    },
    activePlayer: game.getActivePlayer(),
    inCheck: game.inCheck(),
    gameOver: game.gameOver(),
  };
  
  return (
    <div className={`relative flex justify-center items-start ${className}`}>
      {/* Board - centered as the main focus */}
      <div className="w-[600px] h-[600px]">
        <ChessboardV2
          gameState={gameState}
          destinations={destinations}
          userRole={null} // Viewer mode
          orientation="white"
          actionType={game.getActionType()}
          activePlayer={game.getActivePlayer()}
          isLocalGame={false}
          onMove={handleMove}
          onBan={handleBan}
          showCoordinates={true}
        />
      </div>
      
      {/* Moves sidebar - positioned to the right */}
      <div className="absolute left-[calc(50%+320px)] h-[600px] flex items-center">
        <MovesList
          bcnMoves={movesWithSan}
          currentMoveIndex={currentMoveIndex}
          onMoveClick={handleMoveClick}
          onNavigate={setCurrentMoveIndex}
          totalMoves={initialBcn.length}
        />
      </div>
    </div>
  );
}