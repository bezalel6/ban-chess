import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';

// Session configuration matching auth-unified.ts
export interface SessionData {
  userId?: string;
  username?: string;
  isLoggedIn?: boolean;
  createdAt?: number;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_change_this_in_production',
  cookieName: 'chess_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
};

// Define protected routes
const protectedRoutes = ['/game', '/play'];
const authRoutes = ['/auth/signin', '/auth/signup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get session from cookies - Next.js middleware cookies need conversion
  const cookieStore = {
    get: (name: string) => {
      const cookie = request.cookies.get(name);
      return cookie ? { name: cookie.name, value: cookie.value } : undefined;
    },
    getAll: () => {
      return Array.from(request.cookies.getAll());
    },
    has: (name: string) => request.cookies.has(name),
  };
  
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );
  
  const isAuthenticated = !!(session.userId && session.username);
  
  // Check if path is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  // Check if path is auth route
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  // Redirect unauthenticated users trying to access protected routes
  if (isProtectedRoute && !isAuthenticated) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(signInUrl);
  }
  
  // Redirect authenticated users away from auth pages
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};