"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { BanChess } from "ban-chess.ts";
import type { SimpleGameState } from "@/lib/game-types";
import { formatDistanceToNow } from "date-fns";
import MoveList from "./game/MoveList";
import NavigationBar from "./game/NavigationBar";

const ChessBoard = dynamic(() => import("./ChessBoard"), {
  ssr: false,
  loading: () => (
    <div className="aspect-square w-full bg-background-tertiary rounded-lg flex items-center justify-center">
      <div className="loading-spinner" />
    </div>
  ),
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
        setCurrentMoveIndex(data.bcn.length - 1);
        
        // Set initial game state
        setGameState({
          gameId: gameId,
          fen: game.fen(),
          players: data.players,
          activePlayer: game.getActivePlayer() as "white" | "black",
          inCheck: game.inCheck(),
          gameOver: game.gameOver(),
          result: data.result,
          actionHistory: data.bcn,
        });
      }
    } catch (err) {
      console.error("Error loading game:", err);
      setError("Failed to load game. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = useCallback((moveIndex: number) => {
    if (!gameData || !gameData.bcn) return;
    
    // Handle negative index (starting position)
    const bcnSlice = moveIndex >= 0 ? gameData.bcn.slice(0, moveIndex + 1) : [];
    const navGame = bcnSlice.length > 0 
      ? BanChess.replayFromActions(bcnSlice)
      : new BanChess();
    
    setNavigationGame(navGame);
    setCurrentMoveIndex(moveIndex);
    
    // Update game state with navigated position
    setGameState(prev => prev ? {
      ...prev,
      fen: navGame.fen(),
      activePlayer: navGame.getActivePlayer() as "white" | "black",
      actionType: navGame.getActionType() as "ban" | "move",
      inCheck: navGame.inCheck(),
    } : null);
  }, [gameData]);

  const handleFlipBoard = useCallback(() => {
    setBoardOrientation(prev => prev === "white" ? "black" : "white");
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-500">
          <div className="loading-spinner mb-4"></div>
          Loading game...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
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

  if (!gameData || !gameState) {
    return null;
  }

  const totalMoves = gameData.bcn.filter(action => action.startsWith("m:")).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container-custom py-8">
        {/* Game Header */}
        <div className="bg-background-secondary rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xl font-bold">
              <button
                onClick={() => router.push(`/profile/${gameData.whitePlayer.username}`)}
                className="hover:text-lichess-orange-500 transition-colors"
              >
                {gameData.whitePlayer.username}
              </button>
              {" vs "}
              <button
                onClick={() => router.push(`/profile/${gameData.blackPlayer.username}`)}
                className="hover:text-lichess-orange-500 transition-colors"
              >
                {gameData.blackPlayer.username}
              </button>
            </div>
            <div className="text-sm text-gray-400">
              Played {formatDistanceToNow(new Date(gameData.createdAt), { addSuffix: true })}
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>Result: <span className="font-semibold text-white">{gameData.result}</span></span>
            {gameData.resultReason && (
              <span>({gameData.resultReason})</span>
            )}
            <span>• {totalMoves} moves</span>
            <span>• {formatTimeControl(gameData.timeControl)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
          {/* Chess Board */}
          <div className="flex flex-col gap-4">
            <div className="aspect-square max-w-full">
              <ChessBoard
                gameState={gameState}
                game={navigationGame}
                dests={new Map()}
                onMove={() => {}}
                onBan={() => {}}
                orientation={boardOrientation}
              />
            </div>
            
            {/* Navigation Bar */}
            <NavigationBar
              currentMoveIndex={currentMoveIndex}
              totalMoves={gameData.bcn.length}
              isViewingHistory={true}
              onNavigate={handleNavigate}
              onFlipBoard={handleFlipBoard}
            />
          </div>

          {/* Move List */}
          <div className="bg-background-secondary rounded-lg p-4 h-fit max-h-[600px] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Moves</h3>
            <MoveList
              actions={gameData.bcn}
              moveTimes={gameData.moveTimes}
              currentIndex={currentMoveIndex ?? undefined}
              onNavigate={handleNavigate}
            />
          </div>
        </div>
        
        {/* Navigation Buttons */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Return Home
          </button>
          <button
            onClick={() => router.push(`/profile/${gameData.whitePlayer.username}`)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {gameData.whitePlayer.username}&apos;s Profile
          </button>
          <button
            onClick={() => router.push(`/profile/${gameData.blackPlayer.username}`)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {gameData.blackPlayer.username}&apos;s Profile
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTimeControl(timeControl: string): string {
  if (timeControl === "unlimited") return "Unlimited";
  
  const match = timeControl.match(/(\d+)\+(\d+)/);
  if (!match) return timeControl;
  
  const [, initial, increment] = match;
  const minutes = Math.floor(parseInt(initial) / 60);
  const incrementSec = parseInt(increment);
  
  if (minutes > 0 && incrementSec > 0) {
    return `${minutes}+${incrementSec}`;
  } else if (minutes > 0) {
    return `${minutes} min`;
  } else {
    return `${initial} sec`;
  }
}