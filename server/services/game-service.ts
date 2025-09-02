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
} from "../redis";

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

    // Serialize and store the action
    const serializedAction = BanChess.serializeAction(
      action as Parameters<typeof BanChess.serializeAction>[0],
    );
    await addActionToHistory(gameId, serializedAction);

    // Check for game over conditions
    const gameOver = this.checkGameOver(game);

    // Update game state in Redis
    gameState.fen = game.fen();
    gameState.pgn = game.pgn();
    gameState.lastMoveTime = Date.now();
    gameState.moveCount = (gameState.moveCount || 0) + 1;

    if (gameOver.isOver) {
      gameState.gameOver = true;
      gameState.result = gameOver.result;
    }

    await saveGameState(gameId, gameState);

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
    const isNextActionBan = banState && banState.includes(":ban");

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
    const isNextActionBan = banState && banState.includes(":ban");

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
