# 🏗️ 2ban-2chess Architecture Documentation

## System Overview

2ban-2chess is a real-time multiplayer chess variant platform built with a modern web stack. The architecture follows a distributed client-server model with WebSocket-based real-time communication, Redis for persistence and horizontal scaling, and efficient Ban Chess Notation (BCN) for network optimization.

## Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        RC[React Client]
        Chess[react-chessground]
        Sound[Howler.js]
    end
    
    subgraph "Application Layer"
        Next[Next.js Server]
        Auth[Auth Handler]
        Session[Iron Session]
    end
    
    subgraph "Real-time Layer"
        WS1[WebSocket Server 1]
        WS2[WebSocket Server N]
        Queue[Matchmaking Queue]
        Rooms[Game Rooms]
    end
    
    subgraph "Persistence Layer"
        Redis[(Redis)]
        PubSub[Redis Pub/Sub]
        History[Action History - BCN]
        GameState[Game State - PGN]
    end
    
    subgraph "Game Logic Layer"
        Engine[ban-chess.ts v1.2.2]
        BCN[BCN Serialization]
        Validator[Move Validator]
    end
    
    Browser --> RC
    RC --> Chess
    RC --> Sound
    RC --> Next
    RC -.->|WebSocket| WS1
    RC -.->|WebSocket| WS2
    
    Next --> Auth
    Auth --> Session
    
    WS1 --> Redis
    WS2 --> Redis
    WS1 --> PubSub
    WS2 --> PubSub
    Redis --> History
    Redis --> GameState
    
    WS1 --> Queue
    WS1 --> Rooms
    Rooms --> Engine
    Engine --> BCN
    Engine --> Validator
```

## Component Architecture

### Frontend Components

```mermaid
graph TD
    App[App Layout]
    App --> HomePage[Home Page]
    App --> GamePage[Game Page]
    
    HomePage --> UsernameOverlay[Username Overlay]
    
    GamePage --> ChessBoard[ChessBoard Component]
    GamePage --> UserInfo[User Info]
    GamePage --> SoundControl[Sound Control]
    
    ChessBoard --> WSClient[WebSocket Client]
    ChessBoard --> SoundManager[Sound Manager]
    
    UserInfo --> AuthContext[Auth Context]
    UsernameOverlay --> AuthContext
```

### Backend Services

```mermaid
graph LR
    Client[Client]
    
    subgraph "HTTP Server (Port 3000)"
        NextJS[Next.js App Router]
        API[API Routes]
        AuthAPI[/api/auth/*]
    end
    
    subgraph "WebSocket Server (Port 8081)"
        WSServer[WS Server]
        GameManager[Game Manager]
        PlayerManager[Player Manager]
        QueueManager[Queue Manager]
    end
    
    subgraph "Game Engine"
        BanChess[ban-chess.ts]
        MoveValidation[Move Validation]
        StateComputation[State Computation]
    end
    
    Client --> NextJS
    Client --> WSServer
    NextJS --> API
    API --> AuthAPI
    
    WSServer --> GameManager
    WSServer --> PlayerManager
    WSServer --> QueueManager
    
    GameManager --> BanChess
    BanChess --> MoveValidation
    BanChess --> StateComputation
```

## Data Flow

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant NextJS
    participant Session
    participant WSServer
    
    User->>Browser: Enter username
    Browser->>NextJS: POST /api/auth/login
    NextJS->>Session: Create session
    Session-->>NextJS: Session cookie
    NextJS-->>Browser: User data + cookie
    Browser->>WSServer: Connect WebSocket
    Browser->>WSServer: authenticate message
    WSServer-->>Browser: authenticated confirmation
```

### Game Flow

```mermaid
sequenceDiagram
    participant Player1
    participant Player2
    participant WSServer
    participant GameEngine
    
    Player1->>WSServer: join-queue
    Player2->>WSServer: join-queue
    WSServer->>WSServer: Match players
    WSServer->>GameEngine: Create game
    WSServer-->>Player1: matched (white)
    WSServer-->>Player2: matched (black)
    
    loop Game Turns
        WSServer-->>Player1: state (ban phase)
        Player1->>WSServer: ban move
        WSServer->>GameEngine: Apply ban
        WSServer-->>Player2: state (move phase)
        Player2->>WSServer: make move
        WSServer->>GameEngine: Apply move
        GameEngine-->>WSServer: New state
        WSServer-->>Player1: state update
        WSServer-->>Player2: state update
    end
```

## Ban Chess Notation (BCN)

BCN is a compact, network-friendly format for representing Ban Chess actions, providing ~90% bandwidth reduction compared to JSON:

### Format Specification
- **Ban**: `b:e2e4` (6 characters) - Bans the move from e2 to e4
- **Move**: `m:d2d4` (6 characters) - Moves from d2 to d4
- **Promotion**: `m:e7e8q` (7-8 characters) - Promotes to queen

### Serialization Example
```typescript
// Serialize for network/storage
BanChess.serializeAction({ ban: { from: 'e2', to: 'e4' } }); // "b:e2e4"

// Deserialize received actions
BanChess.deserializeAction('b:e2e4'); // { ban: { from: 'e2', to: 'e4' } }

// Replay game from action history
const game = BanChess.replayFromActions(["b:e2e4", "m:d2d4", ...]);
```

## Technology Stack Details

### Frontend Stack

| Component | Technology | Purpose | Version |
|-----------|------------|---------|---------|
| Framework | Next.js 15 | React framework with App Router | 15.5.2 |
| UI Library | React 19 | Component-based UI with concurrent features | 19.0.0 |
| Chess UI | @bezalel6/react-chessground | Interactive chess board | 1.5.0 |
| Styling | Tailwind CSS | Utility-first CSS framework | 3.4.17 |
| Audio | Howler.js | Web audio API wrapper | 2.2.4 |
| Type Safety | TypeScript | Static typing with strict mode | 5.7.2 |

### Backend Stack

| Component | Technology | Purpose | Version |
|-----------|------------|---------|---------|
| Runtime | Node.js | JavaScript runtime | 20.18.1 |
| WebSocket | ws | WebSocket server | 8.18.0 |
| Game Logic | ban-chess.ts | Chess variant engine | 3.0.0 |
| Persistence | Redis/ioredis | Game state & pub/sub | 5.4.1 |
| Session | iron-session | Encrypted sessions | 8.0.4 |
| Authentication | NextAuth.js | OAuth & session management | 5.0.0 |
| IDs | nanoid/uuid | Unique identifiers | 5.1.5/9.0.1 |

## Design Patterns

### 1. Component-Based Architecture
- **Pattern**: Atomic Design
- **Implementation**: Small, reusable React components
- **Benefits**: Maintainability, testability, reusability

### 2. Context Pattern
- **Pattern**: React Context API
- **Implementation**: AuthContext for user state
- **Benefits**: Avoid prop drilling, centralized state

### 3. Observer Pattern
- **Pattern**: WebSocket event handling
- **Implementation**: Event-driven message processing
- **Benefits**: Decoupled communication, real-time updates

### 4. Repository Pattern
- **Pattern**: Game state management
- **Implementation**: GameRoom class encapsulation
- **Benefits**: Data abstraction, clean interfaces

### 5. Factory Pattern
- **Pattern**: Game creation
- **Implementation**: Game factory in WebSocket server
- **Benefits**: Consistent game initialization

## State Management

### Client State

```typescript
// Local Component State
- Board position (FEN)
- Legal moves/bans
- UI state (sounds, selections)

// Context State
- User authentication
- Session data

// WebSocket State
- Connection status
- Game state
- Player information
```

### Server State

```typescript
// Redis-Backed State (Persistent)
interface RedisState {
  'game:{id}': {           // Hash
    fen: string;
    pgn: string;           // Full game in PGN format
    whitePlayerId: string;
    blackPlayerId: string;
    timeControl: TimeControl;
    startTime: number;
  };
  'game:{id}:history': string[];  // List of BCN actions
  'matchmaking:queue': Player[];   // Queue for matchmaking
  'players:online': Set<string>;   // Online player IDs
}

// In-Memory State (Transient)
interface ServerState {
  games: Map<string, BanChess>;  // Active game instances
  authenticatedPlayers: Map<WebSocket, Player>;
  timeManagers: Map<string, TimeManager>;
}
```

## Security Architecture

### Authentication & Authorization

```mermaid
graph TD
    Request[Client Request]
    Session[Session Validation]
    Auth[Authorization Check]
    Action[Perform Action]
    Reject[Reject Request]
    
    Request --> Session
    Session -->|Valid| Auth
    Session -->|Invalid| Reject
    Auth -->|Authorized| Action
    Auth -->|Unauthorized| Reject
```

### Security Measures

1. **Session Security**
   - Iron-session encryption
   - HTTPOnly cookies
   - Secure cookie flags

2. **Input Validation**
   - Username sanitization
   - Move validation server-side
   - Message type checking

3. **WebSocket Security**
   - Authentication required
   - Player identity verification
   - Game room isolation

## Performance Considerations

### Optimization Strategies

1. **React Server Components**
   - Reduced bundle size
   - Server-side rendering
   - Streaming HTML

2. **WebSocket Efficiency**
   - Binary message format (future)
   - Connection pooling
   - Heartbeat mechanism

3. **State Management**
   - Minimal re-renders
   - Memoization
   - Lazy loading

4. **Asset Optimization**
   - Sound preloading
   - Image optimization
   - Code splitting

### Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Initial Load | < 3s | ~2s |
| WebSocket Latency | < 100ms | ~50ms |
| Move Processing | < 50ms | ~20ms |
| Memory Usage | < 100MB | ~60MB |

## Scalability Architecture (Current Implementation)

### Horizontal Scaling with Redis

```mermaid
graph TB
    LB[Load Balancer]
    
    subgraph "Next.js Cluster"
        Next1[Next.js Instance 1]
        Next2[Next.js Instance 2]
        NextN[Next.js Instance N]
    end
    
    subgraph "WebSocket Cluster"
        WS1[WS Server 1]
        WS2[WS Server 2]
        WSN[WS Server N]
    end
    
    subgraph "Redis Cluster"
        Redis[(Redis Primary)]
        RedisSub[Redis Pub/Sub]
        RedisReplica[(Redis Replica)]
    end
    
    LB --> Next1
    LB --> Next2
    LB --> NextN
    
    WS1 --> Redis
    WS2 --> Redis
    WSN --> Redis
    
    WS1 -.->|Subscribe| RedisSub
    WS2 -.->|Subscribe| RedisSub
    WSN -.->|Subscribe| RedisSub
    
    Redis --> RedisReplica
```

### Current Scaling Features

1. **Redis-Based State Management** ✅
   - All game state persisted in Redis
   - Action history in BCN format
   - PGN storage for complete game reconstruction

2. **Pub/Sub for Cross-Server Communication** ✅
   - Game state broadcasts via Redis channels
   - Real-time synchronization across servers
   - No sticky sessions required

3. **Efficient Serialization** ✅
   - BCN format reduces bandwidth by ~90%
   - Compact Redis storage
   - Fast game reconstruction

4. **Time Control Persistence** ✅
   - Server-authoritative clocks
   - Persistent timer states in Redis
   - Fischer increment support

## Directory Structure

```
2ban-2chess/
├── app/                    # Next.js App Router
│   ├── api/               # REST API endpoints
│   │   └── auth/         # Authentication routes
│   ├── game/             # Game pages
│   │   └── [id]/        # Dynamic game routes
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
│
├── components/            # React components
│   ├── ChessBoard.tsx    # Main game board
│   ├── SoundControl.tsx  # Audio controls
│   ├── UserInfo.tsx      # User display
│   └── UsernameOverlay.tsx # Login modal
│
├── contexts/              # React contexts
│   └── AuthContext.tsx   # Authentication state
│
├── lib/                   # Core libraries
│   ├── game-types.ts     # TypeScript types
│   ├── ws-client.ts      # WebSocket client
│   ├── sound-manager.ts  # Audio management
│   ├── session.ts        # Session config
│   └── performance-monitor.ts # Metrics
│
├── server/                # Backend services
│   ├── ws-server.ts      # WebSocket server
│   └── redis.ts          # Redis client & operations
│
├── public/                # Static assets
│   └── sounds/           # Audio files
│
├── types/                 # Type definitions
│   └── react-chessground.d.ts
│
└── docs/                  # Documentation
    ├── ARCHITECTURE.md   # This file
    ├── API_REFERENCE.md  # API documentation
    ├── ban-chess-api.md  # BCN format documentation
    └── PROJECT_INDEX.md  # Project overview
```

## Development Workflow

### Local Development

```mermaid
graph LR
    Code[Write Code]
    Test[Run Tests]
    Lint[Lint & Format]
    Build[Build Check]
    Commit[Commit]
    
    Code --> Test
    Test --> Lint
    Lint --> Build
    Build --> Commit
```

### CI/CD Pipeline (Future)

```mermaid
graph LR
    Push[Git Push]
    CI[CI Pipeline]
    Test[Tests]
    Build[Build]
    Deploy[Deploy]
    
    Push --> CI
    CI --> Test
    Test --> Build
    Build --> Deploy
```

## Monitoring & Observability

### Monitoring Stack (Planned)

1. **Application Monitoring**
   - Error tracking (Sentry)
   - Performance monitoring
   - User analytics

2. **Infrastructure Monitoring**
   - Server metrics
   - WebSocket health
   - Database performance

3. **Business Metrics**
   - Active games
   - User engagement
   - Game completion rates

## Future Architecture Enhancements

### Phase 1: Persistence Layer
- PostgreSQL for game history
- User profiles and stats
- Game replay functionality

### Phase 2: Microservices
- Separate auth service
- Dedicated game service
- Analytics service

### Phase 3: Advanced Features
- AI opponent service
- Tournament system
- Real-time spectating

### Phase 4: Mobile Support
- React Native apps
- Progressive Web App
- Responsive design improvements

---

*Last Updated: January 2025*  
*Architecture Version: 3.0.0*  
*Next.js 15 + React 19 with Redis persistence, BCN serialization, and horizontal scaling*