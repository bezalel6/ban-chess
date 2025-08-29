'use client';

import type { SimpleGameState } from '@/lib/game-types';
import { getCurrentBan } from '@/lib/game-types';

interface GameStatusPanelProps {
  gameState: SimpleGameState;
  onNewGame?: () => void;
}

export default function GameStatusPanel({ gameState, onNewGame }: GameStatusPanelProps) {
  const currentBan = getCurrentBan(gameState.fen);
  const nextAction = gameState.nextAction || 'move';
  
  return (
    <div className="bg-background-secondary rounded-lg p-4 h-full flex flex-col">
      {/* Game Status Section */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-foreground-muted mb-3">GAME STATUS</h3>
        
        {gameState.gameOver ? (
          <div className="space-y-3">
            <div className="bg-yellow-500 text-black px-3 py-2 rounded-md font-bold text-center animate-pulse">
              GAME OVER
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">
                {gameState.result}
              </p>
            </div>
            {onNewGame && (
              <button 
                onClick={onNewGame}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                New Game
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Current Action */}
            <div className="bg-background-tertiary rounded-md p-2">
              <p className="text-xs text-foreground-muted mb-1">Current Action:</p>
              <p className="text-sm font-medium text-foreground">
                {nextAction === 'ban' ? 'Select a move to ban' : 'Make your move'}
              </p>
            </div>
            
            {/* Banned Move */}
            {currentBan && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-md p-2">
                <p className="text-xs text-red-400 mb-1">Currently Banned:</p>
                <p className="text-sm font-bold text-red-500">
                  {currentBan.from.toUpperCase()} → {currentBan.to.toUpperCase()}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Game Chat Section (Placeholder for future) */}
      <div className="flex-1 flex flex-col">
        <h3 className="text-sm font-semibold text-foreground-muted mb-3">GAME CHAT</h3>
        <div className="flex-1 bg-background-tertiary rounded-md p-3 overflow-y-auto">
          <p className="text-xs text-foreground-muted italic">Chat coming soon...</p>
        </div>
      </div>
    </div>
  );
}