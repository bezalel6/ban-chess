#!/usr/bin/env node
/**
 * Script to reset username change rate limiting and clear reserved usernames
 * Usage: node scripts/reset-username-limits.js [options]
 * 
 * Options:
 *   --user <providerId>  Reset rate limit for specific user
 *   --all               Reset all rate limits
 *   --clear-reserved    Clear reserved usernames
 *   --help              Show this help message
 */

const Redis = require('ioredis');

// Initialize Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

async function resetUserRateLimit(providerId) {
  const key = `username:change:${providerId}`;
  const exists = await redis.exists(key);
  
  if (exists) {
    await redis.del(key);
    console.log(`✅ Reset rate limit for user: ${providerId}`);
    console.log(`   Key deleted: ${key}`);
  } else {
    console.log(`ℹ️  No rate limit found for user: ${providerId}`);
  }
}

async function resetAllRateLimits() {
  console.log('🔍 Scanning for all username change rate limits...\n');
  
  // Find all rate limit keys
  const keys = await redis.keys('username:change:*');
  
  if (keys.length === 0) {
    console.log('ℹ️  No rate limits found');
    return;
  }
  
  console.log(`Found ${keys.length} rate limit(s):\n`);
  
  // Display current rate limits
  for (const key of keys) {
    const value = await redis.get(key);
    const timestamp = parseInt(value);
    const date = new Date(timestamp);
    const providerId = key.replace('username:change:', '');
    
    console.log(`  User: ${providerId}`);
    console.log(`  Last change: ${date.toLocaleString()}`);
    console.log(`  Time since: ${Math.floor((Date.now() - timestamp) / 1000 / 60)} minutes ago\n`);
  }
  
  // Ask for confirmation
  console.log(`⚠️  This will reset rate limits for ${keys.length} user(s)`);
  
  // Delete all rate limit keys
  for (const key of keys) {
    await redis.del(key);
    console.log(`  ✅ Deleted: ${key}`);
  }
  
  console.log(`\n✅ Reset ${keys.length} rate limit(s)`);
}

async function clearReservedUsernames() {
  console.log('🔍 Checking reserved usernames...\n');
  
  // Check permanent reserved list
  const permanentReserved = await redis.smembers('reserved:usernames');
  if (permanentReserved.length > 0) {
    console.log(`Found ${permanentReserved.length} permanently reserved username(s):`);
    permanentReserved.forEach(name => console.log(`  - ${name}`));
    
    // Clear the set
    await redis.del('reserved:usernames');
    console.log('✅ Cleared permanently reserved usernames\n');
  } else {
    console.log('ℹ️  No permanently reserved usernames found\n');
  }
  
  // Check recently used usernames (temporary reservations)
  const recentKeys = await redis.keys('recent:username:*');
  if (recentKeys.length > 0) {
    console.log(`Found ${recentKeys.length} temporarily reserved username(s):`);
    
    for (const key of recentKeys) {
      const username = key.replace('recent:username:', '');
      const ttl = await redis.ttl(key);
      console.log(`  - ${username} (expires in ${Math.floor(ttl / 60 / 60)} hours)`);
    }
    
    // Delete all temporary reservations
    for (const key of recentKeys) {
      await redis.del(key);
    }
    console.log(`✅ Cleared ${recentKeys.length} temporary username reservation(s)`);
  } else {
    console.log('ℹ️  No temporarily reserved usernames found');
  }
}

async function showStatus() {
  console.log('📊 Username System Status\n');
  console.log('='.repeat(50));
  
  // Check rate limits
  const rateLimitKeys = await redis.keys('username:change:*');
  console.log(`\n📝 Rate Limits: ${rateLimitKeys.length} active`);
  
  if (rateLimitKeys.length > 0) {
    for (const key of rateLimitKeys.slice(0, 5)) { // Show first 5
      const value = await redis.get(key);
      const timestamp = parseInt(value);
      const minutesAgo = Math.floor((Date.now() - timestamp) / 1000 / 60);
      const providerId = key.replace('username:change:', '').substring(0, 20) + '...';
      console.log(`   - ${providerId}: changed ${minutesAgo} min ago`);
    }
    if (rateLimitKeys.length > 5) {
      console.log(`   ... and ${rateLimitKeys.length - 5} more`);
    }
  }
  
  // Check reserved usernames
  const permanentReserved = await redis.scard('reserved:usernames');
  const temporaryReserved = await redis.keys('recent:username:*');
  
  console.log(`\n🚫 Reserved Usernames:`);
  console.log(`   - Permanent: ${permanentReserved}`);
  console.log(`   - Temporary: ${temporaryReserved.length}`);
  
  // Check online players
  const onlinePlayers = await redis.smembers('online:players');
  console.log(`\n👥 Online Players: ${onlinePlayers.length}`);
  
  console.log('\n' + '='.repeat(50));
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Username Rate Limit Reset Tool
==============================

Usage: node scripts/reset-username-limits.js [options]

Options:
  --user <providerId>  Reset rate limit for specific user
  --all               Reset all rate limits  
  --clear-reserved    Clear reserved usernames
  --status            Show current status
  --help              Show this help message

Examples:
  node scripts/reset-username-limits.js --status
  node scripts/reset-username-limits.js --user lichess_12345
  node scripts/reset-username-limits.js --all
  node scripts/reset-username-limits.js --all --clear-reserved
    `);
    await redis.quit();
    return;
  }
  
  try {
    // Show status first if requested
    if (args.includes('--status')) {
      await showStatus();
    }
    
    // Reset specific user
    const userIndex = args.indexOf('--user');
    if (userIndex !== -1 && args[userIndex + 1]) {
      await resetUserRateLimit(args[userIndex + 1]);
    }
    
    // Reset all rate limits
    if (args.includes('--all')) {
      await resetAllRateLimits();
    }
    
    // Clear reserved usernames
    if (args.includes('--clear-reserved')) {
      await clearReservedUsernames();
    }
    
    console.log('\n✅ Operation completed successfully');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await redis.quit();
  }
}

main().catch(console.error);