'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import Chessground from 'react-chessground';
import 'react-chessground/dist/styles/chessground.css';
import type { Move, Ban, GameState, HistoryEntry } from '@/lib/game-types';
import soundManager from '@/lib/sound-manager';

interface ChessBoardProps {
  gameState: GameState;
  onMove: (move: Move) => void;
  onBan: (ban: Ban) => void;
  playerColor?: 'white' | 'black';
}

export default function ChessBoard({ gameState, onMove, onBan, playerColor }: ChessBoardProps) {
  const previousHistoryRef = useRef<HistoryEntry[]>([]);
  const hasPlayedGameStartRef = useRef(false);
  
  // Play game start sound when first joining
  useEffect(() => {
    if (!hasPlayedGameStartRef.current && gameState.history.length === 0) {
      soundManager.play('game-start');
      hasPlayedGameStartRef.current = true;
    }
  }, []);
  
  // Detect and play sounds for moves
  useEffect(() => {
    const previousHistory = previousHistoryRef.current;
    const currentHistory = gameState.history;
    
    // Check if a new move was made
    if (currentHistory.length > previousHistory.length) {
      const lastEntry = currentHistory[currentHistory.length - 1];
      
      // Only play sound for actual moves, not bans
      if (lastEntry.actionType === 'move') {
        const move = lastEntry.action as Move;
        const isOpponent = lastEntry.player !== playerColor;
        
        // Determine move characteristics
        const moveDetails = {
          isOpponent,
          capture: false,
          castle: false,
          check: false,
          promotion: false,
        };
        
        // Check for capture (if 'x' is in the SAN notation)
        if (lastEntry.san && lastEntry.san.includes('x')) {
          moveDetails.capture = true;
        }
        
        // Check for castling
        if (lastEntry.san && (lastEntry.san === 'O-O' || lastEntry.san === 'O-O-O')) {
          moveDetails.castle = true;
        }
        
        // Check for check
        if (lastEntry.san && lastEntry.san.includes('+')) {
          moveDetails.check = true;
        }
        
        // Check for checkmate (game end)
        if (lastEntry.san && lastEntry.san.includes('#')) {
          soundManager.play('game-end');
        } else if (move.promotion) {
          moveDetails.promotion = true;
        }
        
        // Play the appropriate sound
        if (!lastEntry.san?.includes('#')) {
          soundManager.playMoveSound(moveDetails);
        }
      }
    }
    
    // Update the reference
    previousHistoryRef.current = [...currentHistory];
  }, [gameState.history, playerColor]);
  
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
        dests: new Map(),
        showDests: true,
      },
      premovable: {
        enabled: false,
      },
    };

    if (gameState.nextAction === 'move' && gameState.turn === playerColor) {
      // Player's turn to move
      const dests = new Map<string, string[]>();
      gameState.legalMoves.forEach((move) => {
        if (!dests.has(move.from)) {
          dests.set(move.from, []);
        }
        dests.get(move.from)!.push(move.to);
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
      const dests = new Map<string, string[]>();
      gameState.legalBans.forEach((ban) => {
        if (!dests.has(ban.from)) {
          dests.set(ban.from, []);
        }
        dests.get(ban.from)!.push(ban.to);
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
        dests: new Map(),
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