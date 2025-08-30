/**
 * WebSocket Configuration Helper
 * Ensures proper WSS usage when page is served over HTTPS
 */

/**
 * Get the appropriate WebSocket URL based on the current environment
 * Handles mixed content issues by ensuring WSS is used on HTTPS pages
 */
export function getWebSocketUrl(): string {
  // Check if we're in the browser
  if (typeof window === 'undefined') {
    // Server-side: use environment variable or default
    return process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001';
  }

  // Client-side: determine based on current page protocol
  const isHttps = window.location.protocol === 'https:';
  const host = window.location.hostname;

  // If we have an explicit environment variable, use it
  // But ensure it matches the page's security context
  if (process.env.NEXT_PUBLIC_WEBSOCKET_URL) {
    const envUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
    const isEnvSecure = envUrl.startsWith('wss://');

    // If page is HTTPS but WebSocket URL is not secure, upgrade it
    if (isHttps && !isEnvSecure) {
      console.warn(
        'Page served over HTTPS but WebSocket URL is not secure. Upgrading to WSS...'
      );
      return envUrl.replace('ws://', 'wss://');
    }

    return envUrl;
  }

  // Default logic based on environment
  if (host === 'localhost' || host === '127.0.0.1') {
    // Local development - use WS unless page is HTTPS
    return isHttps ? 'wss://localhost:3001' : 'ws://localhost:3001';
  } else if (host.includes('chess.rndev.site')) {
    // Production - always use WSS
    return 'wss://ws-chess.rndev.site';
  } else if (host.includes('rndev.site')) {
    // Other rndev.site subdomains - use WSS
    return 'wss://ws-chess.rndev.site';
  } else {
    // Unknown host - determine based on page protocol
    const protocol = isHttps ? 'wss:' : 'ws:';
    return `${protocol}//${host}:3001`;
  }
}

/**
 * Check if the current environment requires secure WebSocket
 */
export function requiresSecureWebSocket(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.protocol === 'https:';
}

/**
 * Get WebSocket configuration with dynamic URL
 */
export function getWebSocketConfig() {
  return {
    url: getWebSocketUrl(),
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  };
}
