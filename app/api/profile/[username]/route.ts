import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/services/game-persistence";

const GAMES_PER_PAGE = 10;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    
    if (page < 1) {
      return NextResponse.json(
        { error: "Invalid page number" },
        { status: 400 }
      );
    }

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Fetch games with pagination
    const skip = (page - 1) * GAMES_PER_PAGE;
    
    const [games, totalGames] = await Promise.all([
      prisma.game.findMany({
        where: {
          OR: [
            { whitePlayerId: user.id },
            { blackPlayerId: user.id },
          ],
        },
        include: {
          whitePlayer: {
            select: { username: true },
          },
          blackPlayer: {
            select: { username: true },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: GAMES_PER_PAGE,
      }),
      prisma.game.count({
        where: {
          OR: [
            { whitePlayerId: user.id },
            { blackPlayerId: user.id },
          ],
        },
      }),
    ]);

    // Calculate wins, losses, draws
    const gamesAsWhite = await prisma.game.findMany({
      where: { whitePlayerId: user.id },
      select: { result: true },
    });

    const gamesAsBlack = await prisma.game.findMany({
      where: { blackPlayerId: user.id },
      select: { result: true },
    });

    let wins = 0;
    let losses = 0;
    let draws = 0;

    // Count wins/losses/draws as white
    for (const game of gamesAsWhite) {
      if (game.result === "1-0") wins++;
      else if (game.result === "0-1") losses++;
      else if (game.result === "1/2-1/2") draws++;
    }

    // Count wins/losses/draws as black
    for (const game of gamesAsBlack) {
      if (game.result === "0-1") wins++;
      else if (game.result === "1-0") losses++;
      else if (game.result === "1/2-1/2") draws++;
    }

    const hasMore = totalGames > skip + GAMES_PER_PAGE;

    return NextResponse.json({
      user: {
        ...user,
        stats: {
          totalGames: totalGames,
          wins,
          losses,
          draws,
        },
      },
      games: games.map(game => ({
        id: game.id,
        whitePlayer: game.whitePlayer,
        blackPlayer: game.blackPlayer,
        result: game.result,
        resultReason: game.resultReason,
        timeControl: game.timeControl,
        moveCount: game.moveCount,
        finalPosition: game.finalPosition,
        createdAt: game.createdAt.toISOString(),
      })),
      hasMore,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}