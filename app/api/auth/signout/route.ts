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
    // Clear with subdomain configuration for production
    if (process.env.NODE_ENV === 'production') {
      cookieStore.set(cookieName, '', {
        maxAge: 0,
        path: '/',
        domain: '.rndev.site',
        secure: true,
        sameSite: 'lax'
      });
    }
    
    // Also try to clear without domain (for cookies set without domain)
    cookieStore.set(cookieName, '', {
      maxAge: 0,
      path: '/',
      secure: true,
      sameSite: 'lax'
    });
  });

  // Also clear any cookies that exist
  allCookies.forEach(cookie => {
    if (cookie.name.includes('next-auth') || cookie.name.includes('iron-session')) {
      // Clear with domain for production
      if (process.env.NODE_ENV === 'production') {
        cookieStore.set(cookie.name, '', {
          maxAge: 0,
          path: '/',
          domain: '.rndev.site',
          secure: true,
          sameSite: 'lax'
        });
      }
      
      // Clear without domain as fallback
      cookieStore.set(cookie.name, '', {
        maxAge: 0,
        path: '/',
        secure: true,
        sameSite: 'lax'
      });
    }
  });

  return NextResponse.json({ success: true }, { status: 200 });
}