import dotenv from 'dotenv';
import path from 'path';

/**
 * Centralized environment configuration class
 * Ensures consistent loading and access to environment variables
 */
class EnvConfig {
  private static instance: EnvConfig;
  private loaded = false;
  private envVars: Record<string, string | undefined> = {};

  private constructor() {
    this.load();
  }

  static getInstance(): EnvConfig {
    if (!EnvConfig.instance) {
      EnvConfig.instance = new EnvConfig();
    }
    return EnvConfig.instance;
  }

  /**
   * Load environment variables from .env files
   * Priority: .env.local > .env.development > .env
   */
  private load(): void {
    if (this.loaded) return;

    // Only load dotenv on server side
    if (typeof window === 'undefined') {
      const envFiles = [
        '.env.local',
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env',
      ];

      // Load each env file in order (later files don't override earlier ones)
      for (const file of envFiles) {
        const envPath = path.resolve(process.cwd(), file);
        dotenv.config({ path: envPath });
      }
    }

    // Cache all env vars
    this.envVars = { ...process.env };
    this.loaded = true;
  }

  /**
   * Get an environment variable with optional fallback
   */
  get(key: string, fallback?: string): string | undefined {
    return this.envVars[key] || fallback;
  }

  /**
   * Get a required environment variable (throws if not found)
   */
  getRequired(key: string): string {
    const value = this.get(key);
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  /**
   * Get a boolean environment variable
   */
  getBoolean(key: string, fallback = false): boolean {
    const value = this.get(key);
    if (!value) return fallback;
    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Get a number environment variable
   */
  getNumber(key: string, fallback?: number): number | undefined {
    const value = this.get(key);
    if (!value) return fallback;
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  }

  /**
   * Check if we're in production
   */
  isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  /**
   * Check if we're in development
   */
  isDevelopment(): boolean {
    return this.get('NODE_ENV') !== 'production';
  }

  /**
   * Validate required environment variables
   */
  validate(required: string[]): void {
    const missing: string[] = [];
    for (const key of required) {
      if (!this.get(key)) {
        missing.push(key);
      }
    }
    if (missing.length > 0) {
      console.error('[Env] Missing required environment variables:', missing);
      if (this.isProduction()) {
        throw new Error(
          `Missing required environment variables: ${missing.join(', ')}`
        );
      }
    }
  }

  /**
   * Get database configuration
   */
  getDatabaseConfig() {
    return {
      url: this.get('DATABASE_URL'),
      // Disable SSL for Coolify's internal PostgreSQL
      // Coolify uses Docker internal networking without SSL
      ssl: false,
      maxConnections: this.getNumber('DB_MAX_CONNECTIONS', 20),
      connectionTimeout: this.getNumber('DB_CONNECTION_TIMEOUT', 5000),
    };
  }

  /**
   * Get Redis configuration
   */
  getRedisConfig() {
    return {
      url: this.get('REDIS_URL'),
      maxRetries: this.getNumber('REDIS_MAX_RETRIES', 3),
      retryDelay: this.getNumber('REDIS_RETRY_DELAY', 1000),
    };
  }

  /**
   * Get authentication configuration
   */
  getAuthConfig() {
    return {
      nextAuthUrl: this.get('NEXTAUTH_URL', 'http://localhost:3000'),
      nextAuthSecret: this.get(
        'NEXTAUTH_SECRET',
        'dev-secret-change-in-production'
      ),
      googleClientId: this.get('GOOGLE_CLIENT_ID'),
      googleClientSecret: this.get('GOOGLE_CLIENT_SECRET'),
      lichessClientId: this.get('LICHESS_CLIENT_ID', '2ban-2chess-local-dev'),
    };
  }

  /**
   * Get WebSocket configuration
   */
  getWebSocketConfig() {
    return {
      url: this.get('NEXT_PUBLIC_WS_URL', 'ws://localhost:8081'),
      port: this.getNumber('WS_PORT', 8081),
      reconnectInterval: this.getNumber('WS_RECONNECT_INTERVAL', 3000),
      maxReconnectAttempts: this.getNumber('WS_MAX_RECONNECT_ATTEMPTS', 5),
    };
  }

  /**
   * Get session configuration
   */
  getSessionConfig() {
    return {
      secret: this.get('SESSION_SECRET', 'dev-secret-change-in-production'),
      maxAge: this.getNumber('SESSION_MAX_AGE', 30 * 24 * 60 * 60), // 30 days
      secure: this.isProduction(),
    };
  }
}

// Export singleton instance
export const Env = EnvConfig.getInstance();

// Export type for dependency injection
export type IEnv = EnvConfig;
