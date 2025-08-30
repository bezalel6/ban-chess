'use client';

import React from 'react';
import { Crown, Ban, Move, AlertCircle, Trophy, Handshake } from 'lucide-react';

interface GameStatePanelProps {
  currentPlayer: 'white' | 'black';
  nextAction: 'move' | 'ban';
  gameOver: boolean;
  inCheck?: boolean;
  winner?: 'white' | 'black' | 'draw';
  gameOverReason?: string;
  moveCount: number;
}

export default function GameStatePanel({
  currentPlayer,
  nextAction,
  gameOver,
  inCheck,
  winner,
  gameOverReason,
  moveCount,
}: GameStatePanelProps) {
  return (
    <div className='w-full space-y-6'>
      <h2 className='text-xl font-bold text-foreground'>Game Status</h2>

      {/* Game Over State */}
      {gameOver ? (
        <div className='space-y-4'>
          <div className='p-6 rounded-lg bg-background-secondary/50 border-2 border-lichess-orange-500'>
            <div className='flex items-center justify-center gap-3 mb-4'>
              {winner === 'draw' ? (
                <>
                  <Handshake className='w-8 h-8 text-foreground' />
                  <span className='text-2xl font-bold'>Draw</span>
                </>
              ) : (
                <>
                  <Trophy className='w-8 h-8 text-lichess-orange-500' />
                  <span className='text-2xl font-bold capitalize'>
                    {winner} Wins!
                  </span>
                </>
              )}
            </div>
            {gameOverReason && (
              <p className='text-center text-foreground-muted'>
                {gameOverReason}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Active Game State */
        <div className='space-y-4'>
          {/* Current Turn */}
          <div className='p-4 rounded-lg bg-background-secondary/30'>
            <div className='text-sm text-foreground-muted mb-1'>
              Current Turn
            </div>
            <div className='flex items-center gap-2'>
              <div
                className={`w-4 h-4 rounded-full ${
                  currentPlayer === 'white' ? 'bg-white' : 'bg-gray-800'
                } border border-gray-600`}
              />
              <span className='text-lg font-semibold capitalize'>
                {currentPlayer}
              </span>
              {inCheck && (
                <div className='flex items-center gap-1 text-destructive-400'>
                  <AlertCircle className='w-4 h-4' />
                  <span className='text-sm'>Check!</span>
                </div>
              )}
            </div>
          </div>

          {/* Next Action */}
          <div className='p-4 rounded-lg bg-background-secondary/30'>
            <div className='text-sm text-foreground-muted mb-1'>
              Next Action
            </div>
            <div className='flex items-center gap-2'>
              {nextAction === 'ban' ? (
                <>
                  <Ban className='w-5 h-5 text-destructive-400' />
                  <span className='text-lg font-semibold text-destructive-400'>
                    Ban a move
                  </span>
                </>
              ) : (
                <>
                  <Move className='w-5 h-5 text-success-400' />
                  <span className='text-lg font-semibold text-success-400'>
                    Make a move
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Move Counter */}
      <div className='p-4 rounded-lg bg-background-secondary/30'>
        <div className='text-sm text-foreground-muted mb-1'>Total Actions</div>
        <div className='text-2xl font-bold text-foreground'>{moveCount}</div>
      </div>

      {/* Game Rules Reminder */}
      <div className='mt-6 p-4 rounded-lg bg-background-secondary/20 border border-border'>
        <h3 className='text-sm font-semibold text-foreground mb-2'>
          How to Play
        </h3>
        <ul className='space-y-1 text-xs text-foreground-muted'>
          <li className='flex items-start gap-2'>
            <Ban className='w-3 h-3 mt-0.5 text-destructive-400 flex-shrink-0' />
            <span>First, ban one of your opponent&apos;s moves</span>
          </li>
          <li className='flex items-start gap-2'>
            <Move className='w-3 h-3 mt-0.5 text-success-400 flex-shrink-0' />
            <span>Then make your move</span>
          </li>
          <li className='flex items-start gap-2'>
            <Crown className='w-3 h-3 mt-0.5 text-lichess-orange-500 flex-shrink-0' />
            <span>Win by checkmate or opponent resignation</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
