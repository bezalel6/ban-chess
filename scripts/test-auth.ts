import prisma from '../lib/prisma';

async function testAuth() {
  console.log('🔍 Testing Prisma Database Connection and User Persistence\n');
  
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful\n');
    
    // Check existing users
    const existingUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        isGuest: true,
        createdAt: true,
      }
    });
    
    console.log(`📊 Found ${existingUsers.length} existing users:`);
    existingUsers.forEach(user => {
      console.log(`  - ${user.username} (${user.isGuest ? 'Guest' : user.email}) - Created: ${user.createdAt.toLocaleString()}`);
    });
    
    // Test creating a guest user
    console.log('\n🧪 Testing Guest User Creation...');
    const guestUser = await prisma.user.create({
      data: {
        username: `Guest_${Math.random().toString(36).substring(2, 8)}`,
        name: 'Test Guest',
        isGuest: true,
      }
    });
    console.log(`✅ Created guest user: ${guestUser.username} (ID: ${guestUser.id})`);
    
    // Test creating an OAuth user
    console.log('\n🧪 Testing OAuth User Creation...');
    const testEmail = `test_${Date.now()}@example.com`;
    const oauthUser = await prisma.user.create({
      data: {
        email: testEmail,
        username: `ChessPlayer_${Math.random().toString(36).substring(2, 8)}`,
        name: 'Test OAuth User',
        isGuest: false,
      }
    });
    console.log(`✅ Created OAuth user: ${oauthUser.username} (Email: ${oauthUser.email})`);
    
    // Test email-based lookup (for account linking)
    console.log('\n🧪 Testing Email-based User Lookup...');
    const foundUser = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    console.log(`✅ Found user by email: ${foundUser?.username}`);
    
    // Show final user count
    const finalCount = await prisma.user.count();
    console.log(`\n📊 Total users in database: ${finalCount}`);
    
    // Check tables
    console.log('\n📋 Database Tables Status:');
    const userCount = await prisma.user.count();
    const accountCount = await prisma.account.count();
    const sessionCount = await prisma.session.count();
    const gameCount = await prisma.game.count();
    const presenceCount = await prisma.playerPresence.count();
    
    console.log(`  - User: ${userCount} records`);
    console.log(`  - Account: ${accountCount} records`);
    console.log(`  - Session: ${sessionCount} records`);
    console.log(`  - Game: ${gameCount} records`);
    console.log(`  - PlayerPresence: ${presenceCount} records`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n👋 Database connection closed');
  }
}

testAuth().catch(console.error);