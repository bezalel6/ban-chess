import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // Only show in development or with a secret key for security
  const debugKey = process.env.DEBUG_KEY || "debug-2ban-chess";
  
  // Get the debug key from query params
  const { searchParams } = new URL(request.url);
  const providedKey = searchParams.get("key");
  
  if (process.env.NODE_ENV === "production" && providedKey !== debugKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Critical auth-related environment variables
  const debugInfo = {
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "❌ NOT SET",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "✅ SET" : "❌ NOT SET",
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "✅ SET" : "❌ NOT SET",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "✅ SET" : "❌ NOT SET",
    LICHESS_CLIENT_ID: process.env.LICHESS_CLIENT_ID || "❌ NOT SET",
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || "❌ NOT SET",
    // Check if URL is properly formed
    URL_CHECK: {
      provided: process.env.NEXTAUTH_URL,
      isValid: (() => {
        try {
          new URL(process.env.NEXTAUTH_URL || "");
          return true;
        } catch {
          return false;
        }
      })(),
      expectedProd: "https://chess.rndev.site",
      matches: process.env.NEXTAUTH_URL === "https://chess.rndev.site"
    },
    // Auth callback URL that would be constructed
    CALLBACK_URLS: {
      google: process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/api/auth/callback/google` : "not-available",
      lichess: process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/api/auth/callback/lichess` : "not-available",
      signIn: process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/auth/signin` : "not-available",
    },
    // Current domain info
    CURRENT_HOST: request.headers.get("host") || "unknown",
    CURRENT_ORIGIN: request.headers.get("origin") || "unknown",
    CURRENT_REFERER: request.headers.get("referer") || "unknown",
  };

  return NextResponse.json(debugInfo, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}