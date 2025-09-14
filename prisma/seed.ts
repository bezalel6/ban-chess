import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanup() {
  // Add cleanup logic here if needed
  // Example: await prisma.user.deleteMany({ where: { isGuest: true } })
}

async function seed() {
  // Seed global settings with actual production defaults
  await prisma.globalSettings.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      soundEnabled: true,
      soundVolume: 1,
      eventSoundMap: {
        "ban": "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/notification.mp3",
        "move": "/sounds/standard/Move.mp3",
        "check": "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-check.mp3",
        "castle": "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/castle.mp3",
        "capture": "/sounds/standard/Capture.mp3",
        "promote": "/sounds/standard/Checkmate.mp3",
        "game-end": "/sounds/standard/Victory.mp3",
        "draw-offer": "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/notify.mp3",
        "game-start": "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-start.mp3",
        "game-invite": "/sounds/standard/NewChallenge.mp3",
        "time-warning": "/sounds/standard/LowTime.mp3",
        "opponent-move": "/sounds/standard/Move.mp3",
        "ban-attempt-mild": "/sounds/other/no-go.mp3",
        "ban-attempt-severe": "/sounds/futuristic/Explosion.mp3",
        "ban-attempt-moderate": "/sounds/standard/Error.mp3"
      }
    }
  })
  console.log('✅ Seeded global sound settings with production defaults')

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