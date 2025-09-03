/**
 * Game Service Layer
 *
 * Handles all game logic operations, following Lichess's service separation pattern.
 * This service is stateless and can be horizontally scaled.
 */

import { BanChess } from "ban-chess.ts";
import type { Action, HistoryEntry } from "@/lib/game-types";
import {
  saveGameState,
  getGameState,
  addActionToHistory,
  getActionHistory,
  addMoveTime,
  redis,
  KEYS,
  type GameStateData,
} from "../redis";
import { saveCompletedGame } from "./game-persistence";

export interface GameValidationResult {
  success: boolean;
  error?: string;
  updatedFen?: string;
  gameOver?: boolean;
  result?: string;
}

export interface GameCreationOptions {
  gameId: string;
  whitePlayerId: string;
  blackPlayerId: string;
  timeControl?: {
    initial: number;
    increment: number;
  };
}

export class GameService {
  /**
   * Creates a new game and saves it to Redis
   */
  static async createGame(options: GameCreationOptions): Promise<void> {
    const game = new BanChess();

    await saveGameState(options.gameId, {
      fen: game.fen(),
      pgn: game.pgn(),
      whitePlayerId: options.whitePlayerId,
      blackPlayerId: options.blackPlayerId,
      timeControl: options.timeControl,
      startTime: Date.now(),
      moveCount: 0,
    });
  }

  /**
   * Validates and applies an action to a game
   */
  static async applyAction(
    gameId: string,
    action: Action,
  ): Promise<GameValidationResult> {
    const gameState = await getGameState(gameId);

    if (!gameState) {
      return { success: false, error: "Game not found" };
    }

    // Create game instance from current state
    const game = new BanChess(gameState.fen);

    // Let BanChess handle all validation
    const result = game.play(action as Parameters<typeof game.play>[0]);

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Invalid action",
      };
    }

    // Calculate time taken for this action
    const now = Date.now();
    const timeTaken = now - (gameState.lastMoveTime || gameState.startTime);
    
    // Serialize and store the action
    const serializedAction = BanChess.serializeAction(
      action as Parameters<typeof BanChess.serializeAction>[0],
    );
    await addActionToHistory(gameId, serializedAction);
    
    // Track the time for this action (in milliseconds)
    await addMoveTime(gameId, timeTaken);

    // Check for game over conditions
    const gameOver = this.checkGameOver(game);

    // Update game state in Redis
    gameState.fen = game.fen();
    gameState.pgn = game.pgn();
    gameState.lastMoveTime = now;
    gameState.moveCount = (gameState.moveCount || 0) + 1;

    if (gameOver.isOver) {
      gameState.gameOver = true;
      gameState.result = gameOver.result;
      
      // Save the final state to Redis first
      await saveGameState(gameId, gameState);
      
      // Handle game ending - save to database and clean up Redis
      await this.handleGameEnd(gameId, gameOver.result || "Game over", gameState);
    } else {
      // Only save to Redis if game is not over
      await saveGameState(gameId, gameState);
    }

    return {
      success: true,
      updatedFen: game.fen(),
      gameOver: gameOver.isOver,
      result: gameOver.result,
    };
  }

  /**
   * Reconstructs game history from stored actions
   */
  static async getGameHistory(gameId: string): Promise<HistoryEntry[]> {
    const actionHistory = await getActionHistory(gameId);

    if (actionHistory.length === 0) {
      return [];
    }

    // Replay all actions to get full history with notation
    const game = BanChess.replayFromActions(actionHistory);

    return game.history().map((entry) => ({
      ...entry,
      turnNumber: Math.floor(entry.ply / 4) + 1,  // Calculate turn number from ply
      bannedMove: entry.bannedMove === null ? undefined : entry.bannedMove,
    }));
  }

  /**
   * Gets the current game state with legal actions
   */
  static async getGameStateWithLegalActions(gameId: string) {
    const gameState = await getGameState(gameId);

    if (!gameState) {
      return null;
    }

    const game = new BanChess(gameState.fen);
    const fen = game.fen();
    const fenParts = fen.split(" ");
    const banState = fenParts[6];
    // Check if next action is ban by checking if ply is odd
    const ply = banState ? parseInt(banState.split(":")[0]) : 0;
    const isNextActionBan = ply % 2 === 1;

    // Get legal actions
    const legalActions = isNextActionBan ? game.legalBans() : game.legalMoves();
    const simpleLegalActions = this.simplifyLegalActions(legalActions);

    return {
      ...gameState,
      legalActions: simpleLegalActions,
      nextAction: isNextActionBan ? "ban" : "move",
      inCheck: game.inCheck(),
      gameOver: game.gameOver(),
    };
  }

  /**
   * Handle game ending - save to database and clean up Redis
   */
  private static async handleGameEnd(
    gameId: string,
    result: string,
    gameState: NonNullable<GameStateData>
  ): Promise<void> {
    // Save to database (temporarily allow local games for testing)
    // TODO: Uncomment this check to skip local games where same player plays both sides
    // if (gameState.whitePlayerId && 
    //     gameState.blackPlayerId && 
    //     gameState.whitePlayerId !== gameState.blackPlayerId) {
    if (gameState.whitePlayerId && gameState.blackPlayerId) {
      try {
        await saveCompletedGame(gameId);
        console.log(`[GameService] Game ${gameId} saved to database with result: ${result}`);
      } catch (error) {
        console.error(`[GameService] Failed to save game ${gameId} to database:`, error);
      }
      
      // Clean up Redis immediately after successful database save
      try {
        const pipeline = redis.pipeline();
        pipeline.del(KEYS.GAME_STATE(gameId));
        pipeline.del(KEYS.GAME_ACTIONS(gameId));
        pipeline.del(KEYS.GAME_MOVE_TIMES(gameId));
        
        // Remove player-game associations
        if (gameState.whitePlayerId) {
          const whiteGameId = await redis.get(KEYS.PLAYER_GAME(gameState.whitePlayerId));
          if (whiteGameId === gameId) {
            pipeline.del(KEYS.PLAYER_GAME(gameState.whitePlayerId));
          }
        }
        if (gameState.blackPlayerId) {
          const blackGameId = await redis.get(KEYS.PLAYER_GAME(gameState.blackPlayerId));
          if (blackGameId === gameId) {
            pipeline.del(KEYS.PLAYER_GAME(gameState.blackPlayerId));
          }
        }
        
        await pipeline.exec();
        console.log(`[GameService] Cleaned up Redis data for game ${gameId}`);
      } catch (error) {
        console.error(`[GameService] Failed to clean up Redis for game ${gameId}:`, error);
      }
    } else {
      // For local/solo games, clean up Redis after 1 minute
      console.log(`[GameService] Local game ${gameId} ended, will clean up in 1 minute`);
      setTimeout(async () => {
        try {
          const pipeline = redis.pipeline();
          pipeline.del(KEYS.GAME_STATE(gameId));
          pipeline.del(KEYS.GAME_ACTIONS(gameId));
          pipeline.del(KEYS.GAME_MOVE_TIMES(gameId));
          await pipeline.exec();
          console.log(`[GameService] Cleaned up local game ${gameId} from Redis`);
        } catch (error) {
          console.error(`[GameService] Failed to clean up local game ${gameId}:`, error);
        }
      }, 60 * 1000); // 1 minute for local games
    }
  }

  /**
   * Checks if the game is over and determines the result
   */
  private static checkGameOver(game: BanChess): {
    isOver: boolean;
    result?: string;
  } {
    // Check for immediate checkmate even during ban phase
    if (this.checkForImmediateCheckmate(game)) {
      const loser = game.turn;
      return {
        isOver: true,
        result: `${loser === "white" ? "Black" : "White"} wins by checkmate!`,
      };
    }

    if (game.inStalemate()) {
      return {
        isOver: true,
        result: "Draw by stalemate",
      };
    }

    if (game.gameOver()) {
      return {
        isOver: true,
        result: "Game over",
      };
    }

    return { isOver: false };
  }

  /**
   * Helper to check for checkmate even when next action would be a ban
   */
  private static checkForImmediateCheckmate(game: BanChess): boolean {
    const fen = game.fen();
    const fenParts = fen.split(" ");
    const banState = fenParts[6];
    // Check if next action is ban by checking if ply is odd
    const ply = banState ? parseInt(banState.split(":")[0]) : 0;
    const isNextActionBan = ply % 2 === 1;

    if (isNextActionBan && game.inCheck()) {
      // During ban phase with check, verify if escape is possible
      return game.inCheckmate() || game.gameOver();
    }

    return game.inCheckmate() || game.gameOver();
  }

  /**
   * Simplifies legal actions to string format
   */
  private static simplifyLegalActions(
    legalActions: (string | { from: string; to: string })[],
  ): string[] {
    return legalActions
      .map((action) => {
        if (typeof action === "string") {
          return action;
        } else if (
          action &&
          typeof action === "object" &&
          "from" in action &&
          "to" in action
        ) {
          return action.from + action.to;
        }
        return null;
      })
      .filter((action): action is string => action !== null);
  }

  /**
   * Validates if a user can perform actions in a game
   */
  static async validateUserAccess(
    gameId: string,
    userId: string,
  ): Promise<{ canPlay: boolean; role?: "white" | "black" }> {
    const gameState = await getGameState(gameId);

    if (!gameState) {
      return { canPlay: false };
    }

    if (gameState.whitePlayerId === userId) {
      return { canPlay: true, role: "white" };
    }

    if (gameState.blackPlayerId === userId) {
      return { canPlay: true, role: "black" };
    }

    return { canPlay: false };
  }
}
