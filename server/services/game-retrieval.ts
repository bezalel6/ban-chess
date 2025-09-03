/**
 * Unified Game Retrieval Service
 * 
 * Provides seamless access to games whether they're active (in Redis) 
 * or completed (in database). BCN is the source of truth for game state.
 */

import { prisma } from './game-persistence';
import { getGameState, getActionHistory, getMoveTimes, KEYS, redis } from '../redis';
import { BanChess } from 'ban-chess.ts';

export interface GameSource {
  type: 'active' | 'completed';
  gameId: string;
  bcn: string[];  // The source of truth
  moveTimes: number[];  // in milliseconds
  whitePlayerId: string;
  blackPlayerId: string;
  whiteUsername: string;  // Always available from database or Redis session
  blackUsername: string;  // Always available from database or Redis session
  result?: string;
  timeControl?: string;  // e.g., "300+3"
  createdAt?: Date;
}

/**
 * Retrieve a game from either Redis (active) or database (completed)
 * BCN is the authoritative source for game state
 * For completed games, database takes priority over Redis
 */
export async function getGameSource(gameId: string): Promise<GameSource | null> {
  // First, check database for completed games (priority for game-over states)
  try {
    const dbGame = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        whitePlayer: {
          select: {
            username: true
          }
        },
        blackPlayer: {
          select: {
            username: true
          }
        }
      }
    });
    
    if (dbGame) {
      // Game found in database - this is the authoritative source for completed games
      return {
        type: 'completed',
        gameId: dbGame.id,
        bcn: dbGame.bcn,
        moveTimes: dbGame.moveTimes,  // Already in milliseconds
        whitePlayerId: dbGame.whitePlayerId,
        blackPlayerId: dbGame.blackPlayerId,
        whiteUsername: dbGame.whitePlayer.username,
        blackUsername: dbGame.blackPlayer.username,
        result: dbGame.result,
        timeControl: dbGame.timeControl,
        createdAt: dbGame.createdAt,
      };
    }
  } catch (error) {
    console.error(`[GameRetrieval] Error fetching game ${gameId} from database:`, error);
    // Continue to check Redis if database check fails
  }
  
  // If not in database (or database check failed), check Redis for active games
  const redisGameState = await getGameState(gameId);
  
  if (redisGameState) {
    // Game is active in Redis - get BCN from Redis
    const bcn = await getActionHistory(gameId);
    const moveTimes = await getMoveTimes(gameId);
    
    const timeControl = redisGameState.timeControl 
      ? `${redisGameState.timeControl.initial}+${redisGameState.timeControl.increment}`
      : undefined;
    
    // For active games, try to get usernames from Redis sessions or fallback to IDs
    // In practice, usernames should always be available from sessions for active games
    let whiteUsername = redisGameState.whitePlayerId!;
    let blackUsername = redisGameState.blackPlayerId!;
    
    // Fetch usernames from Redis player sessions
    if (redisGameState.whitePlayerId) {
      const whiteSession = await redis.get(KEYS.PLAYER_SESSION(redisGameState.whitePlayerId));
      if (whiteSession) {
        const session = JSON.parse(whiteSession);
        whiteUsername = session.username;
      }
    }
    
    if (redisGameState.blackPlayerId) {
      const blackSession = await redis.get(KEYS.PLAYER_SESSION(redisGameState.blackPlayerId));
      if (blackSession) {
        const session = JSON.parse(blackSession);
        blackUsername = session.username;
      }
    }
    
    return {
      type: 'active',
      gameId,
      bcn,
      moveTimes,
      whitePlayerId: redisGameState.whitePlayerId!,
      blackPlayerId: redisGameState.blackPlayerId!,
      whiteUsername,
      blackUsername,
      result: redisGameState.result,
      timeControl,
    };
  }
  
  // Game not found in either database or Redis
  return null;
}

/**
 * Reconstruct full game state from BCN
 * This is the canonical way to get game state
 */
export function reconstructGameFromBCN(bcn: string[]) {
  if (bcn.length === 0) {
    return new BanChess();
  }
  
  return BanChess.replayFromActions(bcn);
}

/**
 * Get a full game state (reconstructed from BCN)
 */
export async function getFullGameState(gameId: string) {
  const source = await getGameSource(gameId);
  if (!source) {
    return null;
  }
  
  // BCN is the source of truth - reconstruct game from it
  const game = reconstructGameFromBCN(source.bcn);
  
  return {
    gameId: source.gameId,
    source: source.type,
    game,  // The BanChess instance
    fen: game.fen(),
    pgn: game.pgn(),
    history: game.history(),
    gameOver: game.gameOver(),
    inCheck: game.inCheck(),
    inCheckmate: game.inCheckmate(),
    inStalemate: game.inStalemate(),
    turn: game.turn,
    moveTimes: source.moveTimes,
    whitePlayerId: source.whitePlayerId,
    blackPlayerId: source.blackPlayerId,
    result: source.result,
    timeControl: source.timeControl,
    createdAt: source.createdAt,
  };
}

/**
 * Get recent games for a player
 */
export async function getPlayerGames(
  playerId: string, 
  limit: number = 10
) {
  try {
    const dbGames = await prisma.game.findMany({
      where: {
        OR: [
          { whitePlayerId: playerId },
          { blackPlayerId: playerId },
        ]
      },
      include: {
        whitePlayer: {
          select: {
            username: true
          }
        },
        blackPlayer: {
          select: {
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
    });
    
    return dbGames.map(dbGame => ({
      gameId: dbGame.id,
      bcn: dbGame.bcn,
      moveTimes: dbGame.moveTimes,
      whitePlayerId: dbGame.whitePlayerId,
      blackPlayerId: dbGame.blackPlayerId,
      whiteUsername: dbGame.whitePlayer.username,
      blackUsername: dbGame.blackPlayer.username,
      result: dbGame.result,
      timeControl: dbGame.timeControl,
      createdAt: dbGame.createdAt,
      // Reconstruct key info from BCN for display
      moveCount: dbGame.bcn.length,
    }));
  } catch (error) {
    console.error(`[GameRetrieval] Error fetching player games:`, error);
    return [];
  }
}