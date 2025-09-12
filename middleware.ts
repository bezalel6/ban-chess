import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_request: NextRequest) {
  // With Lichess-style auth, all users (including anonymous) can access all routes
  // No authentication required - everyone is welcome!
  return NextResponse.next();
}

// Since we allow anonymous users everywhere, we don't need to protect any routes
// The middleware is kept for potential future use (rate limiting, etc.)
export const config = {
  matcher: [
    // Currently no routes need protection since anonymous users are allowed
  ],
};