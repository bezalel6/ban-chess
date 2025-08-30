import { NextResponse } from 'next/server';
import { db, users, games } from '@/server/db';
import { eq, or, desc } from 'drizzle-orm';

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;

    // Don't provide stats for guest accounts
    if (username.toLowerCase().startsWith('guest')) {
      return NextResponse.json(
        { error: 'Guest accounts do not have statistics' },
        { status: 404 }
      );
    }

    // Fetch user from database
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user || user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = user[0];

    // Calculate win rate
    const totalGames = userData.gamesPlayed || 0;
    const winRate =
      totalGames > 0 ? Math.round((userData.gamesWon / totalGames) * 100) : 0;

    // Get current streak (this would need a more complex query in production)
    // For now, we'll check the last few games
    const recentGamesQuery = await db
      .select({
        result: games.result,
        whitePlayerId: games.whitePlayerId,
        blackPlayerId: games.blackPlayerId,
      })
      .from(games)
      .where(
        or(
          eq(games.whitePlayerId, userData.id),
          eq(games.blackPlayerId, userData.id)
        )
      )
      .orderBy(desc(games.completedAt))
      .limit(10);

    // Calculate current streak
    let currentStreak = 0;
    for (const game of recentGamesQuery) {
      if (!game.result || game.result === '*') break;

      const isWhite = game.whitePlayerId === userData.id;
      const won =
        (isWhite && game.result === '1-0') ||
        (!isWhite && game.result === '0-1');

      if (won) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Return user statistics
    const stats = {
      rating: userData.rating,
      gamesPlayed: userData.gamesPlayed,
      wins: userData.gamesWon,
      losses: userData.gamesLost,
      draws: userData.gamesDrawn,
      winRate,
      currentStreak,
      lastSeenAt: userData.lastSeenAt,
      createdAt: userData.createdAt,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
