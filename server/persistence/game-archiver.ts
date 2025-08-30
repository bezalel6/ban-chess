import { redis, getGameState, getActionHistory, getGameEvents } from '../redis';
import { bufferedPersistence } from './buffered-persistence';
import { BanChess } from 'ban-chess.ts';
import { toSquare, toBanChessSquare } from '@/lib/utils/ban-chess-bridge';

/**
 * Game Archiver Service
 * Archives completed games from Redis to PostgreSQL
 * Maintains Redis for hot data, PostgreSQL for permanent storage
 */
export class GameArchiver {
  private archivalQueue: Set<string> = new Set();
  private isProcessing = false;

  /**
   * Archive a game from Redis to PostgreSQL
   * Called when a game completes
   */
  async archiveGame(gameId: string): Promise<void> {
    try {
      console.log(`[GameArchiver] Starting archive for game ${gameId}`);

      // Get game state from Redis
      const gameState = await getGameState(gameId);
      if (!gameState) {
        console.error(`[GameArchiver] Game ${gameId} not found in Redis`);
        return;
      }

      // SKIP SOLO GAMES - they remain local/ephemeral
      if (gameState.isSoloGame) {
        console.log(
          `[GameArchiver] Skipping solo game ${gameId} - not persisting to database`
        );
        return;
      }

      // Get action history (BCN format)
      const actionHistory = await getActionHistory(gameId);

      // Reconstruct the game to get PGN and move details
      const game = new BanChess();
      const moves: Array<{
        moveNumber: number;
        color: 'white' | 'black';
        notation: string;
        uci: string;
        fenAfter: string;
        isBan: boolean;
      }> = [];

      const bannedMoves: string[] = [];
      let moveCount = 0;
      let banCount = 0;

      // Process each action from history
      for (const action of actionHistory) {
        const [type, uci] = action.split(':');

        if (type === 'b') {
          // Ban action
          const from = toBanChessSquare(toSquare(uci.slice(0, 2)));
          const to = toBanChessSquare(toSquare(uci.slice(2, 4)));
          const banResult = game.play({ ban: { from, to } });
          if (banResult.success) {
            bannedMoves.push(uci);
            banCount++;
          }
        } else if (type === 'm') {
          // Move action
          const from = toBanChessSquare(toSquare(uci.slice(0, 2)));
          const to = toBanChessSquare(toSquare(uci.slice(2, 4)));
          const promotion = uci[4] as 'q' | 'r' | 'b' | 'n' | undefined;
          const moveResult = game.play({ move: { from, to, promotion } });
          if (moveResult.success) {
            moveCount++;
            const moveNumber = Math.ceil(moveCount / 2);
            const color = moveCount % 2 === 1 ? 'white' : 'black';

            // Buffer the move for batch insert
            await bufferedPersistence.bufferMove({
              gameId,
              moveNumber,
              color,
              notation: moveResult.san || uci,
              uci: from + to + (promotion || ''),
              fenAfter: game.fen(),
              isBan: false,
              createdAt: new Date(),
            });

            moves.push({
              moveNumber,
              color,
              notation: moveResult.san || uci,
              uci: uci,
              fenAfter: game.fen(),
              isBan: false,
            });
          }
        }
      }

      // Get game events from Redis
      const events = await getGameEvents(gameId);
      for (const event of events) {
        await bufferedPersistence.bufferEvent({
          gameId,
          eventType: event.type,
          eventData: event as unknown as Record<string, unknown>,
          timestamp: new Date(event.timestamp || Date.now()),
        });
      }

      // Complete the game record in PostgreSQL
      await bufferedPersistence.completeGame({
        id: gameId,
        pgn: game.pgn(),
        fenFinal: game.fen(),
        result: gameState.result || '*',
        totalMoves: moveCount,
        totalBans: banCount,
        banMoves: bannedMoves,
      });

      console.log(`[GameArchiver] Successfully archived game ${gameId}`);
      console.log(`[GameArchiver] Stats: ${moveCount} moves, ${banCount} bans`);
    } catch (error) {
      console.error(`[GameArchiver] Error archiving game ${gameId}:`, error);
      throw error;
    }
  }

  /**
   * Queue a game for archival (batch processing)
   */
  queueForArchival(gameId: string): void {
    this.archivalQueue.add(gameId);

    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processArchivalQueue();
    }
  }

  /**
   * Process queued games for archival
   */
  private async processArchivalQueue(): Promise<void> {
    if (this.archivalQueue.size === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;

    // Process games in batches
    const batch = Array.from(this.archivalQueue).slice(0, 5);

    for (const gameId of batch) {
      try {
        await this.archiveGame(gameId);
        this.archivalQueue.delete(gameId);
      } catch {
        console.error(
          `[GameArchiver] Failed to archive game ${gameId}, will retry later`
        );
        // Keep in queue for retry
      }
    }

    // Continue processing if more games in queue
    if (this.archivalQueue.size > 0) {
      setTimeout(() => this.processArchivalQueue(), 1000);
    } else {
      this.isProcessing = false;
    }
  }

  /**
   * Archive all completed games from Redis
   * Useful for migration or periodic cleanup
   */
  async archiveAllCompletedGames(): Promise<void> {
    try {
      const activeGames = await redis.smembers('games:active');
      const allGameKeys = await redis.keys('game:*');

      for (const key of allGameKeys) {
        const gameId = key.replace('game:', '').split(':')[0];

        // Skip if it's an active game
        if (activeGames.includes(gameId)) {
          continue;
        }

        // Check if game is completed
        const gameState = await getGameState(gameId);
        if (gameState && gameState.gameOver) {
          console.log(
            `[GameArchiver] Queuing completed game ${gameId} for archival`
          );
          this.queueForArchival(gameId);
        }
      }
    } catch (error) {
      console.error('[GameArchiver] Error during bulk archival:', error);
    }
  }

  /**
   * Get game from PostgreSQL if not in Redis
   * This allows retrieving historical games
   */
  async getArchivedGame(gameId: string) {
    // First check Redis (hot cache)
    const redisGame = await getGameState(gameId);
    if (redisGame) {
      return redisGame;
    }

    // Fall back to PostgreSQL
    // This would be implemented using the db query
    // For now, return null as we need to implement the query
    return null;
  }
}

// Export singleton instance
export const gameArchiver = new GameArchiver();
