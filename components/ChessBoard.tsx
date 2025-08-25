'use client';

import React, { useMemo } from 'react';
import Chessground from 'react-chessground';
import 'react-chessground/dist/styles/chessground.css';
import type { Move, Ban, GameState } from '@/lib/game-types';

interface ChessBoardProps {
  gameState: GameState;
  onMove: (move: Move) => void;
  onBan: (ban: Ban) => void;
  playerColor?: 'white' | 'black';
}

export default function ChessBoard({ gameState, onMove, onBan, playerColor }: ChessBoardProps) {
  
  const config = useMemo(() => {
    const baseConfig: any = {
      fen: gameState.fen.split(' ')[0],
      orientation: playerColor || 'white',
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
        color: undefined,
        dests: {},
        showDests: true,
      },
      premovable: {
        enabled: false,
      },
    };

    if (gameState.nextAction === 'move' && gameState.turn === playerColor) {
      // Player's turn to move
      const dests: Record<string, string[]> = {};
      gameState.legalMoves.forEach((move) => {
        if (!dests[move.from]) {
          dests[move.from] = [];
        }
        dests[move.from].push(move.to);
      });

      baseConfig.movable = {
        free: false,
        color: gameState.turn,
        dests: dests,
        showDests: true,
        events: {
          after: (orig: string, dest: string) => {
            const move = gameState.legalMoves.find(
              m => m.from === orig && m.to === dest
            );
            if (move) {
              onMove(move);
            }
          },
        },
      };
    } else if (gameState.nextAction === 'ban' && gameState.turn === playerColor) {
      // Player's turn to ban opponent's move
      const dests: Record<string, string[]> = {};
      gameState.legalBans.forEach((ban) => {
        if (!dests[ban.from]) {
          dests[ban.from] = [];
        }
        dests[ban.from].push(ban.to);
      });

      // During ban phase, show opponent's pieces as movable (these are the moves you can ban)
      const opponentColor = gameState.turn === 'white' ? 'black' : 'white';
      
      baseConfig.movable = {
        free: false,
        color: opponentColor,
        dests: dests,
        showDests: true,
        events: {
          after: (orig: string, dest: string) => {
            const ban = gameState.legalBans.find(
              b => b.from === orig && b.to === dest
            );
            if (ban) {
              onBan(ban);
            }
          },
        },
      };
      
      // Add visual indicator that this is ban mode
      baseConfig.drawable = {
        enabled: true,
        defaultSnapToValidMove: false,
      };
    } else {
      // Not player's turn - disable moves
      baseConfig.movable = {
        free: false,
        color: undefined,
        dests: {},
        showDests: false,
      };
    }

    return baseConfig;
  }, [gameState, playerColor, onMove, onBan]);

  return (
    <div className="chess-board-container">
      <Chessground
        {...config}
        style={{ width: '600px', height: '600px' }}
      />
      <style jsx>{`
        .chess-board-container {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }

        @media (max-width: 768px) {
          .chess-board-container :global(.cg-container) {
            width: 90vw !important;
            height: 90vw !important;
            max-width: 500px;
            max-height: 500px;
          }
        }
      `}</style>
    </div>
  );
}