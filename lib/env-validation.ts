// Environment variable validation and debugging helper

interface EnvCheck {
  name: string;
  value: string | undefined;
  required: boolean;
  defaultValue?: string;
  validator?: (value: string) => boolean;
  errorMessage?: string;
}

export function validateEnvironment() {
  const checks: EnvCheck[] = [
    {
      name: "NEXT_PUBLIC_WEBSOCKET_URL",
      value: process.env.NEXT_PUBLIC_WEBSOCKET_URL,
      required: false,
      defaultValue: "ws://localhost:3001",
      validator: (val) => val.startsWith("ws://") || val.startsWith("wss://"),
      errorMessage: "Must be a valid WebSocket URL (ws:// or wss://)",
    },
    {
      name: "DATABASE_URL",
      value: process.env.DATABASE_URL,
      required: true,
      validator: (val) => val.includes("postgresql://") || val.includes("postgres://"),
      errorMessage: "Must be a valid PostgreSQL connection string",
    },
    {
      name: "NEXTAUTH_SECRET",
      value: process.env.NEXTAUTH_SECRET,
      required: true,
      validator: (val) => val.length >= 32,
      errorMessage: "Must be at least 32 characters for security",
    },
    {
      name: "NEXTAUTH_URL",
      value: process.env.NEXTAUTH_URL,
      required: false,
      defaultValue: "http://localhost:3000",
      validator: (val) => val.startsWith("http://") || val.startsWith("https://"),
      errorMessage: "Must be a valid HTTP(S) URL",
    },
    {
      name: "NODE_ENV",
      value: process.env.NODE_ENV,
      required: false,
      defaultValue: "development",
      validator: (val) => ["development", "production", "test"].includes(val),
      errorMessage: "Must be 'development', 'production', or 'test'",
    },
  ];

  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];

  for (const check of checks) {
    const value = check.value || check.defaultValue;

    if (check.required && !check.value) {
      errors.push(`❌ ${check.name} is required but not set`);
      continue;
    }

    if (!check.value && check.defaultValue) {
      info.push(`ℹ️ ${check.name} not set, using default: ${check.defaultValue}`);
    }

    if (value && check.validator && !check.validator(value)) {
      errors.push(`❌ ${check.name}: ${check.errorMessage || "Invalid value"}`);
    }
  }

  // Additional WebSocket-specific checks
  const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:3001";
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && wsUrl.startsWith("ws://")) {
    warnings.push("⚠️ Using non-secure WebSocket (ws://) in production. Consider using wss://");
  }

  if (!isProduction && wsUrl.startsWith("wss://")) {
    warnings.push("⚠️ Using secure WebSocket (wss://) in development. This may cause certificate issues.");
  }

  // Check for common mistakes
  if (process.env.NEXT_PUBLIC_WS_URL) {
    warnings.push("⚠️ Found NEXT_PUBLIC_WS_URL - did you mean NEXT_PUBLIC_WEBSOCKET_URL?");
  }

  return {
    errors,
    warnings,
    info,
    isValid: errors.length === 0,
    summary: {
      totalChecks: checks.length,
      errors: errors.length,
      warnings: warnings.length,
    },
  };
}

// Helper to print validation results to console
export function logEnvironmentValidation() {
  const result = validateEnvironment();

  console.log("\n🔍 Environment Variable Validation");
  console.log("=" .repeat(50));

  if (result.info.length > 0) {
    console.log("\n📋 Information:");
    result.info.forEach((msg) => console.log(`  ${msg}`));
  }

  if (result.warnings.length > 0) {
    console.log("\n⚠️ Warnings:");
    result.warnings.forEach((msg) => console.log(`  ${msg}`));
  }

  if (result.errors.length > 0) {
    console.log("\n❌ Errors:");
    result.errors.forEach((msg) => console.log(`  ${msg}`));
  }

  console.log("\n📊 Summary:");
  console.log(`  Total checks: ${result.summary.totalChecks}`);
  console.log(`  Errors: ${result.summary.errors}`);
  console.log(`  Warnings: ${result.summary.warnings}`);
  console.log(`  Status: ${result.isValid ? "✅ Valid" : "❌ Invalid"}`);
  console.log("=" .repeat(50) + "\n");

  return result;
}

// Helper to check Redis connectivity (for server-side use)
export async function checkRedisConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  if (typeof window !== "undefined") {
    return { connected: false, error: "Cannot check Redis from browser" };
  }

  try {
    // Try to import Redis client (using ioredis)
    const Redis = (await import("ioredis")).default;
    const client = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

    await client.ping();
    client.disconnect();

    return { connected: true };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Startup validation message
export function getStartupMessage(): string {
  const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:3001";
  const isProduction = process.env.NODE_ENV === "production";

  return `
🎮 BanChess Server Starting...
================================
Environment: ${process.env.NODE_ENV || "development"}
WebSocket URL: ${wsUrl}
Database: ${process.env.DATABASE_URL ? "✅ Configured" : "❌ Not configured"}
Auth: ${process.env.NEXTAUTH_SECRET ? "✅ Configured" : "❌ Not configured"}

📝 Quick Checks:
- Redis: Run 'docker ps' to check if Redis is running
- WebSocket: Server should be on port ${wsUrl.split(":").pop()}
- Database: Run 'npx prisma studio' to view data

${!isProduction ? "💡 Tip: Run 'npm run dev:ws' and 'npm run dev:next' in separate terminals for better debugging" : ""}
================================
`;
}