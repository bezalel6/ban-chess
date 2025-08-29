// Environment configuration
export const config = {
  // WebSocket URL configuration
  websocket: {
    url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || (
      process.env.NODE_ENV === 'production'
        ? 'wss://chess-api.rndev.site'
        : 'ws://localhost:8081'
    ),
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  },
  
  // API configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || (
      process.env.NODE_ENV === 'production'
        ? 'https://chess.rndev.site'
        : 'http://localhost:3000'
    ),
  },
  
  // Authentication configuration
  auth: {
    // Session cookie settings
    cookieName: 'next-auth.session-token',
    secureCookie: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
  
  // Game configuration
  game: {
    defaultTimeControl: {
      initial: 300, // 5 minutes
      increment: 0,
    },
  },
  
  // Feature flags
  features: {
    enableSounds: process.env.NEXT_PUBLIC_ENABLE_SOUNDS !== 'false',
    enableAnalysis: process.env.NEXT_PUBLIC_ENABLE_ANALYSIS === 'true',
  },
} as const;

// Helper to get WebSocket URL with authentication
export function getAuthenticatedWebSocketUrl(token?: string): string {
  const url = new URL(config.websocket.url);
  if (token) {
    url.searchParams.set('token', token);
  }
  return url.toString();
}

// Helper to check if we're in production
export const isProduction = process.env.NODE_ENV === 'production';

// Helper to check if we're on the server
export const isServer = typeof window === 'undefined';