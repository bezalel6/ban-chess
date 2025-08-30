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
  // Parse moves into full moves (White ban+move, Black ban+move)
  const fullMoves = useMemo(() => {
    const result: Array<{
      moveNumber: number;
      white: { ban?: string; move?: string };
      black: { ban?: string; move?: string };
    }> = [];
    
    let currentMove = {
      moveNumber: 1,
      white: {} as { ban?: string; move?: string },
      black: {} as { ban?: string; move?: string }
    };
    let isWhiteTurn = true;
    let expectingBan = true;
    
    moves.forEach((action) => {
      const isBan = action.startsWith('b:');
      const isMove = action.startsWith('m:');
      
      if (isWhiteTurn) {
        if (isBan && expectingBan) {
          currentMove.white.ban = action;
          expectingBan = false;
        } else if (isMove && !expectingBan) {
          currentMove.white.move = action;
          isWhiteTurn = false;
          expectingBan = true;
        }
      } else {
        if (isBan && expectingBan) {
          currentMove.black.ban = action;
          expectingBan = false;
        } else if (isMove && !expectingBan) {
          currentMove.black.move = action;
          // Complete full move
          result.push(currentMove);
          currentMove = {
            moveNumber: result.length + 2,
            white: {},
            black: {}
          };
          isWhiteTurn = true;
          expectingBan = true;
        }
      }
    });
    
    // Add incomplete move if exists
    if (currentMove.white.ban || currentMove.white.move || 
        currentMove.black.ban || currentMove.black.move) {
      result.push(currentMove);
    }
    
    return result;
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
  const getActionIndex = (moveIndex: number, player: 'white' | 'black', isBan: boolean) => {
    let index = 0;
    
    // Count all actions before this move
    for (let i = 0; i < moveIndex; i++) {
      const move = fullMoves[i];
      if (!move) break;
      if (move.white.ban) index++;
      if (move.white.move) index++;
      if (move.black.ban) index++;
      if (move.black.move) index++;
    }
    
    // Add actions within this move
    const currentMove = fullMoves[moveIndex];
    if (!currentMove) return -1;
    
    if (player === 'white') {
      if (isBan && currentMove.white.ban) return index;
      if (!isBan && currentMove.white.move) {
        return index + (currentMove.white.ban ? 1 : 0);
      }
    } else {
      // Black
      let whiteActions = 0;
      if (currentMove.white.ban) whiteActions++;
      if (currentMove.white.move) whiteActions++;
      
      if (isBan && currentMove.black.ban) {
        return index + whiteActions;
      }
      if (!isBan && currentMove.black.move) {
        return index + whiteActions + (currentMove.black.ban ? 1 : 0);
      }
    }
    
    return -1;
  };

  return (
    <div className="w-full overflow-hidden">
      <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">
        Moves
      </h2>
      
      <div className="space-y-1 max-h-[400px] sm:max-h-[500px] lg:max-h-[600px] overflow-y-auto overflow-x-hidden pr-1">
        {fullMoves.length === 0 ? (
          <div className="text-foreground-subtle text-sm py-4 text-center">
            No moves yet. Start playing!
          </div>
        ) : (
          fullMoves.map((fullMove, index) => {
            const whiteBanIndex = getActionIndex(index, 'white', true);
            const whiteMoveIndex = getActionIndex(index, 'white', false);
            const blackBanIndex = getActionIndex(index, 'black', true);
            const blackMoveIndex = getActionIndex(index, 'black', false);
            
            return (
              <div 
                key={index}
                className="flex items-stretch gap-1 py-0.5 px-1 rounded hover:bg-background-tertiary/50"
              >
                {/* Move number */}
                <span className="text-foreground-muted text-xs font-medium w-5 flex-shrink-0 py-1">
                  {fullMove.moveNumber}.
                </span>
                
                {/* White's turn (ban + move) */}
                <div className="flex-1 flex items-center gap-0.5">
                  {/* White ban */}
                  {fullMove.white.ban && (
                    <button
                      onClick={() => onMoveClick(whiteBanIndex + 1)}
                      className={`px-1 py-0.5 rounded text-[10px] font-mono transition-colors
                        ${whiteBanIndex < currentMoveIndex 
                          ? 'bg-destructive-500/20 text-destructive-400 hover:bg-destructive-500/30' 
                          : whiteBanIndex === currentMoveIndex - 1
                          ? 'bg-destructive-500/40 text-destructive-400 font-bold'
                          : 'text-foreground-subtle hover:text-foreground'}`}
                      title={`Ban: ${formatMove(fullMove.white.ban)}`}
                    >
                      <span className="text-[8px] text-destructive-400 mr-0.5">×</span>
                      {formatMove(fullMove.white.ban)}
                    </button>
                  )}
                  
                  {/* White move */}
                  {fullMove.white.move && (
                    <button
                      onClick={() => onMoveClick(whiteMoveIndex + 1)}
                      className={`flex-1 text-left px-1.5 py-0.5 rounded text-xs font-mono transition-colors
                        ${whiteMoveIndex < currentMoveIndex 
                          ? 'bg-lichess-green/20 text-success-400 hover:bg-lichess-green/30' 
                          : whiteMoveIndex === currentMoveIndex - 1
                          ? 'bg-lichess-green/40 text-success-400 font-bold'
                          : 'text-foreground-subtle hover:text-foreground'}`}
                    >
                      {formatMove(fullMove.white.move)}
                    </button>
                  )}
                  
                  {/* Empty slots if incomplete */}
                  {!fullMove.white.ban && !fullMove.white.move && (
                    <div className="flex-1" />
                  )}
                </div>
                
                {/* Black's turn (ban + move) */}
                <div className="flex-1 flex items-center gap-0.5">
                  {/* Black ban */}
                  {fullMove.black.ban && (
                    <button
                      onClick={() => onMoveClick(blackBanIndex + 1)}
                      className={`px-1 py-0.5 rounded text-[10px] font-mono transition-colors
                        ${blackBanIndex < currentMoveIndex 
                          ? 'bg-destructive-500/20 text-destructive-400 hover:bg-destructive-500/30' 
                          : blackBanIndex === currentMoveIndex - 1
                          ? 'bg-destructive-500/40 text-destructive-400 font-bold'
                          : 'text-foreground-subtle hover:text-foreground'}`}
                      title={`Ban: ${formatMove(fullMove.black.ban)}`}
                    >
                      <span className="text-[8px] text-destructive-400 mr-0.5">×</span>
                      {formatMove(fullMove.black.ban)}
                    </button>
                  )}
                  
                  {/* Black move */}
                  {fullMove.black.move && (
                    <button
                      onClick={() => onMoveClick(blackMoveIndex + 1)}
                      className={`flex-1 text-left px-1.5 py-0.5 rounded text-xs font-mono transition-colors
                        ${blackMoveIndex < currentMoveIndex 
                          ? 'bg-lichess-green/20 text-success-400 hover:bg-lichess-green/30' 
                          : blackMoveIndex === currentMoveIndex - 1
                          ? 'bg-lichess-green/40 text-success-400 font-bold'
                          : 'text-foreground-subtle hover:text-foreground'}`}
                    >
                      {formatMove(fullMove.black.move)}
                    </button>
                  )}
                  
                  {/* Empty slots if incomplete */}
                  {!fullMove.black.ban && !fullMove.black.move && (
                    <div className="flex-1" />
                  )}
                </div>
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