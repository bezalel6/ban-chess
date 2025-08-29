import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(_req) {
    // This function is called after the authentication check
    // Allow all authenticated users to proceed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Simply check if user has a valid session token
        // This works for all auth providers: guest, Lichess, Google
        return !!token;
      },
    },
    pages: {
      signIn: '/auth/signin',
    },
  }
);

// Configure which routes to run middleware on
// Only protect game routes that actually need authentication
export const config = {
  matcher: [
    // Only protect game and play routes
    '/game/:path*',
    '/play/:path*',
  ],
};