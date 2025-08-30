'use client';

import React, { useMemo } from 'react';
import type { SerializedAction } from '@/lib/game-types';

interface MovesListProps {
  moves: SerializedAction[];
  currentMoveIndex: number;
  onMoveClick: (index: number) => void;
}

export default function MovesList({ 
  moves, 
  currentMoveIndex, 
  onMoveClick 
}: MovesListProps) {
  // Parse moves into pairs (ban + move)
  const movePairs = useMemo(() => {
    const pairs: Array<{ ban?: string; move?: string; moveNumber: number }> = [];
    let currentPair: { ban?: string; move?: string; moveNumber: number } = { moveNumber: 1 };
    
    moves.forEach((action) => {
      if (action.startsWith('b:')) {
        // Ban move
        if (currentPair.ban) {
          // Start new pair if we already have a ban
          pairs.push(currentPair);
          currentPair = { ban: action, moveNumber: pairs.length + 1 };
        } else {
          currentPair.ban = action;
        }
      } else if (action.startsWith('m:')) {
        // Regular move
        currentPair.move = action;
        pairs.push(currentPair);
        currentPair = { moveNumber: pairs.length + 2 };
      }
    });
    
    // Add incomplete pair if exists
    if (currentPair.ban || currentPair.move) {
      pairs.push(currentPair);
    }
    
    return pairs;
  }, [moves]);

  // Format move notation for display
  const formatMove = (action: string) => {
    if (!action) return '';
    
    const [, notation] = action.split(':'); // Skip type, we only need notation
    if (!notation) return '';
    
    // Extract from and to squares
    const from = notation.substring(0, 2);
    const to = notation.substring(2, 4);
    const promotion = notation.substring(4);
    
    // Format as algebraic notation (simplified)
    const formatted = `${from}-${to}${promotion ? '=' + promotion.toUpperCase() : ''}`;
    
    return formatted;
  };

  // Get the index of a specific action in the moves array
  const getActionIndex = (pairIndex: number, isBan: boolean) => {
    let index = 0;
    for (let i = 0; i < pairIndex; i++) {
      if (movePairs[i].ban) index++;
      if (movePairs[i].move) index++;
    }
    if (isBan && movePairs[pairIndex].ban) {
      return index;
    } else if (!isBan && movePairs[pairIndex].move) {
      return index + (movePairs[pairIndex].ban ? 1 : 0);
    }
    return -1;
  };

  return (
    <div className="bg-background-secondary rounded-xl p-4 sm:p-6 shadow-lg w-full overflow-hidden">
      <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">
        Moves
      </h2>
      
      <div className="space-y-1 max-h-[400px] sm:max-h-[500px] lg:max-h-[600px] overflow-y-auto overflow-x-hidden pr-1">
        {movePairs.length === 0 ? (
          <div className="text-foreground-subtle text-sm py-4 text-center">
            No moves yet. Start playing!
          </div>
        ) : (
          movePairs.map((pair, index) => {
            const banIndex = getActionIndex(index, true);
            const moveIndex = getActionIndex(index, false);
            
            return (
              <div 
                key={index}
                className="flex items-center gap-1 sm:gap-2 py-1 sm:py-1.5 px-1 sm:px-2 rounded hover:bg-background-tertiary/50"
              >
                {/* Move number */}
                <span className="text-foreground-muted text-xs sm:text-sm font-medium w-6 sm:w-8 flex-shrink-0">
                  {pair.moveNumber}.
                </span>
                
                {/* Ban move */}
                {pair.ban && (
                  <button
                    onClick={() => onMoveClick(banIndex + 1)}
                    className={`flex-1 min-w-0 text-left px-1 sm:px-2 py-0.5 sm:py-1 rounded text-xs sm:text-sm font-mono transition-colors overflow-hidden
                      ${banIndex < currentMoveIndex 
                        ? 'bg-destructive-500/20 text-destructive-400 hover:bg-destructive-500/30' 
                        : banIndex === currentMoveIndex - 1
                        ? 'bg-destructive-500/40 text-destructive-400 font-bold'
                        : 'text-foreground-subtle hover:text-foreground'}`}
                  >
                    <span className="text-[10px] sm:text-xs text-destructive-400 mr-0.5 sm:mr-1">BAN</span>
                    <span className="truncate">{formatMove(pair.ban)}</span>
                  </button>
                )}
                
                {/* Regular move */}
                {pair.move && (
                  <button
                    onClick={() => onMoveClick(moveIndex + 1)}
                    className={`flex-1 min-w-0 text-left px-1 sm:px-2 py-0.5 sm:py-1 rounded text-xs sm:text-sm font-mono transition-colors overflow-hidden
                      ${moveIndex < currentMoveIndex 
                        ? 'bg-lichess-green/20 text-success-400 hover:bg-lichess-green/30' 
                        : moveIndex === currentMoveIndex - 1
                        ? 'bg-lichess-green/40 text-success-400 font-bold'
                        : 'text-foreground-subtle hover:text-foreground'}`}
                  >
                    <span className="truncate">{formatMove(pair.move)}</span>
                  </button>
                )}
                
                {/* Empty slot if only ban */}
                {pair.ban && !pair.move && (
                  <div className="flex-1 min-w-0" />
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Move count */}
      {moves.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border text-sm text-foreground-muted">
          Total actions: {moves.length} ({moves.filter(m => m.startsWith('b:')).length} bans, {moves.filter(m => m.startsWith('m:')).length} moves)
        </div>
      )}
    </div>
  );
}