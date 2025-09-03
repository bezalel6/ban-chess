import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/services/game-persistence";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;
    
    // Fetch game from database
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        whitePlayer: {
          select: { username: true },
        },
        blackPlayer: {
          select: { username: true },
        },
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: game.id,
      whitePlayer: game.whitePlayer,
      blackPlayer: game.blackPlayer,
      bcn: game.bcn,
      moveTimes: game.moveTimes,
      result: game.result,
      resultReason: game.resultReason,
      timeControl: game.timeControl,
      moveCount: game.moveCount,
      finalPosition: game.finalPosition,
      createdAt: game.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching game:", error);
    return NextResponse.json(
      { error: "Failed to fetch game" },
      { status: 500 }
    );
  }
}