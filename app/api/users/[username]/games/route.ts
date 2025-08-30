import { NextResponse } from "next/server";
import { db, games, users } from "@/server/db";
import { and, desc, eq, or } from "drizzle-orm";

interface GameRecord {
  id: string;
  opponent: string;
  result: "win" | "loss" | "draw";
  playerColor: "white" | "black";
  duration: string;
  date: string;
  totalMoves: number;
}

interface GameData {
  id: string;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
  result: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  totalMoves: number;
  whiteUsername?: string;
  blackUsername?: string;
  whitePlayer?: {
    id: string;
    username: string;
  } | null;
  blackPlayer?: {
    id: string;
    username: string;
  } | null;
  players?: unknown[];
}

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Don't provide games for guest accounts
    if (username.toLowerCase().startsWith("guest")) {
      return NextResponse.json({
        error: "Guest accounts do not have game history",
      }, { status: 404 });
    }

    // Fetch user from database
    const user = await db.select().from(users).where(
      eq(users.username, username),
    ).limit(1);

    if (!user || user.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = user[0];

    // Fetch recent games with opponent information
    const recentGamesQuery = await db.select({
      id: games.id,
      whitePlayerId: games.whitePlayerId,
      blackPlayerId: games.blackPlayerId,
      result: games.result,
      startedAt: games.startedAt,
      completedAt: games.completedAt,
      totalMoves: games.totalMoves,
      whitePlayer: {
        id: users.id,
        username: users.username,
      },
      blackPlayer: {
        id: users.id,
        username: users.username,
      },
    })
      .from(games)
      .leftJoin(
        users,
        or(
          eq(games.whitePlayerId, users.id),
          eq(games.blackPlayerId, users.id),
        ),
      )
      .where(
        and(
          or(
            eq(games.whitePlayerId, userData.id),
            eq(games.blackPlayerId, userData.id),
          ),
          eq(games.isSoloGame, false),
        ),
      )
      .orderBy(desc(games.completedAt))
      .limit(limit)
      .offset(offset);

    // Transform games to match the expected format
    const transformedGames: GameRecord[] = [];

    // Group games by ID to handle the join results
    const gameMap = new Map<string, GameData>();
    for (const row of recentGamesQuery) {
      if (!gameMap.has(row.id)) {
        gameMap.set(row.id, {
          ...row,
          players: [],
        });
      }
      if (row.whitePlayer && row.whitePlayer.id) {
        const game = gameMap.get(row.id);
        if (row.whitePlayer.id === row.whitePlayerId) {
          game.whiteUsername = row.whitePlayer.username;
        }
        if (row.blackPlayer && row.blackPlayer.id === row.blackPlayerId) {
          game.blackUsername = row.blackPlayer.username;
        }
      }
    }

    // Process each unique game
    for (const [_, game] of gameMap) {
      if (!game) continue; // Skip if game is undefined

      const isWhite = game.whitePlayerId === userData.id;
      const opponentUsername = isWhite
        ? game.blackUsername
        : game.whiteUsername;

      // Determine game result from user's perspective
      let result: "win" | "loss" | "draw";
      if (game.result === "1/2-1/2") {
        result = "draw";
      } else if (game.result === "1-0") {
        result = isWhite ? "win" : "loss";
      } else if (game.result === "0-1") {
        result = isWhite ? "loss" : "win";
      } else {
        continue; // Skip unfinished games
      }

      // Calculate game duration
      let duration = "0:00";
      if (game.startedAt && game.completedAt) {
        const start = new Date(game.startedAt).getTime();
        const end = new Date(game.completedAt).getTime();
        const durationMs = end - start;
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        duration = `${minutes}:${seconds.toString().padStart(2, "0")}`;
      }

      // Format date
      let date = "Unknown";
      if (game.completedAt) {
        const gameDate = new Date(game.completedAt);
        const now = new Date();
        const diffMs = now.getTime() - gameDate.getTime();
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffHours < 1) {
          date = "Just now";
        } else if (diffHours < 24) {
          date = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
        } else if (diffDays < 7) {
          date = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
        } else {
          date = gameDate.toLocaleDateString();
        }
      }

      transformedGames.push({
        id: game.id,
        opponent: opponentUsername || "Unknown",
        result,
        playerColor: isWhite ? "white" : "black",
        duration,
        date,
        totalMoves: game.totalMoves || 0,
      });
    }

    return NextResponse.json({
      games: transformedGames,
      total: transformedGames.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching user games:", error);
    return NextResponse.json({ error: "Internal server error" }, {
      status: 500,
    });
  }
}
