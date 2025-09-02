import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import prisma from "./prisma";
import { generateUniqueChessUsername } from "./username";

// Guest users need a placeholder email to satisfy NextAuth's type requirements
// This email format is invalid and will never receive actual emails
const GUEST_EMAIL_DOMAIN = "@guest.local";
const getGuestEmail = (id: string) => `guest_${id}${GUEST_EMAIL_DOMAIN}`;

/**
 * Custom Prisma adapter that ensures security and privacy:
 * 
 * 1. Each email can only be registered with ONE provider
 * 2. Never reveals which provider is associated with an email
 * 3. Always generates usernames for new users
 * 4. Prevents account takeover via different OAuth providers
 * 5. In development, auto-cleans test accounts older than 24 hours
 */
export function CustomPrismaAdapter(): Adapter {
  const baseAdapter = PrismaAdapter(prisma);
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    ...baseAdapter,
    
    // Override createUser to check for email conflicts and generate usernames
    createUser: async (user) => {
      // REQUIREMENT: All OAuth users must have email addresses
      // Users without emails should use Guest login instead
      if (!user.email) {
        console.log('[Auth] Rejecting OAuth user without email - they should use Guest login');
        throw new Error("EMAIL_REQUIRED");
      }
      
      // Check if a user with this email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
        include: { accounts: true }
      });
      
      if (existingUser) {
        // In development, clean up old test accounts (older than 24 hours)
        if (isDevelopment) {
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          if (existingUser.createdAt < oneDayAgo) {
            console.log(`[Auth] Cleaning up old test account: ${existingUser.email}`);
            
            // Delete the old account and all related data
            await prisma.session.deleteMany({ where: { userId: existingUser.id } });
            await prisma.account.deleteMany({ where: { userId: existingUser.id } });
            await prisma.user.delete({ where: { id: existingUser.id } });
            
            // Now proceed to create the new account
          } else {
            // Account is recent, check if it's the same provider
            const existingProvider = existingUser.accounts[0]?.provider;
            
            // For security, still prevent multiple providers per email
            // But in dev, show a more helpful message
            console.warn(`[Auth] Email ${user.email} already registered with provider: ${existingProvider || 'unknown'}`);
            throw new Error("ACCOUNT_EXISTS");
          }
        } else {
          // Production: strict security, no information leakage
          throw new Error("ACCOUNT_EXISTS");
        }
      }
      
      // Generate a unique chess username for new OAuth users
      const username = await generateUniqueChessUsername();
      
      // Create the new user with a guaranteed username
      const newUser = await prisma.user.create({
        data: {
          ...user,
          username,
          isGuest: false, // OAuth users are not guests
        },
      });
      
      return newUser;
    },
    
    // Override linkAccount to prevent linking to existing emails
    linkAccount: async (account) => {
      // Check if the user this account is trying to link to exists
      const user = await prisma.user.findUnique({
        where: { id: account.userId },
      });
      
      if (!user) {
        throw new Error("User not found");
      }
      
      // Check if this user's email is already associated with a different account
      if (user.email) {
        const existingAccount = await prisma.account.findFirst({
          where: { 
            userId: user.id,
            provider: { not: account.provider }
          }
        });
        
        if (existingAccount) {
          // User already has an account with a different provider
          // This shouldn't happen with our flow, but safeguard against it
          throw new Error("ACCOUNT_EXISTS");
        }
      }
      
      // Proceed with normal account linking
      return baseAdapter.linkAccount!(account);
    },
    
    // Ensure getUser returns our custom fields
    getUser: async (id) => {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          name: true,
          image: true,
          username: true,
          isGuest: true,
        },
      });
      
      if (!user) return null;
      
      // For guest users without email, provide a placeholder to satisfy NextAuth types
      return {
        ...user,
        email: user.email || getGuestEmail(user.id),
      };
    },
    
    // Keep getUserByEmail but it won't auto-link accounts
    getUserByEmail: async (email) => {
      const user = await prisma.user.findUnique({
        where: { email },
      });
      
      if (!user) return null;
      
      // For guest users without email, provide a placeholder to satisfy NextAuth types
      return {
        ...user,
        email: user.email || getGuestEmail(user.id),
      };
    },
  };
}