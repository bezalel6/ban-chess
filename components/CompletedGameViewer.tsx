"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { BanChess } from "ban-chess.ts";
import type { SimpleGameState, PlayerClock } from "@/lib/game-types";
import CompletedGameSidebar from "./game/CompletedGameSidebar";
import GameStatusPanel from "./game/GameStatusPanel";
import { calculateClocksAtMove } from "@/lib/clock-calculator";

const ResizableBoard = dynamic(() => import("@/components/game/ResizableBoard"), {
  ssr: false,
  loading: () => {
    const DEFAULT_SIZE = 600;
    const savedSize = typeof window !== "undefined" 
      ? localStorage.getItem("boardSize") 
      : null;
    const boardSize = savedSize ? parseInt(savedSize, 10) : DEFAULT_SIZE;
    
    return (
      <div className="chess-board-wrapper">
        <div 
          className="chess-board-container flex items-center justify-center"
          style={{ 
            width: `${boardSize}px`, 
            height: `${boardSize}px`,
            background: 'var(--background-tertiary)',
            borderRadius: '1rem',
            padding: '16px'
          }}
        >
          <div className="loading-spinner" />
        </div>
      </div>
    );
  },
});

interface GameData {
  id: string;
  whitePlayer: { username: string };
  blackPlayer: { username: string };
  bcn: string[];
  moveTimes: number[];
  result: string;
  resultReason: string | null;
  timeControl: string;
  moveCount: number | null;
  finalPosition: string | null;
  createdAt: string;
}

interface CompletedGameViewerProps {
  gameId: string;
}

export default function CompletedGameViewer({ gameId }: CompletedGameViewerProps) {
  const router = useRouter();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Navigation state
  const [navigationGame, setNavigationGame] = useState<BanChess | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number | null>(null);
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [gameState, setGameState] = useState<SimpleGameState | null>(null);
  const [_historicalClocks, setHistoricalClocks] = useState<{ white: PlayerClock; black: PlayerClock } | null>(null);
  const [isViewingHistory, setIsViewingHistory] = useState(false);

  useEffect(() => {
    loadGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const loadGame = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/game/${gameId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Game not found");
        } else {
          throw new Error("Failed to load game");
        }
        return;
      }
      
      const data = await response.json();
      setGameData(data);
      
      // Initialize the game from BCN
      if (data.bcn && data.bcn.length > 0) {
        const game = BanChess.replayFromActions(data.bcn);
        setNavigationGame(game);
        // Set to last action index (which should be a move, not a ban)
        setCurrentMoveIndex(data.bcn.length - 1);
        
        // Get the FULL game history - this should never change during navigation
        const fullGame = BanChess.replayFromActions(data.bcn);
        const fullHistory = fullGame.history();
        
        // Calculate initial clocks at final position - make them static (no lastUpdate)
        let initialClocks: { white: PlayerClock; black: PlayerClock } | null = null;
        if (data.timeControl !== "unlimited") {
          const clocks = calculateClocksAtMove(data.bcn, data.moveTimes, data.timeControl, data.bcn.length - 1);
          // Create completely frozen clock objects
          initialClocks = clocks ? Object.freeze({
            white: Object.freeze({ remaining: clocks.white.remaining, lastUpdate: 0 }) as PlayerClock,
            black: Object.freeze({ remaining: clocks.black.remaining, lastUpdate: 0 }) as PlayerClock
          }) as { white: PlayerClock; black: PlayerClock } : null;
          setHistoricalClocks(initialClocks);
        }
        
        // Set initial game state with FULL history and clocks
        setGameState({
          gameId: gameId,
          fen: game.fen(),
          players: {
            white: { id: "", username: data.whitePlayer.username },
            black: { id: "", username: data.blackPlayer.username },
          },
          activePlayer: game.getActivePlayer() as "white" | "black",
          inCheck: game.inCheck(),
          gameOver: game.gameOver(),
          result: data.result,
          actionHistory: data.bcn,
          history: fullHistory as never, // FULL move history that won't change - type mismatch between ban-chess and our types
          clocks: initialClocks || undefined, // Add clocks for PlayerInfo
          timeControl: data.timeControl // Add time control
        });
      }
    } catch (err) {
      console.error("Error loading game:", err);
      setError("Failed to load game");
    } finally {
      setLoading(false);
    }
  };

  // Memoize clock calculations to prevent ticking
  const getStaticClocksForPosition = useCallback((targetIndex: number): { white: PlayerClock; black: PlayerClock } | null => {
    if (!gameData || gameData.timeControl === "unlimited") {
      return null;
    }
    
    const clocks = calculateClocksAtMove(gameData.bcn, gameData.moveTimes, gameData.timeControl, targetIndex);
    // Create completely frozen clock objects to prevent any updates
    return clocks ? Object.freeze({
      white: Object.freeze({ remaining: clocks.white.remaining, lastUpdate: 0 }) as PlayerClock,
      black: Object.freeze({ remaining: clocks.black.remaining, lastUpdate: 0 }) as PlayerClock
    }) as { white: PlayerClock; black: PlayerClock } : null;
  }, [gameData]);

  const handleNavigate = useCallback((targetIndex: number) => {
    if (!gameData || !gameData.bcn || targetIndex < -1 || targetIndex >= gameData.bcn.length) {
      return;
    }

    // Set viewing history state
    setIsViewingHistory(targetIndex < gameData.bcn.length - 1);
    
    let game: BanChess;
    
    if (targetIndex === -1) {
      // Starting position
      game = new BanChess();
    } else {
      // Replay to the target move
      const actionsToReplay = gameData.bcn.slice(0, targetIndex + 1);
      game = BanChess.replayFromActions(actionsToReplay);
    }
    
    setNavigationGame(game);
    setCurrentMoveIndex(targetIndex);
    
    // Get static clocks for this position
    const clocksAtPosition = getStaticClocksForPosition(targetIndex);
    setHistoricalClocks(clocksAtPosition);
    
    // Update game state but KEEP THE FULL HISTORY - don't change it!
    setGameState(prev => prev ? {
      ...prev,
      fen: game.fen(),
      activePlayer: game.getActivePlayer() as "white" | "black",
      inCheck: game.inCheck(),
      gameOver: targetIndex === gameData.bcn.length - 1 ? game.gameOver() : false,
      // DON'T update history - keep the full game history for the move list
      clocks: clocksAtPosition || undefined, // Update clocks for PlayerInfo
    } : null);
  }, [gameData, getStaticClocksForPosition]);

  const handleFlipBoard = () => {
    setBoardOrientation(prev => prev === "white" ? "black" : "white");
  };

  const handleNewGame = () => {
    router.push("/play/local");
  };


  const handleMoveSelect = (moveIndex: number) => {
    // MoveList gives us move index, but we need to navigate by action index (BCN)
    // In ban-chess, each move corresponds to 2 actions (ban + move)
    // So action index = moveIndex * 2 + 1 (the +1 gets us to the move action, not the ban)
    const actionIndex = moveIndex * 2 + 1;
    
    // Make sure we don't go out of bounds
    if (gameData && actionIndex < gameData.bcn.length) {
      handleNavigate(actionIndex);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <div className="text-gray-500">
          <div className="loading-spinner mb-4"></div>
          Loading game...
        </div>
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)]">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Return Home
        </button>
      </div>
    );
  }


  // Use the same layout as GameClient
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)] p-4">
      <div className="flex gap-6 items-center justify-center w-full max-w-[1400px]">
        
        {/* Left Panel - Status (matches GameClient) */}
        <div className="w-56 flex-shrink-0">
          <GameStatusPanel 
            gameState={{
              ...gameState!,
              result: gameData.result,
              gameOver: true
            }} 
            onNewGame={handleNewGame}
          />
        </div>

        {/* Center - Board (matches GameClient) */}
        <div className="flex flex-col items-center justify-center">
          {gameState && (
            <ResizableBoard
              gameState={navigationGame ? { 
                ...gameState, 
                fen: navigationGame.fen(), 
                inCheck: navigationGame.inCheck() 
              } : gameState}
              game={navigationGame}
              dests={new Map()} // No moves allowed in completed games
              activePlayer={navigationGame?.getActivePlayer() as "white" | "black"}
              actionType={navigationGame?.getActionType() as "move" | "ban"}
              onMove={() => {}} // No-op
              onBan={() => {}} // No-op
              refreshKey={0}
              orientation={boardOrientation}
            />
          )}
        </div>

        {/* Right Panel - Sidebar (matches GameClient) - Made wider for move list */}
        <div className="w-80 flex-shrink-0">
          <CompletedGameSidebar
            gameState={gameState!} // gameState already has history, clocks, etc.
            onMoveSelect={handleMoveSelect}
            // Convert action index to move index for MoveList display
            currentMoveIndex={currentMoveIndex !== null ? Math.floor(currentMoveIndex / 2) : undefined}
            onFlipBoard={handleFlipBoard}
            isViewingHistory={isViewingHistory}
          />
        </div>
      </div>
    </div>
  );
}