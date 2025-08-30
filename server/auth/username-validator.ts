import { Filter } from 'bad-words';
import { db, users } from '../db';
import { sql } from 'drizzle-orm';

// Initialize profanity filter with custom additions
const filter = new Filter();

// Add chess-specific inappropriate terms
const customBadWords = [
  'admin', 'moderator', 'mod', 'staff', 'official', // Impersonation
  'lichess', 'chesscom', 'chess.com', // Brand impersonation  
  'stockfish', 'engine', 'bot', // Bot impersonation
];

filter.addWords(...customBadWords);

// Reserved usernames that shouldn't be allowed
const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'mod', 'moderator',
  'root', 'system', 'bot', 'engine',
  'guest', 'anonymous', 'user',
  'api', 'www', 'mail', 'ftp',
  'support', 'help', 'info', 'contact',
  'chess', '2banchess', 'banchess',
  'null', 'undefined', 'void',
  'test', 'testing', 'demo',
]);

/**
 * Sanitize and validate username
 */
export function sanitizeUsername(username: string): string {
  // Remove special characters, keep only alphanumeric and underscores
  let sanitized = username
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .substring(0, 30); // Max 30 chars
  
  // If empty after sanitization, generate a random one
  if (!sanitized || sanitized.length < 3) {
    sanitized = `User${Math.random().toString(36).substring(2, 10)}`;
  }
  
  return sanitized;
}

/**
 * Check if username contains profanity or reserved words
 * SECURITY: This function must not leak information about what patterns are blocked
 */
export function containsProfanity(username: string): boolean {
  const lower = username.toLowerCase();
  
  // Check reserved names
  if (RESERVED_USERNAMES.has(lower)) {
    console.log(`[Security] Blocked reserved username attempt: ${username.substring(0, 3)}***`);
    return true;
  }
  
  // Check for reserved patterns (admin impersonation attempts)
  if (lower.includes('admin') || lower.includes('mod') || lower.includes('staff')) {
    console.log(`[Security] Blocked admin impersonation attempt: ${username.substring(0, 3)}***`);
    return true;
  }
  
  // Check for system/bot patterns
  if (lower.includes('system') || lower.includes('bot') || lower.includes('official')) {
    console.log(`[Security] Blocked system impersonation attempt: ${username.substring(0, 3)}***`);
    return true;
  }
  
  // Check profanity filter
  if (filter.isProfane(username)) {
    console.log(`[Security] Blocked inappropriate username: ${username.substring(0, 3)}***`);
    return true;
  }
  
  return false;
}

/**
 * Generate a unique username from a base name
 * Handles collisions by appending numbers
 */
export async function generateUniqueUsername(baseUsername: string): Promise<string> {
  // Sanitize first
  let username = sanitizeUsername(baseUsername);
  
  // If it contains profanity, replace with generated name
  if (containsProfanity(username)) {
    const adjectives = ['Swift', 'Bold', 'Wise', 'Noble', 'Brave', 'Quick', 'Sharp', 'Keen'];
    const nouns = ['Knight', 'Bishop', 'Rook', 'Pawn', 'Player', 'Master', 'Scholar'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    username = `${randomAdj}${randomNoun}${Math.floor(Math.random() * 1000)}`;
  }
  
  // Check if username exists
  let finalUsername = username;
  let counter = 1;
  let exists = true;
  
  while (exists) {
    // Case-insensitive username check using LOWER()
    const existing = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.username}) = LOWER(${finalUsername})`)
      .limit(1);
    
    if (!existing || existing.length === 0) {
      exists = false;
    } else {
      // Append number and try again
      counter++;
      finalUsername = `${username}${counter}`;
      
      // Safety valve - if we've tried 100 times, generate random
      if (counter > 100) {
        finalUsername = `User${Date.now()}${Math.floor(Math.random() * 1000)}`;
        exists = false; // Force exit, this should be unique
      }
    }
  }
  
  return finalUsername;
}

/**
 * Validate username for manual registration
 * Returns error message if invalid, null if valid
 * 
 * SECURITY: All error messages are intentionally generic to prevent
 * users from discovering our filtering patterns or reserved words
 */
export function validateUsername(username: string): string | null {
  // Generic message for all validation failures to prevent exploitation
  const GENERIC_ERROR = 'Username is not available. Please choose a different username.';
  
  if (!username || username.length < 3) {
    return 'Username must be at least 3 characters';
  }
  
  if (username.length > 30) {
    return 'Username must be 30 characters or less';
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return 'Username can only contain letters, numbers, underscores, and hyphens';
  }
  
  // Don't reveal why the username was rejected - could be profanity,
  // reserved word, admin pattern, etc. Use generic message.
  if (containsProfanity(username)) {
    return GENERIC_ERROR;
  }
  
  return null;
}

/**
 * Get display name for a user (with role badges)
 */
export function getDisplayName(user: { username: string; role: string }): string {
  const badges: Record<string, string> = {
    'super_admin': '👑',
    'admin': '🛡️',
    'moderator': '🔧',
    'player': '',
    'guest': '👤',
  };
  
  const badge = badges[user.role] || '';
  return badge ? `${badge} ${user.username}` : user.username;
}