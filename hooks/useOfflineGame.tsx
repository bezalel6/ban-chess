"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { BanChess } from "ban-chess.ts";
import type {
  SimpleGameState,
  Action,
  HistoryEntry,
  GameEvent,
  Square,
  Move,
  Ban,
} from "@/lib/game-types";
import soundManager from "@/lib/sound-manager";
import { useAuth } from "@/components/AuthProvider";

export function useOfflineGame() {
  const { user } = useAuth();
  const [game, setGame] = useState<BanChess | null>(null);
  const [gameState, setGameState] = useState<SimpleGameState | null>(null);
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);
  const [gameId, setGameId] = useState<string | null>(null);
  
  const previousFen = useRef<string | null>(null);

  // Get current state from BanChess instance
  const activePlayer = game?.getActivePlayer();
  const actionType = game?.getActionType();
  const ply = game?.getPly();
  
  // Convert legal actions to dests map for Chessground
  const dests = useMemo(() => {
    const destsMap = new Map<Square, Square[]>();
    if (!game) return destsMap;
    
    const actions = game.getLegalActions();
    actions.forEach((action) => {
      // Convert Action object to BCN format string
      const serialized = BanChess.serializeAction(action);
      // Parse BCN format (e.g., "b:e2e4" or "m:d2d4")
      const parts = serialized.split(":");
      if (parts.length === 2) {
        const moveStr = parts[1]; // e.g., "e2e4"
        if (moveStr.length >= 4) {
          const from = moveStr.substring(0, 2) as Square;
          const to = moveStr.substring(2, 4) as Square;
          
          if (!destsMap.has(from)) {
            destsMap.set(from, []);
          }
          destsMap.get(from)!.push(to);
        }
      }
    });
    
    return destsMap;
  }, [game]);

  const createOfflineGame = useCallback((gameIdToUse?: string) => {
    const newGameId = gameIdToUse || `offline-${Date.now()}`;
    const banChessInstance = new BanChess();
    
    setGame(banChessInstance);
    setGameId(newGameId);
    
    // Create minimal game state for UI compatibility
    const username = user?.username || "Player";
    setGameState({
      fen: banChessInstance.fen(),
      gameId: newGameId,
      players: {
        white: { id: user?.userId || "offline-white", username },
        black: { id: user?.userId || "offline-black", username },
      },
      activePlayer: banChessInstance.getActivePlayer(),
      ply: banChessInstance.getPly(),
      gameOver: false,
      history: [],
    });
    
    setGameEvents([]);
    previousFen.current = banChessInstance.fen();
    
    // Play game start sound
    soundManager.playEvent("game-start");
    
    console.log("[OfflineGame] Created new offline game:", newGameId);
  }, [user]);

  const sendAction = useCallback((action: Action) => {
    if (!game || !gameState) {
      console.warn("[OfflineGame] No active game to send action to");
      return;
    }

    try {
      let move: Move | undefined;
      let ban: Ban | undefined;

      if ('move' in action) {
        move = action.move;
        // Apply move to BanChess instance
        const moveResult = game.move(move.from, move.to, move.promotion);
        if (!moveResult) {
          console.warn("[OfflineGame] Invalid move:", move);
          return;
        }
      } else if ('ban' in action) {
        ban = action.ban;
        // Apply ban to BanChess instance
        const banResult = game.ban(ban.from, ban.to);
        if (!banResult) {
          console.warn("[OfflineGame] Invalid ban:", ban);
          return;
        }
      }

      // Update game state with new position
      const newFen = game.fen();
      const newActivePlayer = game.getActivePlayer();
      const newPly = game.getPly();
      const isGameOver = game.isGameOver();
      
      setGameState(prevState => ({
        ...prevState!,
        fen: newFen,
        activePlayer: newActivePlayer,
        ply: newPly,
        gameOver: isGameOver,
        result: isGameOver ? game.getResult() : undefined,
      }));

      // Add event to game events
      const eventType = move ? "move-made" : "ban-made";
      const eventMessage = move 
        ? `Move: ${move.from}-${move.to}${move.promotion ? '=' + move.promotion : ''}`
        : `Ban: ${ban!.from}-${ban!.to}`;
        
      const gameEvent: GameEvent = {
        timestamp: Date.now(),
        type: eventType,
        message: eventMessage,
        player: activePlayer,
        metadata: move ? { move } : { ban },
      };
      
      setGameEvents(prev => [...prev, gameEvent]);

      // Play sound effects
      if (previousFen.current && newFen !== previousFen.current) {
        const prevPieces = (previousFen.current.match(/[prnbqk]/gi) || []).length;
        const currentPieces = (newFen.match(/[prnbqk]/gi) || []).length;
        
        soundManager.playMoveSound({
          check: game.isInCheck(),
          capture: currentPieces < prevPieces,
        });
      }
      
      previousFen.current = newFen;

      // Handle game over
      if (isGameOver) {
        const result = game.getResult();
        console.log("[OfflineGame] Game Over:", result);
        
        soundManager.playEvent("game-end", {
          result: result || "Game ended",
          playerRole: "both", // In offline mode, user plays both sides
        });
        
        // Add game over event
        const gameOverEvent: GameEvent = {
          timestamp: Date.now(),
          type: game.isCheckmate() ? "checkmate" : 
                game.isStalemate() ? "stalemate" : "draw",
          message: result || "Game ended",
          metadata: { result: result || "Game ended" },
        };
        
        setGameEvents(prev => [...prev, gameOverEvent]);
      }

      console.log("[OfflineGame] Action processed:", {
        action,
        newFen,
        newActivePlayer,
        newPly,
        isGameOver
      });
      
    } catch (error) {
      console.error("[OfflineGame] Error processing action:", error);
    }
  }, [game, gameState, activePlayer]);

  const resignGame = useCallback(() => {
    if (!gameState || gameState.gameOver) {
      return;
    }

    setGameState(prevState => ({
      ...prevState!,
      gameOver: true,
      result: `${activePlayer === 'white' ? 'Black' : 'White'} wins by resignation`,
    }));

    const resignEvent: GameEvent = {
      timestamp: Date.now(),
      type: "resignation",
      message: `${activePlayer === 'white' ? 'White' : 'Black'} resigned`,
      player: activePlayer,
    };
    
    setGameEvents(prev => [...prev, resignEvent]);

    soundManager.playEvent("game-end", {
      result: `${activePlayer === 'white' ? 'Black' : 'White'} wins by resignation`,
      playerRole: "both",
    });

    console.log("[OfflineGame] Game resigned");
  }, [gameState, activePlayer]);

  const isOfflineGame = useMemo(() => {
    return gameId?.startsWith("offline-") || false;
  }, [gameId]);

  return {
    // State
    gameState,
    game,
    dests,
    activePlayer,
    actionType,
    ply,
    gameEvents,
    gameId,
    isOfflineGame,

    // Actions
    createOfflineGame,
    sendAction,
    resignGame,

    // Status
    connected: true, // Offline games are always "connected"
    error: null,
  };
}