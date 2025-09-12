import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/services/game-persistence";
import { v4 as uuidv4 } from "uuid";
import { cookies } from "next/headers";
import { generateGuestId } from "@/lib/username";

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const session = await getServerSession(authOptions);
    
    // If no session, check for guest token
    let userId = session?.user?.id;
    
    if (!userId) {
      const cookieStore = await cookies();
      const guestToken = cookieStore.get('guest-token')?.value;
      
      if (guestToken) {
        // For guest users, look them up by username
        const existingUser = await prisma.user.findUnique({
          where: { username: guestToken },
        });
        
        if (existingUser) {
          userId = existingUser.id;
        } else {
          // Create guest user if doesn't exist
          const newUser = await prisma.user.create({
            data: {
              username: guestToken,
              email: `${guestToken}@guest.local`,
              isGuest: true,
            },
          });
          userId = newUser.id;
        }
      } else {
        // Create a new guest user
        userId = generateGuestId();
        
        await prisma.user.create({
          data: {
            id: userId,
            username: userId,
            email: `${userId}@guest.local`,
          },
        });
      }
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type } = body; // 'solo' or 'online'

    if (type === 'solo') {
      // Create a solo game immediately
      const gameId = uuidv4();
      
      // Create the game in the database
      const game = await prisma.game.create({
        data: {
          id: gameId,
          whitePlayerId: userId,
          blackPlayerId: userId, // Same player for solo
          bcn: [],
          moveTimes: [],
          timeControl: "",
          moveCount: 0,
          result: "*", // Game in progress
          finalPosition: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        },
      });

      // Return the game ID immediately
      return NextResponse.json({
        gameId: game.id,
        type: 'solo',
        redirect: `/game/${game.id}`
      });
      
    } else if (type === 'online') {
      // For online games, we need to handle matchmaking differently
      // This would typically involve adding to a queue and waiting for a match
      // For now, return a pending status
      return NextResponse.json({
        status: 'queued',
        message: 'Added to matchmaking queue',
        redirect: null
      });
    }

    return NextResponse.json(
      { error: "Invalid game type" },
      { status: 400 }
    );
    
  } catch {
    return NextResponse.json(
      { error: "Failed to create game" },
      { status: 500 }
    );
  }
}