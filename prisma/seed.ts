import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanup() {
  // Add cleanup logic here if needed
  // Example: await prisma.user.deleteMany({ where: { isGuest: true } })
}

async function seed() {
  // Seed global settings first
  await prisma.globalSettings.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      soundEnabled: true,
      soundVolume: 0.5,
      eventSoundMap: {
        "Move": "standard/Move",
        "Capture": "standard/Capture",
        "Check": "standard/Check",
        "Checkmate": "standard/Checkmate",
        "Draw": "standard/Draw",
        "Victory": "standard/Victory",
        "Defeat": "standard/Defeat",
        "GenericNotify": "standard/GenericNotify",
        "Error": "standard/Error",
        "LowTime": "standard/LowTime",
        "Confirmation": "standard/Confirmation"
      }
    }
  })
  console.log('✅ Seeded global sound settings')

  // Add your seeding logic here
  const users = await prisma.user.createMany({
    data: [
      {
        username: 'dev_user_1',
        email: 'dev1@example.com',
        isGuest: false,
      },
      {
        username: 'dev_user_2', 
        email: 'dev2@example.com',
        isGuest: false,
      },
      {
        username: 'guest_user_1',
        isGuest: true,
      },
    ],
    skipDuplicates: true,
  })

  console.log(`✅ Seeded ${users.count} users`)
}

async function main() {
  try {
    await cleanup()
    await seed()
  } catch (error) {
    console.error('Seed failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()