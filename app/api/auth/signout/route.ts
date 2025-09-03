import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  
  // Get all cookies to clear
  const allCookies = cookieStore.getAll();
  
  // Clear all NextAuth cookies with proper domain configuration
  const cookiesToClear = [
    '__Secure-next-auth.session-token',
    '__Secure-next-auth.callback-url',
    '__Host-next-auth.csrf-token',
    '__Secure-next-auth.pkce.code_verifier',
    '__Secure-next-auth.state',
    '__Secure-next-auth.nonce',
    'next-auth.session-token',
    'next-auth.callback-url',
    'next-auth.csrf-token',
  ];

  // Clear each cookie with the same domain configuration used when setting
  cookiesToClear.forEach(cookieName => {
    // For session token, we must clear with the domain since that's how it's set
    if (cookieName.includes('session-token')) {
      if (process.env.NODE_ENV === 'production') {
        // Session token is set with domain: '.rndev.site'
        cookieStore.set(cookieName, '', {
          maxAge: 0,
          path: '/',
          domain: '.rndev.site',
          secure: true,
          sameSite: 'lax'
        });
      } else {
        // Development doesn't use domain
        cookieStore.set(cookieName, '', {
          maxAge: 0,
          path: '/',
          secure: false,
          sameSite: 'lax'
        });
      }
    } else {
      // Other cookies are set without domain in production
      cookieStore.set(cookieName, '', {
        maxAge: 0,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    }
  });

  // Log what we're clearing for debugging
  console.log('[SignOut] Clearing cookies in', process.env.NODE_ENV, 'mode');
  console.log('[SignOut] Found cookies:', allCookies.map(c => c.name).join(', '));

  return NextResponse.json({ success: true }, { status: 200 });
}