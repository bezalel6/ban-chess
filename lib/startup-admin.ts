import prisma from './prisma';

/**
 * Automatically assigns admin privileges to users based on environment variable
 * Called during server startup to ensure configured admins have proper access
 */
export async function initializeAdmins() {
  try {
    // Get admin emails from environment variable
    const adminEmails = process.env.ADMIN_EMAILS;
    
    if (!adminEmails) {
      console.log('[Admin Init] No ADMIN_EMAILS environment variable found');
      return;
    }

    // Parse comma-separated emails and clean them up
    const emails = adminEmails
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(email => email.length > 0);

    if (emails.length === 0) {
      console.log('[Admin Init] No valid emails found in ADMIN_EMAILS');
      return;
    }

    console.log(`[Admin Init] Processing ${emails.length} admin email(s)...`);

    // Process each email
    for (const email of emails) {
      try {
        // Check if user exists
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, isAdmin: true, username: true }
        });

        if (!user) {
          console.log(`[Admin Init] User not found: ${email} (will be granted admin when they sign up)`);
          continue;
        }

        if (user.isAdmin) {
          console.log(`[Admin Init] Already admin: ${email}`);
          continue;
        }

        // Grant admin privileges
        await prisma.user.update({
          where: { email },
          data: { isAdmin: true }
        });

        console.log(`[Admin Init] ✓ Granted admin to: ${email} (${user.username})`);
      } catch (error) {
        console.error(`[Admin Init] Error processing ${email}:`, error);
      }
    }

    console.log('[Admin Init] Admin initialization complete');
  } catch (error) {
    console.error('[Admin Init] Fatal error during admin initialization:', error);
    // Don't throw - we don't want to prevent server startup
  }
}

/**
 * Checks if an email is in the admin list (for new user registration)
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  
  const adminEmails = process.env.ADMIN_EMAILS;
  if (!adminEmails) return false;

  const emails = adminEmails
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0);

  return emails.includes(email.toLowerCase());
}