import { Filter } from "bad-words";
import { redis, KEYS } from "../server/redis";

// Check if we're in build mode to avoid Redis calls
const isBuildTime = process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build';
const isStaticGeneration = process.env.NEXT_IS_STATIC_GENERATION === 'true';
const shouldSkipRedis = isBuildTime || isStaticGeneration;

// Initialize profanity filter
const filter = new Filter();

// Add custom words to filter (admin terms, chess-specific inappropriate terms)
const customBadWords = [
  "admin",
  "administrator",
  "moderator",
  "mod",
  "staff",
  "system",
  "root",
  "superuser",
  "owner",
  "operator",
  "official",
  "support",
  "help",
  "service",
  "lichess",
  "chesscom",
  "chess.com", // Prevent impersonation
  "nigel",
  "nig3l",
  "n1gel", // Common workarounds
];

filter.addWords(...customBadWords);

// Chess-themed username components for registered users
const CHESS_ADJECTIVES = [
  "Swift",
  "Bold",
  "Clever",
  "Tactical",
  "Strategic",
  "Brilliant",
  "Dynamic",
  "Sharp",
  "Precise",
  "Calculated",
  "Aggressive",
  "Defensive",
  "Patient",
  "Creative",
  "Solid",
  "Fierce",
  "Cunning",
  "Royal",
  "Noble",
  "Mighty",
  "Fearless",
  "Resilient",
  "Focused",
  "Ambitious",
  "Determined",
];

const CHESS_NOUNS = [
  "Knight",
  "Bishop",
  "Rook",
  "Queen",
  "King",
  "Pawn",
  "Master",
  "Gambit",
  "Castle",
  "Champion",
  "Tactician",
  "Endgame",
  "Opening",
  "Checkmate",
  "Fortress",
  "Attack",
  "Defense",
  "Sacrifice",
  "Fork",
  "Pin",
  "Skewer",
  "Blitz",
  "Tempo",
  "Fianchetto",
  "Promotion",
  "Stalemate",
];

// Username validation rules
const USERNAME_RULES = {
  minLength: 3,
  maxLength: 20,
  pattern: /^[a-zA-Z0-9_-]+$/,
  reservedPrefixes: ["guest_", "system_", "bot_", "ai_"],
};

/**
 * Generate a boring Guest ID for anonymous users
 * Format: Guest_[timestamp][random]
 */
export function generateGuestId(): string {
  const timestamp = Date.now().toString(36).slice(-6);
  const random = Math.random().toString(36).slice(-4);
  return `Guest_${timestamp}${random}`;
}

/**
 * Generate a fun chess-themed username for registered users
 */
export function generateChessUsername(): string {
  const adjective =
    CHESS_ADJECTIVES[Math.floor(Math.random() * CHESS_ADJECTIVES.length)];
  const noun = CHESS_NOUNS[Math.floor(Math.random() * CHESS_NOUNS.length)];
  const number = Math.floor(Math.random() * 9999);

  return `${adjective}${noun}${number}`;
}

/**
 * Check if username is available (not in use by active players)
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  // During build time, assume usernames are available to prevent build failures
  if (shouldSkipRedis) {
    return true;
  }

  try {
    const normalizedUsername = username.toLowerCase();

    // Check active players in Redis
    const onlinePlayers = await redis.smembers(KEYS.ONLINE_PLAYERS);

    for (const playerId of onlinePlayers) {
      const sessionData = await redis.get(KEYS.PLAYER_SESSION(playerId));
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.username?.toLowerCase() === normalizedUsername) {
          return false;
        }
      }
    }

    // Check permanently reserved usernames
    const isReserved = await redis.sismember(
      "reserved:usernames",
      normalizedUsername,
    );
    if (isReserved) {
      return false;
    }

    // Check recently used usernames (prevents rapid switching)
    const recentlyUsed = await redis.get(
      `recent:username:${normalizedUsername}`,
    );
    if (recentlyUsed) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Username] Availability check failed:", error);
    return false; // Fail closed for safety
  }
}

/**
 * Validate username with vague error messages for security
 * Returns a generic error message if invalid, null if valid
 */
export function validateUsername(username: string): string | null {
  // Length check
  if (
    username.length < USERNAME_RULES.minLength ||
    username.length > USERNAME_RULES.maxLength
  ) {
    return "Username must be between 3 and 20 characters";
  }

  // Character validation
  if (!USERNAME_RULES.pattern.test(username)) {
    return "Username can only contain letters, numbers, underscores, and hyphens";
  }

  // Check reserved prefixes
  const lowerUsername = username.toLowerCase();
  for (const prefix of USERNAME_RULES.reservedPrefixes) {
    if (lowerUsername.startsWith(prefix)) {
      return "This username is not available";
    }
  }

  // Profanity check - return vague message
  if (filter.isProfane(username)) {
    return "This username is not available";
  }

  // Check for leetspeak variations of bad words
  const leetVariants = username
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/0/g, "o")
    .replace(/7/g, "t");

  if (filter.isProfane(leetVariants)) {
    return "This username is not available";
  }

  // Check for consecutive special characters (often used to bypass filters)
  if (/[_-]{3,}/.test(username)) {
    return "This username is not available";
  }

  // All checks passed
  return null;
}

/**
 * Generate a unique chess username for a new registered user
 */
export async function generateUniqueChessUsername(): Promise<string> {
  const maxAttempts = 20;

  for (let i = 0; i < maxAttempts; i++) {
    const username = generateChessUsername();

    // Validate the generated username (should always pass but good to check)
    const validationError = validateUsername(username);
    if (validationError) {
      continue;
    }

    // Check availability
    const available = await isUsernameAvailable(username);
    if (available) {
      return username;
    }
  }

  // Fallback with timestamp to guarantee uniqueness
  const timestamp = Date.now().toString(36);
  return `Player${timestamp}`;
}

/**
 * Reserve a username to prevent immediate reuse
 */
export async function reserveUsername(
  username: string,
  duration = 30 * 24 * 60 * 60,
): Promise<void> {
  // Skip Redis operations during build time
  if (shouldSkipRedis) {
    return;
  }

  try {
    const normalizedUsername = username.toLowerCase();

    // Add to recently used with TTL
    await redis.setex(`recent:username:${normalizedUsername}`, duration, "1");

    // Add to permanent reserved list if it's a sensitive username
    if (customBadWords.some((word) => normalizedUsername.includes(word))) {
      await redis.sadd("reserved:usernames", normalizedUsername);
    }
  } catch (error) {
    console.error("[Username] Failed to reserve username:", error);
  }
}

/**
 * Attempt to change a user's username with full validation and database update
 */
export async function changeUsername(
  currentUsername: string,
  newUsername: string,
  userId?: string,
): Promise<{ success: boolean; error?: string }> {
  // Validate the new username
  const validationError = validateUsername(newUsername);
  if (validationError) {
    return { success: false, error: validationError };
  }

  // Check availability
  const available = await isUsernameAvailable(newUsername);
  if (!available) {
    return { success: false, error: "This username is not available" };
  }

  // Update the username in the database if userId is provided
  if (userId) {
    try {
      // Import prisma only when needed to avoid circular dependencies
      const { default: prisma } = await import('./prisma');
      
      await prisma.user.update({
        where: { id: userId },
        data: { 
          username: newUsername,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error("[Username] Failed to update username in database:", error);
      return { success: false, error: "Failed to update username in database" };
    }
  }

  // Reserve the old username to prevent immediate reuse
  await reserveUsername(currentUsername);

  return { success: true };
}
