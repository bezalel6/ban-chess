import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Protected routes that require authentication
const protectedRoutes = ['/game', '/play'];

export default withAuth(
  function middleware(_req) {
    // This function is called after the authentication check
    // _req.nextauth.token will contain the JWT token if authenticated
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl;
        
        // Check if path is protected
        const isProtectedRoute = protectedRoutes.some(route => 
          pathname.startsWith(route)
        );
        
        // Allow access to non-protected routes
        if (!isProtectedRoute) {
          return true;
        }
        
        // Require authentication for protected routes
        return !!token;
      },
    },
    pages: {
      signIn: '/auth/signin',
    },
  }
);

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - auth (auth pages)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
};