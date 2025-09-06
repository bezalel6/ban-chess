"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { BanChess } from "ban-chess.ts";
import type { Action as BanChessAction } from "ban-chess.ts";
import type { Action, Ban, SyncState } from "@/lib/game-types";

/**
 * useBanChess - Hook for managing a BanChess game instance
 * 
 * This hook completely encapsulates ban-chess.ts game logic,
 * providing a clean interface for components to interact with the game.
 * 
 * Features:
 * - Manages BanChess instance
 * - Provides current game state
 * - Handles moves and bans
 * - Supports save/load via syncState
 * - Game navigation and replay
 */

export interface BanChessState {
  // Core game state
  fen: string;
  ply: number;
  activePlayer: "white" | "black";
  actionType: "ban" | "move";
  
  // Legal actions
  legalActions: Action[];
  dests: Map<string, string[]>; // For chessground
  
  // Game status
  inCheck: boolean;
  inCheckmate: boolean;
  inStalemate: boolean;
  gameOver: boolean;
  
  // Current ban (if any)
  currentBan: Ban | null;
  
  // History
  actionHistory: string[]; // BCN format
  actionLog: string[]; // Human readable
}

export function useBanChess(initialFen?: string) {
  // Create and maintain BanChess instance
  const gameRef = useRef<BanChess>(new BanChess(initialFen));
  const [version, setVersion] = useState(0); // Force re-renders
  
  // Extract current game state
  const gameState = useMemo<BanChessState>(() => {
    const game = gameRef.current;
    
    // Convert legal actions to destinations map for chessground
    const dests = new Map<string, string[]>();
    const legalActions = game.getLegalActions();
    
    legalActions.forEach((action) => {
      if ('move' in action) {
        const move = action.move;
        if (!dests.has(move.from)) {
          dests.set(move.from, []);
        }
        dests.get(move.from)!.push(move.to);
      } else if ('ban' in action) {
        const ban = action.ban;
        if (!dests.has(ban.from)) {
          dests.set(ban.from, []);
        }
        dests.get(ban.from)!.push(ban.to);
      }
    });
    
    return {
      fen: game.fen(),
      ply: game.getPly(),
      activePlayer: game.getActivePlayer(),
      actionType: game.getActionType(),
      legalActions,
      dests,
      inCheck: game.inCheck(),
      inCheckmate: game.inCheckmate(),
      inStalemate: game.inStalemate(),
      gameOver: game.gameOver(),
      currentBan: game.currentBannedMove,
      actionHistory: game.getActionHistory(),
      actionLog: game.getActionLog(),
    };
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Play an action (move or ban)
  const playAction = useCallback((action: Action) => {
    const result = gameRef.current.play(action as BanChessAction);
    if (result.success) {
      setVersion(v => v + 1); // Trigger re-render
    }
    return result;
  }, []);
  
  // Play a move (convenience method)
  const playMove = useCallback((from: string, to: string, promotion?: "q" | "r" | "b" | "n") => {
    return playAction({ move: { from, to, promotion } });
  }, [playAction]);
  
  // Play a ban (convenience method)
  const playBan = useCallback((from: string, to: string) => {
    return playAction({ ban: { from, to } });
  }, [playAction]);
  
  // Reset the game
  const reset = useCallback(() => {
    gameRef.current.reset();
    setVersion(v => v + 1);
  }, []);
  
  // Save game state
  const saveGame = useCallback(() => {
    return gameRef.current.getSyncState();
  }, []);
  
  // Load game state
  const loadGame = useCallback((syncState: SyncState) => {
    // Ensure ply field exists for ban-chess.ts v3
    const stateWithPly = {
      ...syncState,
      ply: syncState.ply ?? ((syncState.moveNumber - 1) * 2 + 1)
    };
    gameRef.current.loadFromSyncState(stateWithPly);
    setVersion(v => v + 1);
  }, []);
  
  // Get action history for replay
  const getActionHistory = useCallback(() => {
    return gameRef.current.getActionHistory();
  }, []);
  
  // Replay from action history
  const replayFromActions = useCallback((actions: string[]) => {
    const newGame = BanChess.replayFromActions(actions);
    gameRef.current = newGame;
    setVersion(v => v + 1);
  }, []);
  
  // Navigate to specific move index
  const navigateToMove = useCallback((moveIndex: number) => {
    const history = gameRef.current.getActionHistory();
    if (moveIndex < 0 || moveIndex >= history.length) {
      return false;
    }
    
    const actionsToReplay = history.slice(0, moveIndex + 1);
    replayFromActions(actionsToReplay);
    return true;
  }, [replayFromActions]);
  
  // Undo last action
  const undo = useCallback(() => {
    const history = gameRef.current.getActionHistory();
    if (history.length > 0) {
      const actionsToReplay = history.slice(0, -1);
      if (actionsToReplay.length === 0) {
        reset();
      } else {
        replayFromActions(actionsToReplay);
      }
      return true;
    }
    return false;
  }, [replayFromActions, reset]);
  
  return {
    // Current state
    gameState,
    
    // Actions
    playAction,
    playMove,
    playBan,
    
    // Game control
    reset,
    undo,
    
    // Save/Load
    saveGame,
    loadGame,
    
    // Navigation
    navigateToMove,
    replayFromActions,
    getActionHistory,
    
    // Direct game instance access (if needed)
    game: gameRef.current,
  };
}