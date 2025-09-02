import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  validateUsername,
  changeUsername,
  isUsernameAvailable,
} from "@/lib/username";
import { redis, KEYS } from "@/server/redis";
import type { AuthSession } from "@/types/auth";

// Check username availability
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { error: "Username parameter is required" },
        { status: 400 },
      );
    }

    // Validate username format
    const validationError = validateUsername(username);
    if (validationError) {
      return NextResponse.json(
        { available: false, error: validationError },
        { status: 200 },
      );
    }

    // Check availability
    const available = await isUsernameAvailable(username);

    return NextResponse.json({
      available,
      error: available ? null : "This username is not available",
    });
  } catch (error) {
    console.error("[API] Username check error:", error);
    return NextResponse.json(
      { error: "Failed to check username availability" },
      { status: 500 },
    );
  }
}

// Update username
export async function POST(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as AuthSession | null;

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Guests cannot change usernames
    if (session.user.provider === "guest") {
      return NextResponse.json(
        {
          error:
            "Guest users cannot change usernames. Please sign in with Lichess or Google.",
        },
        { status: 403 },
      );
    }

    // Rate limiting: Check last username change
    const rateLimitKey = `username:change:${session.user.providerId}`;
    const lastChange = await redis.get(rateLimitKey);

    if (lastChange) {
      const timeSinceLastChange = Date.now() - parseInt(lastChange);
      const cooldownPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

      if (timeSinceLastChange < cooldownPeriod) {
        const remainingTime = cooldownPeriod - timeSinceLastChange;
        const daysRemaining = Math.ceil(remainingTime / (24 * 60 * 60 * 1000));

        return NextResponse.json(
          {
            error: `You can only change your username once every 7 days. Please wait ${daysRemaining} more day${daysRemaining === 1 ? "" : "s"}.`,
            nextChangeAvailable: Date.now() + remainingTime,
          },
          { status: 429 },
        );
      }
    }

    const body = await request.json();
    const { newUsername } = body;

    if (!newUsername) {
      return NextResponse.json(
        { error: "New username is required" },
        { status: 400 },
      );
    }

    // Prevent changing to same username
    if (newUsername.toLowerCase() === session.user.username.toLowerCase()) {
      return NextResponse.json(
        { error: "This is already your username" },
        { status: 400 },
      );
    }

    // Attempt to change username
    const result = await changeUsername(session.user.username, newUsername);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to change username" },
        { status: 400 },
      );
    }

    // Set rate limit timestamp
    await redis.setex(rateLimitKey, 30 * 24 * 60 * 60, Date.now().toString()); // Expire after 30 days

    // Update player session in Redis with new username
    const playerSession = await redis.get(
      KEYS.PLAYER_SESSION(session.user.providerId),
    );
    if (playerSession) {
      const sessionData = JSON.parse(playerSession);
      sessionData.username = newUsername;
      sessionData.previousUsername = session.user.username;
      sessionData.usernameChangedAt = Date.now();
      await redis.set(
        KEYS.PLAYER_SESSION(session.user.providerId),
        JSON.stringify(sessionData),
      );
    }

    // Broadcast username change to WebSocket connections via pub/sub
    await redis.publish(
      KEYS.CHANNELS.USER_UPDATE,
      JSON.stringify({
        userId: session.user.providerId,
        type: "username-change",
        oldUsername: session.user.username,
        newUsername: newUsername,
        timestamp: Date.now(),
      }),
    );

    return NextResponse.json({
      success: true,
      message:
        "Username updated successfully. Please sign out and back in for changes to take effect.",
      newUsername,
      requiresReauth: true,
    });
  } catch (error) {
    console.error("[API] Username update error:", error);
    return NextResponse.json(
      { error: "Failed to update username" },
      { status: 500 },
    );
  }
}
