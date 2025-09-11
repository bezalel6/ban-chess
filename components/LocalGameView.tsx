"use client";

import { useEffect, useState, useCallback } from "react";
import { LocalGameController } from "@/lib/controllers/LocalGameController";
import type { GameControllerState } from "@/lib/controllers/IGameController";
import type { Move, Ban } from "@/lib/game-types";
import ChessBoard from "./ChessBoard";
import GameSidebar from "./game/GameSidebar";
import GameStatusPanel from "./game/GameStatusPanel";
import { useRouter } from "next/navigation";

/**
 * LocalGameView - Component for playing ban chess locally
 * 
 * This component provides a complete ban chess experience without
 * requiring a server connection. Perfect for:
 * - Learning ban chess rules
 * - Practicing strategies
 * - Playing against yourself
 * - Offline play
 */

interface LocalGameViewProps {
  initialFen?: string;
}

export default function LocalGameView({ initialFen }: LocalGameViewProps) {
  const router = useRouter();
  const [controller] = useState(() => new LocalGameController(initialFen));
  const [gameState, setGameState] = useState<GameControllerState | null>(null);
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [autoFlip, setAutoFlip] = useState(true);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Subscribe to controller state changes
  useEffect(() => {
    const unsubscribe = controller.subscribe((state) => {
      setGameState(state);
      
      // Auto-flip board based on active player if enabled
      if (autoFlip && state.activePlayer) {
        setOrientation(state.activePlayer);
      }
    });
    
    // Initialize controller
    controller.initialize();
    
    return () => {
      unsubscribe();
      controller.cleanup();
    };
  }, [controller, autoFlip]);
  
  // Handle moves
  const handleMove = useCallback((move: Move) => {
    if (isNavigating) return; // Don't allow moves while navigating history
    controller.playAction({ move });
  }, [controller, isNavigating]);
  
  // Handle bans
  const handleBan = useCallback((ban: Ban) => {
    if (isNavigating) return; // Don't allow bans while navigating history
    controller.playAction({ ban });
  }, [controller, isNavigating]);
  
  // Handle new game
  const handleNewGame = useCallback(() => {
    controller.reset();
    setCurrentMoveIndex(null);
    setIsNavigating(false);
  }, [controller]);
  
  // Handle undo
  const handleUndo = useCallback(() => {
    controller.undo();
    setCurrentMoveIndex(null);
    setIsNavigating(false);
  }, [controller]);
  
  // Handle move navigation
  const handleMoveSelect = useCallback((moveIndex: number) => {
    setCurrentMoveIndex(moveIndex);
    const isCurrentPosition = gameState?.gameState?.actionHistory && 
                            moveIndex === gameState.gameState.actionHistory.length - 1;
    
    if (isCurrentPosition) {
      setIsNavigating(false);
    } else {
      setIsNavigating(true);
      controller.navigateToMove(moveIndex);
    }
  }, [controller, gameState]);
  
  // Handle return to live position
  const handleReturnToLive = useCallback(() => {
    if (gameState?.gameState?.actionHistory) {
      const lastIndex = gameState.gameState.actionHistory.length - 1;
      controller.navigateToMove(lastIndex);
      setCurrentMoveIndex(null);
      setIsNavigating(false);
    }
  }, [controller, gameState]);
  
  // Handle save game
  const handleSaveGame = useCallback(() => {
    const savedGame = controller.saveGame();
    const blob = new Blob([savedGame], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ban-chess-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [controller]);
  
  // Handle load game
  const handleLoadGame = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          controller.loadGame(content);
          setCurrentMoveIndex(null);
          setIsNavigating(false);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [controller]);
  
  if (!gameState || !gameState.gameState) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p>Initializing local game...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)] p-4">
      <div className="flex gap-6 items-center justify-center w-full max-w-[1400px]">
        {/* Left Panel - Status */}
        <div className="w-56 flex-shrink-0">
          <GameStatusPanel 
            gameState={gameState.gameState}
            activePlayer={gameState.activePlayer}
            actionType={gameState.actionType}
            isOfflineGame={true}
            onNewGame={handleNewGame}
          />
          
          {/* Local Game Controls */}
          <div className="mt-4 bg-background-secondary rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">Local Game</h3>
            
            <div className="space-y-2">
              <button
                onClick={handleUndo}
                className="w-full px-3 py-2 bg-background-tertiary hover:bg-background-accent rounded-lg text-sm transition-colors"
                disabled={!gameState.gameState.actionHistory || gameState.gameState.actionHistory.length === 0}
              >
                Undo Move
              </button>
              
              <button
                onClick={handleSaveGame}
                className="w-full px-3 py-2 bg-background-tertiary hover:bg-background-accent rounded-lg text-sm transition-colors"
              >
                Save Game
              </button>
              
              <button
                onClick={handleLoadGame}
                className="w-full px-3 py-2 bg-background-tertiary hover:bg-background-accent rounded-lg text-sm transition-colors"
              >
                Load Game
              </button>
              
              <button
                onClick={() => router.push("/")}
                className="w-full px-3 py-2 bg-lichess-orange-500 hover:bg-lichess-orange-600 text-white rounded-lg text-sm transition-colors"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
        
        {/* Center - Board */}
        <div className="flex flex-col items-center justify-center" style={{ width: '600px', height: '600px' }}>
          <ChessBoard
            gameState={gameState.gameState}
            dests={gameState.dests}
            activePlayer={gameState.activePlayer}
            actionType={gameState.actionType}
            onMove={handleMove}
            onBan={handleBan}
            orientation={orientation}
            viewOnly={isNavigating}
            banDifficulty="medium"
          />
          
          {/* Board controls */}
          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoFlip}
                onChange={(e) => setAutoFlip(e.target.checked)}
                className="rounded"
              />
              Auto-flip board
            </label>
            
            {!autoFlip && (
              <button
                onClick={() => setOrientation(o => o === "white" ? "black" : "white")}
                className="px-3 py-1 bg-background-secondary hover:bg-background-tertiary rounded-lg text-sm transition-colors"
              >
                Flip Board
              </button>
            )}
          </div>
        </div>
        
        {/* Right Panel - Sidebar */}
        <div className="w-80 flex-shrink-0">
          <GameSidebar
            gameState={gameState.gameState}
            onMoveSelect={handleMoveSelect}
            currentMoveIndex={currentMoveIndex ?? undefined}
            isLocalGame={true}
            isViewingHistory={isNavigating}
            onReturnToLive={handleReturnToLive}
            onFlipBoard={() => setOrientation(o => o === "white" ? "black" : "white")}
            onToggleAutoFlip={() => setAutoFlip(!autoFlip)}
            autoFlipEnabled={autoFlip}
          />
        </div>
      </div>
    </div>
  );
}