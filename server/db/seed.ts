import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local before importing db
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { db, users, systemSettings } from './index';

/**
 * Database seed script
 * Sets up initial admin accounts and system settings
 * Run with: npm run db:seed
 */

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Create default admin accounts
    const adminAccounts = [
      {
        id: uuidv4(),
        username: 'admin',
        email: 'admin@2banchess.local',
        role: 'super_admin' as const,
        rating: 2000,
        isActive: true,
      },
      {
        id: uuidv4(),
        username: 'moderator',
        email: 'mod@2banchess.local',
        role: 'moderator' as const,
        rating: 1800,
        isActive: true,
      },
    ];

    // Insert admin accounts (skip if they already exist)
    for (const admin of adminAccounts) {
      const existing = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.username, admin.username),
      });

      if (!existing) {
        await db.insert(users).values(admin);
        console.log(`✅ Created ${admin.role}: ${admin.username}`);

        // Log the admin credentials for initial setup
        if (admin.username === 'admin') {
          console.log(`
╔════════════════════════════════════════════════════════════╗
║                    ADMIN ACCOUNT CREATED                    ║
╠════════════════════════════════════════════════════════════╣
║  Username: admin                                            ║
║  Email: admin@2banchess.local                               ║
║  Role: super_admin                                          ║
║                                                              ║
║  ⚠️  IMPORTANT: Change these credentials after first login!  ║
║  These are development/seed accounts only.                  ║
╚════════════════════════════════════════════════════════════╝
          `);
        }
      } else {
        console.log(
          `⏭️  ${admin.role} '${admin.username}' already exists, skipping...`
        );
      }
    }

    // Create default system settings
    const defaultSettings = [
      {
        key: 'maintenance_mode',
        value: { enabled: false, message: '' },
        description: 'Enable maintenance mode to prevent new games',
      },
      {
        key: 'registration_enabled',
        value: { enabled: true },
        description: 'Allow new user registrations',
      },
      {
        key: 'game_settings',
        value: {
          max_game_duration: 7200, // 2 hours in seconds
          default_time_control: { initial: 300, increment: 0 },
          allow_anonymous: false,
        },
        description: 'Global game configuration settings',
      },
      {
        key: 'moderation_settings',
        value: {
          auto_ban_threshold: 5, // Number of reports before auto-ban
          report_cooldown: 3600, // Seconds between reports from same user
          ban_durations: {
            first_offense: 86400, // 1 day
            second_offense: 604800, // 1 week
            third_offense: 2592000, // 30 days
          },
        },
        description: 'Moderation and anti-abuse settings',
      },
      {
        key: 'feature_flags',
        value: {
          tournaments: false,
          puzzles: false,
          analysis_board: false,
          chat: false,
          spectator_mode: true,
        },
        description: 'Feature toggles for platform capabilities',
      },
    ];

    // Insert system settings
    for (const setting of defaultSettings) {
      const existing = await db.query.systemSettings.findFirst({
        where: (settings, { eq }) => eq(settings.key, setting.key),
      });

      if (!existing) {
        await db.insert(systemSettings).values(setting);
        console.log(`✅ Created setting: ${setting.key}`);
      } else {
        console.log(`⏭️  Setting '${setting.key}' already exists, skipping...`);
      }
    }

    console.log(`
╔════════════════════════════════════════════════════════════╗
║                    SEED COMPLETED                           ║
╠════════════════════════════════════════════════════════════╣
║  ✅ Admin accounts ready                                    ║
║  ✅ System settings configured                              ║
║                                                              ║
║  You can now:                                               ║
║  1. Start the application                                   ║
║  2. Login with the admin account                            ║
║  3. Configure additional settings via admin panel           ║
╚════════════════════════════════════════════════════════════╝
    `);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the seed
seed();
