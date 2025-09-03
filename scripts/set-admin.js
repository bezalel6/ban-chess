#!/usr/bin/env node

/**
 * Admin Setup Script
 * Run this in your deployment environment to grant admin access
 * 
 * Usage:
 *   node scripts/set-admin.js email@example.com
 *   node scripts/set-admin.js --list
 *   node scripts/set-admin.js --revoke email@example.com
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node scripts/set-admin.js email@example.com    - Grant admin');
    console.log('  node scripts/set-admin.js --list               - List admins');
    console.log('  node scripts/set-admin.js --revoke email@example.com - Revoke admin');
    process.exit(1);
  }

  if (args[0] === '--list') {
    const admins = await prisma.user.findMany({
      where: { isAdmin: true },
      select: { email: true, username: true, id: true }
    });
    
    if (admins.length === 0) {
      console.log('No administrators found.');
    } else {
      console.log('Current administrators:');
      admins.forEach(admin => {
        console.log(`  - ${admin.email || admin.username} (${admin.id})`);
      });
    }
    return;
  }

  if (args[0] === '--revoke' && args[1]) {
    const email = args[1];
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.error(`User with email ${email} not found.`);
      process.exit(1);
    }

    await prisma.user.update({
      where: { email },
      data: { isAdmin: false }
    });

    console.log(`✅ Revoked admin access for ${email}`);
    return;
  }

  // Default action: grant admin
  const email = args[0];
  
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.error(`User with email ${email} not found.`);
    console.log('Make sure the user has signed up first.');
    process.exit(1);
  }

  if (user.isAdmin) {
    console.log(`User ${email} is already an administrator.`);
    return;
  }

  await prisma.user.update({
    where: { email },
    data: { isAdmin: true }
  });

  console.log(`✅ Successfully granted admin access to ${email}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });