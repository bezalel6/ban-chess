# 2ban-2chess Project Overview

## Project Purpose
An experimental online platform for playing Ban Chess, a chess variant where players alternate between banning opponent moves and making their own moves. Features real-time multiplayer with WebSocket synchronization, multiple authentication methods, and comprehensive testing.

## Tech Stack
- **Framework**: Next.js 15.5.2 (App Router only)
- **Language**: TypeScript 5.7.2 (strict mode enabled)
- **Runtime**: React 19.0.0 with concurrent features
- **Styling**: Tailwind CSS 4.1.12
- **Game Engine**: ban-chess.ts v3.0.0 (local dependency)
- **Chessboard UI**: @bezalel6/react-chessground v2.0.3
- **WebSocket**: ws v8.18.0 for real-time communication
- **Database**: Prisma v6.15.0 with PostgreSQL
- **Authentication**: NextAuth.js v4.24.11 with Google/Lichess OAuth + Guest mode
- **Cache/State**: Redis (ioredis v5.7.0)
- **Testing**: Playwright v1.55.0 for E2E tests

## Project Structure
```
/app               - Next.js 15 App Router pages and API routes
/components        - React components (UI, game, auth)
/hooks            - Custom React hooks
/lib              - Shared utilities and business logic
/server           - WebSocket server and game services
/contexts         - React contexts (WebSocket, User Role)
/types            - TypeScript type definitions
/e2e              - Playwright end-to-end tests
/scripts          - Utility scripts for development and maintenance
/docs             - Documentation files
/public           - Static assets including sounds and icons
/prisma           - Database schema and migrations
```

## Key Features
- Real-time multiplayer chess with ban mechanics
- Multiple authentication methods (OAuth + Guest)
- Sound effects with multiple sound themes
- Responsive design with mobile support
- Game persistence with Redis
- Comprehensive E2E test coverage
- User profiles and username customization
- Active game detection and continuation