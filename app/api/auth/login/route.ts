import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getSession, isUsernameTaken, activeUsers } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();
    
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      return NextResponse.json(
        { error: 'Username must be between 3 and 20 characters' },
        { status: 400 }
      );
    }

    // Check if username is already taken (case-insensitive)
    if (isUsernameTaken(trimmedUsername)) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      );
    }

    // Generate unique user ID
    const userId = nanoid();

    // Get the session
    const session = await getSession();
    
    // Set session data
    session.userId = userId;
    session.username = trimmedUsername;
    session.isLoggedIn = true;
    session.createdAt = Date.now();
    
    await session.save();

    // Add to active users
    activeUsers.set(userId, { username: trimmedUsername, userId });

    return NextResponse.json({
      success: true,
      user: {
        userId,
        username: trimmedUsername,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}