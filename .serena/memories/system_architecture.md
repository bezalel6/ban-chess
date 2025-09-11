# System Architecture

## Application Architecture
- **Frontend**: Next.js 15 App Router with React 19
- **Backend**: Node.js WebSocket server (separate process)
- **Real-time Communication**: WebSocket protocol with custom message types
- **State Management**: 
  - Client: React hooks + Context API
  - Server: Redis for game state persistence
- **Authentication**: NextAuth.js with multiple providers

## Key Components

### Frontend Architecture
- **Pages** (`/app`): Server components by default, streaming SSR
- **Components** (`/components`): Reusable UI components
- **Hooks** (`/hooks`): 
  - `useGameState`: WebSocket game state management
  - `useGameTimer`: Timer functionality
- **Contexts** (`/contexts`):
  - `WebSocketContext`: WS connection management
  - `UserRoleContext`: User role/permissions

### Backend Services
- **WebSocket Server** (`/server/ws-server.ts`): 
  - Handles real-time game communication
  - Redis integration for persistence
  - Automatic game cleanup after completion
- **Game Service** (`/server/services/game-service.ts`):
  - Core game logic using ban-chess.ts engine
  - Move/ban validation
- **Timer Service** (`/server/services/timer-service.ts`):
  - Game clock management

### Data Flow
1. Client action (move/ban) → WebSocket message
2. Server validates using ban-chess.ts engine
3. Server updates Redis state
4. Server broadcasts update to all clients
5. Clients update UI based on new state

### WebSocket Protocol
- **Client → Server**: create, join, ban, move messages
- **Server → Client**: state updates, errors, game events
- **BCN Format**: Efficient serialization for moves/bans

## Design Patterns
- **Component-based Architecture**: Modular, reusable components
- **Separation of Concerns**: Clear backend/frontend split
- **Event-driven Communication**: WebSocket for real-time updates
- **State Persistence**: Redis for fault tolerance
- **Type Safety**: Full TypeScript coverage

## Security Considerations
- OAuth authentication with Google/Lichess
- JWT session tokens
- Input validation on server
- Secure WebSocket connections (WSS in production)