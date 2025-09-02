import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  
  // Set a test cookie with subdomain sharing
  cookieStore.set('test-subdomain-cookie', 'test-value-' + Date.now(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? '.rndev.site' : undefined,
    maxAge: 60 * 5 // 5 minutes
  });

  // Get all cookies
  const allCookies = cookieStore.getAll();
  
  return NextResponse.json({
    message: 'Cookie test endpoint',
    environment: process.env.NODE_ENV,
    domain: process.env.NODE_ENV === 'production' ? '.rndev.site' : 'localhost',
    testCookieSet: true,
    currentCookies: allCookies.map(c => ({
      name: c.name,
      value: c.value.substring(0, 20) + '...', // Truncate for security
      domain: c.domain
    })),
    nextAuthCookies: {
      sessionToken: allCookies.find(c => c.name.includes('session-token'))?.name,
      callbackUrl: allCookies.find(c => c.name.includes('callback-url'))?.name,
      csrfToken: allCookies.find(c => c.name.includes('csrf-token'))?.name,
      state: allCookies.find(c => c.name.includes('state'))?.name,
    }
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { testWebSocket } = body;
  
  if (!testWebSocket) {
    return NextResponse.json({ error: 'Include testWebSocket: true in body' }, { status: 400 });
  }

  // Test WebSocket endpoint
  const wsTestUrl = process.env.NODE_ENV === 'production' 
    ? 'https://ws-chess.rndev.site/health'
    : 'http://localhost:3001/health';

  try {
    // Include cookies in the request to WebSocket server
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll()
      .map(c => `${c.name}=${c.value}`)
      .join('; ');

    const response = await fetch(wsTestUrl, {
      headers: {
        'Cookie': cookieHeader,
        'Origin': process.env.NODE_ENV === 'production' 
          ? 'https://chess.rndev.site'
          : 'http://localhost:3000'
      }
    });

    const wsHealth = await response.text();

    return NextResponse.json({
      message: 'WebSocket cookie test',
      webSocketHealthCheck: wsHealth,
      cookiesSent: cookieHeader.split('; ').map(c => c.split('=')[0]),
      webSocketUrl: wsTestUrl
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to reach WebSocket server',
      details: error instanceof Error ? error.message : 'Unknown error',
      wsUrl: wsTestUrl
    }, { status: 500 });
  }
}