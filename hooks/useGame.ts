import { useState, useEffect, useCallback, useMemo } from 'react';
import { useGameStore } from '@/contexts/GameContext';
import { BanChess } from 'ban-chess.ts';
import type { SimpleGameState, Action } from '@/lib/game-types';
import type { UserRole } from '@/lib/game/GameStore';

/**
 * Hook for game components following Lichess patterns.
 * Provides client-side intelligence for role determination and permissions.
 */
export function useGame(gameId: string) {
  const gameStore = useGameStore();
  const [gameState, setGameState] = useState<SimpleGameState | null>(null);
  const [userRole, setUserRole] = useState<UserRole>({
    role: 'spectator',
    canMove: false,
    canBan: false,
    orientation: 'white'
  });
  const [game, setGame] = useState<BanChess | null>(null);

  // Subscribe to game state updates
  useEffect(() => {
    if (!gameId) return;
    
    console.log('[useGame] Setting up subscriptions for game:', gameId);

    const unsubscribeGame = gameStore.subscribeToGame(gameId, (state) => {
      console.log('[useGame] Received game state update for:', gameId, 'state:', !!state);
      setGameState(state);
      
      // Update BanChess instance
      if (state) {
        setGame(new BanChess(state.fen));
      } else {
        setGame(null);
      }
    });

    const unsubscribeRole = gameStore.subscribeToRole(gameId, (role) => {
      setUserRole(role);
    });

    // Join the game
    gameStore.joinGame(gameId);

    return () => {
      unsubscribeGame();
      unsubscribeRole();
      gameStore.leaveGame();
    };
  }, [gameId, gameStore]);

  // Compute legal moves map for Chessground
  const dests = useMemo(() => {
    const destsMap = new Map<string, string[]>();
    if (!game || !gameState) return destsMap;
    
    const actions = game.getLegalActions();
    actions.forEach((action) => {
      const serialized = BanChess.serializeAction(action);
      const parts = serialized.split(":");
      if (parts.length === 2) {
        const moveStr = parts[1];
        if (moveStr.length >= 4) {
          const from = moveStr.substring(0, 2);
          const to = moveStr.substring(2, 4);
          
          if (!destsMap.has(from)) {
            destsMap.set(from, []);
          }
          destsMap.get(from)!.push(to);
        }
      }
    });
    
    return destsMap;
  }, [game, gameState]);

  // Action handlers
  const makeMove = useCallback((from: string, to: string) => {
    if (!userRole.canMove || !gameId) return;
    
    const action: Action = {
      move: {
        from,
        to
      }
    };
    
    gameStore.sendAction(gameId, action);
  }, [gameId, userRole.canMove, gameStore]);

  const makeBan = useCallback((square: string) => {
    if (!userRole.canBan || !gameId) return;
    
    // Parse square into from/to for ban
    const from = square.substring(0, 2);
    const to = square.substring(2, 4);
    
    const action: Action = {
      ban: {
        from,
        to
      }
    };
    
    gameStore.sendAction(gameId, action);
  }, [gameId, userRole.canBan, gameStore]);

  // Game control actions
  const joinQueue = useCallback(() => {
    gameStore.joinQueue();
  }, [gameStore]);

  const leaveQueue = useCallback(() => {
    gameStore.leaveQueue();
  }, [gameStore]);

  const createSoloGame = useCallback(() => {
    gameStore.createSoloGame();
  }, [gameStore]);

  const resign = useCallback(() => {
    if (!gameId) return;
    // Send resign as a special message, not an Action
    gameStore.sendMessage({ type: 'resign', gameId });
  }, [gameId, gameStore]);

  // Compute derived state
  const isMyTurn = userRole.canMove || userRole.canBan;
  const isPlaying = userRole.role !== 'spectator';
  const isGameOver = gameState?.gameOver || false;
  const winner = gameState?.result ? 
    (gameState.result === '1-0' ? 'white' : 
     gameState.result === '0-1' ? 'black' : 
     gameState.result === '1/2-1/2' ? 'draw' : undefined) : undefined;
  const activePlayer = game?.getActivePlayer();
  const actionType = game?.getActionType();
  const ply = game?.getPly() || 0;
  const fen = game?.fen() || '';

  return {
    // State
    gameState,
    userRole,
    game,
    
    // Computed properties
    dests,
    orientation: userRole.orientation,
    isMyTurn,
    isPlaying,
    isGameOver,
    winner,
    activePlayer,
    actionType,
    ply,
    fen,
    
    // Actions
    makeMove,
    makeBan,
    joinQueue,
    leaveQueue,
    createSoloGame,
    resign,
    
    // Direct store access for advanced use
    gameStore
  };
}

/**
 * Hook for game list/lobby components
 */
export function useGameList() {
  const gameStore = useGameStore();
  const [games, setGames] = useState<Map<string, SimpleGameState>>(new Map());

  useEffect(() => {
    // Subscribe to all game updates
    const unsubscribe = gameStore.subscribeToAll((state) => {
      if (state) {
        setGames(new Map(gameStore.getAllGames()));
      }
    });

    // Get initial games
    setGames(new Map(gameStore.getAllGames()));

    return unsubscribe;
  }, [gameStore]);

  return {
    games: Array.from(games.values()),
    joinGame: (gameId: string) => gameStore.joinGame(gameId),
    joinQueue: () => gameStore.joinQueue(),
    leaveQueue: () => gameStore.leaveQueue(),
    createSoloGame: () => gameStore.createSoloGame()
  };
}