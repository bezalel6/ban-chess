# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Application

```bash
# Start both Next.js and WebSocket server concurrently
npm run dev

# Start individual services
npm run dev:next    # Next.js app on port 3000
npm run dev:ws       # WebSocket server on port 8081

# Production build
npm run build
npm run start
```

### WebSocket Server

```bash
# Run WebSocket server standalone
npm run ws-server

# Development with auto-reload (uses nodemon)
npm run dev:ws
```

## Architecture Overview

### Core Structure

This is a real-time multiplayer Ban Chess web application built with:

- **Next.js 14** with App Router for the frontend
- **WebSocket server** (ws library) for real-time game synchronization
- **ban-chess.ts** library for game logic enforcement
- **react-chessground** for the interactive chess board UI

### Key Components

#### WebSocket Communication

- **Server**: `server/ws-server.ts` manages game rooms, player matching, and game state
- **Client Hook**: `lib/ws-client.ts` provides React hook for WebSocket connection
- **Message Types**: `lib/game-types.ts` defines TypeScript interfaces for client/server messages

#### Game Flow

1. Players join queue from landing page (`app/page.tsx`)
2. Server matches players and creates game room
3. Game page (`app/game/[id]/page.tsx`) connects via WebSocket
4. ChessBoard component (`components/ChessBoard.tsx`) handles UI interactions
5. All moves/bans validated server-side by ban-chess.ts engine

### WebSocket Protocol

#### Client Messages

- `join-queue`: Enter matchmaking queue
- `leave-queue`: Exit matchmaking queue
- `join-game`: Connect to specific game by ID
- `move`: Submit a chess move
- `ban`: Submit a ban on opponent's move

#### Server Messages

- `state`: Current game state with FEN, PGN, legal actions
- `queued`: Queue position update
- `matched`: Game created with assigned color
- `joined`: Successfully joined game
- `error`: Error message

### Ban Chess Rules

The game alternates between ban and move phases:

1. Black bans one of White's opening moves
2. White moves (with ban applied)
3. White bans one of Black's responses
4. Black moves (with ban applied)
5. Continue pattern: Ban → Move → Ban → Move

### Development Notes

#### Port Usage

- Next.js: 3000 (uses portio to ensure availability)
- WebSocket: 8081 (uses portio to ensure availability)

#### Auto-reload Configuration

Nodemon watches `server/` and `lib/` directories for TypeScript changes and restarts using tsx.

#### TypeScript Configuration

- Strict mode enabled
- Path alias `@/*` maps to project root
- Target ES2017 for server compatibility
