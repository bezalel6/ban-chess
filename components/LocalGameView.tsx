"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import dynamic from "next/dynamic";
import { Dialog, Transition } from "@headlessui/react";
import { LocalGameController } from "@/lib/controllers/LocalGameController";
import type { GameControllerState } from "@/lib/controllers/IGameController";
import type { Move, Ban } from "@/lib/game-types";
import GameSidebar from "./game/GameSidebar";
import GameStatusPanel from "./game/GameStatusPanel";
import { useRouter } from "next/navigation";
import { useBanDifficulty } from "@/hooks/useBanDifficulty";

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
  const { banDifficulty } = useBanDifficulty();
  const [controller] = useState(() => new LocalGameController(initialFen));
  const [gameState, setGameState] = useState<GameControllerState | null>(null);
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [autoFlip, setAutoFlip] = useState(true);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
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
    <div className="flex justify-center w-full min-h-0">
      <div className="flex gap-6 justify-center w-full max-w-[1400px] p-4">
        {/* Left Panel - Status */}
        <div className="w-56 flex-shrink-0">
          <GameStatusPanel 
            gameState={gameState.gameState}
            activePlayer={gameState.activePlayer}
            actionType={gameState.actionType}
            isOfflineGame={true}
            onNewGame={handleNewGame}
          />
          
          {/* Local Game Options Button */}
          <button
            onClick={() => setIsDialogOpen(true)}
            className="mt-4 w-full px-3 py-2 bg-background-secondary hover:bg-background-tertiary rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Game Options
          </button>
        </div>
        
        {/* Center - Board */}
        <div className="flex flex-col items-center">
          <ResizableBoard
            gameState={gameState.gameState}
            dests={gameState.dests}
            activePlayer={gameState.activePlayer}
            actionType={gameState.actionType}
            onMove={handleMove}
            onBan={handleBan}
            orientation={orientation}
            canInteract={!isNavigating}
            banDifficulty={banDifficulty}
          />
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

      {/* Game Options Dialog */}
      <Transition appear show={isDialogOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsDialogOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-50" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-background-secondary p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-foreground mb-4"
                  >
                    Game Options
                  </Dialog.Title>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        handleUndo();
                        setIsDialogOpen(false);
                      }}
                      className="w-full px-4 py-2 bg-background-tertiary hover:bg-background-accent rounded-lg text-sm transition-colors text-left"
                      disabled={!gameState.gameState.actionHistory || gameState.gameState.actionHistory.length === 0}
                    >
                      <div className="font-medium">Undo Move</div>
                      <div className="text-xs text-foreground-muted">Take back the last action</div>
                    </button>
                    
                    <button
                      onClick={() => {
                        handleSaveGame();
                        setIsDialogOpen(false);
                      }}
                      className="w-full px-4 py-2 bg-background-tertiary hover:bg-background-accent rounded-lg text-sm transition-colors text-left"
                    >
                      <div className="font-medium">Save Game</div>
                      <div className="text-xs text-foreground-muted">Download game as JSON</div>
                    </button>
                    
                    <button
                      onClick={() => {
                        handleLoadGame();
                        setIsDialogOpen(false);
                      }}
                      className="w-full px-4 py-2 bg-background-tertiary hover:bg-background-accent rounded-lg text-sm transition-colors text-left"
                    >
                      <div className="font-medium">Load Game</div>
                      <div className="text-xs text-foreground-muted">Load a previously saved game</div>
                    </button>
                    
                    <hr className="border-background-tertiary" />
                    
                    <button
                      onClick={() => {
                        setIsDialogOpen(false);
                        router.push("/");
                      }}
                      className="w-full px-4 py-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded-lg text-sm transition-colors text-left"
                    >
                      <div className="font-medium">Exit to Menu</div>
                      <div className="text-xs opacity-80">Leave the current game</div>
                    </button>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground transition-colors"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}