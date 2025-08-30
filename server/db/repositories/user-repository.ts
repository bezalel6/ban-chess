/**
 * User repository with chess-specific operations
 */

import { BaseRepository } from './base-repository';
import { users } from '@/server/db/schema';
import { db } from '@/server/db';
import type { DbResult } from '@/lib/utils/database-types';
import { eq, and, gte, sql } from 'drizzle-orm';

export interface UserModel {
  id: string;
  username: string;
  email: string | null;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
  role: string;
  isActive: boolean;
  bannedUntil: Date | null;
  banReason: string | null;
  createdAt: Date;
  lastSeenAt: Date;
}

export interface CreateUserData {
  username: string;
  email?: string;
  rating?: number;
  role?: string;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  rating?: number;
  gamesPlayed?: number;
  gamesWon?: number;
  gamesLost?: number;
  gamesDrawn?: number;
  role?: string;
  isActive?: boolean;
  bannedUntil?: Date | null;
  banReason?: string | null;
  lastSeenAt?: Date;
}

/**
 * Repository for user operations
 */
export class UserRepository extends BaseRepository<UserModel, CreateUserData, UpdateUserData> {
  constructor() {
    super(users, 'User');
  }

  /**
   * Find a user by username
   */
  async findByUsername(username: string): Promise<DbResult<UserModel | null>> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      
      return {
        ok: true,
        value: result[0] as UserModel | null
      };
    } catch (error) {
      return {
        ok: false,
        error: this.createDbError('findByUsername', error)
      };
    }
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<DbResult<UserModel | null>> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      return {
        ok: true,
        value: result[0] as UserModel | null
      };
    } catch (error) {
      return {
        ok: false,
        error: this.createDbError('findByEmail', error)
      };
    }
  }

  /**
   * Get top rated players
   */
  async getLeaderboard(limit = 10): Promise<DbResult<UserModel[]>> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(and(
          eq(users.isActive, true),
          gte(users.gamesPlayed, 5) // Min 5 games for leaderboard
        ))
        .orderBy(sql`${users.rating} DESC`)
        .limit(limit);
      
      return {
        ok: true,
        value: result as UserModel[]
      };
    } catch (error) {
      return {
        ok: false,
        error: this.createDbError('getLeaderboard', error)
      };
    }
  }

  /**
   * Update user statistics after a game
   */
  async updateGameStats(
    userId: string,
    result: 'win' | 'loss' | 'draw',
    ratingChange: number
  ): Promise<DbResult<UserModel>> {
    try {
      // Get current user stats
      const userResult = await this.findById(userId);
      if (!userResult.ok) return userResult;
      if (!userResult.value) {
        return {
          ok: false,
          error: new Error(`User ${userId} not found`)
        };
      }
      
      const user = userResult.value;
      const updates: UpdateUserData = {
        gamesPlayed: user.gamesPlayed + 1,
        rating: Math.max(0, user.rating + ratingChange), // Rating can't go below 0
        lastSeenAt: new Date()
      };
      
      // Update win/loss/draw count
      if (result === 'win') {
        updates.gamesWon = user.gamesWon + 1;
      } else if (result === 'loss') {
        updates.gamesLost = user.gamesLost + 1;
      } else {
        updates.gamesDrawn = user.gamesDrawn + 1;
      }
      
      return this.update(userId, updates);
    } catch (error) {
      return {
        ok: false,
        error: this.createDbError('updateGameStats', error)
      };
    }
  }

  /**
   * Check if a user is banned
   */
  async isBanned(userId: string): Promise<DbResult<boolean>> {
    const userResult = await this.findById(userId);
    if (!userResult.ok) return userResult;
    if (!userResult.value) {
      return { ok: true, value: false };
    }
    
    const user = userResult.value;
    if (!user.isActive) {
      return { ok: true, value: true };
    }
    
    if (user.bannedUntil && user.bannedUntil > new Date()) {
      return { ok: true, value: true };
    }
    
    return { ok: true, value: false };
  }

  /**
   * Ban a user
   */
  async banUser(
    userId: string,
    reason: string,
    until?: Date
  ): Promise<DbResult<UserModel>> {
    return this.update(userId, {
      isActive: !until, // Permanent ban if no end date
      bannedUntil: until,
      banReason: reason
    });
  }

  /**
   * Unban a user
   */
  async unbanUser(userId: string): Promise<DbResult<UserModel>> {
    return this.update(userId, {
      isActive: true,
      bannedUntil: null,
      banReason: null
    });
  }
}

// Export singleton instance
export const userRepository = new UserRepository();