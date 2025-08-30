import { NextResponse } from "next/server";
import { db, games, users } from "@/server/db";
import { and, desc, eq, or } from "drizzle-orm";
import type { Result } from "@/lib/utils";
import type { PaginatedResponse } from "@/lib/utils/api-types";
import { createApiResponse, createErrorResponse } from "@/lib/utils/api-types";

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

type UserGamesResponse = PaginatedResponse<GameRecord>;

/**
 * Fetches paginated game history for a user
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const fetchUserGames = async (): Promise<Result<UserGamesResponse, Error>> => {
    const { username } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Don't provide games for guest accounts
    if (username.toLowerCase().startsWith("guest")) {
      return {
        ok: false,
        error: new Error("Guest accounts do not have game history"),
      };
    }

    // Fetch user from database
    const userResult = await db.select().from(users).where(
      eq(users.username, username),
    ).limit(1);

    if (!userResult || userResult.length === 0) {
      return {
        ok: false,
        error: new Error("User not found"),
      };
    }

    const userData = userResult[0];

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
      
      // Safely access nested properties
      const game = gameMap.get(row.id);
      if (!game) continue;
      
      if (row.whitePlayer?.id === row.whitePlayerId) {
        game.whiteUsername = row.whitePlayer.username;
      }
      if (row.blackPlayer?.id === row.blackPlayerId) {
        game.blackUsername = row.blackPlayer.username;
      }
    }

    // Process each unique game
    for (const [_, game] of gameMap) {
      if (!game) continue;

      const isWhite = game.whitePlayerId === userData.id;
      const opponentUsername = isWhite
        ? game.blackUsername
        : game.whiteUsername;

      // Determine game result from user's perspective
      let result: "win" | "loss" | "draw" | undefined;
      if (game.result === "1/2-1/2") {
        result = "draw";
      } else if (game.result === "1-0") {
        result = isWhite ? "win" : "loss";
      } else if (game.result === "0-1") {
        result = isWhite ? "loss" : "win";
      }
      
      // Skip unfinished games
      if (!result) continue;

      // Calculate game duration
      const duration = calculateDuration(game.startedAt, game.completedAt);
      const date = formatGameDate(game.completedAt);

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

    return {
      ok: true,
      value: {
        data: transformedGames,
        total: transformedGames.length,
        limit,
        offset,
        hasMore: transformedGames.length === limit,
      },
    };
  };

  // Execute with Result pattern
  const result = await fetchUserGames();
  
  if (result.ok) {
    return NextResponse.json(createApiResponse(result.value));
  }
  
  // Handle errors with proper status codes
  const errorMessage = result.error.message;
  if (errorMessage.includes("not found") || errorMessage.includes("Guest")) {
    return NextResponse.json(
      createErrorResponse(errorMessage),
      { status: 404 }
    );
  }
  
  console.error("Error fetching user games:", result.error);
  return NextResponse.json(
    createErrorResponse("Internal server error"),
    { status: 500 }
  );
}

/**
 * Calculates game duration in MM:SS format
 */
function calculateDuration(
  startedAt: Date | null,
  completedAt: Date | null,
): string {
  if (!startedAt || !completedAt) return "0:00";
  
  const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Formats game date relative to now
 */
function formatGameDate(completedAt: Date | null): string {
  if (!completedAt) return "Unknown";
  
  const gameDate = new Date(completedAt);
  const now = new Date();
  const diffMs = now.getTime() - gameDate.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  
  return gameDate.toLocaleDateString();
}
