# 🏗️ 2ban-2chess Architecture Documentation

## System Overview

2ban-2chess is a real-time multiplayer chess variant platform built with a modern web stack. The architecture follows a client-server model with WebSocket-based real-time communication.

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
        WS[WebSocket Server]
        Queue[Matchmaking Queue]
        Rooms[Game Rooms]
    end
    
    subgraph "Game Logic Layer"
        Engine[ban-chess.ts Engine]
        State[Game State Manager]
        Validator[Move Validator]
    end
    
    Browser --> RC
    RC --> Chess
    RC --> Sound
    RC --> Next
    RC -.->|WebSocket| WS
    
    Next --> Auth
    Auth --> Session
    
    WS --> Queue
    WS --> Rooms
    Rooms --> Engine
    Engine --> State
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

## Technology Stack Details

### Frontend Stack

| Component | Technology | Purpose | Version |
|-----------|------------|---------|---------|
| Framework | Next.js | React framework with SSR | 14.2.18 |
| UI Library | React | Component-based UI | 18.x |
| Chess UI | react-chessground | Interactive chess board | 1.5.0 |
| Styling | Tailwind CSS | Utility-first CSS | 4.1.12 |
| Audio | Howler.js | Web audio API wrapper | 2.2.4 |
| Type Safety | TypeScript | Static typing | 5.x |

### Backend Stack

| Component | Technology | Purpose | Version |
|-----------|------------|---------|---------|
| Runtime | Node.js | JavaScript runtime | 20.x |
| WebSocket | ws | WebSocket server | 8.18.0 |
| Game Logic | ban-chess.ts | Chess variant engine | 1.1.3 |
| Session | iron-session | Encrypted sessions | 8.0.4 |
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
// In-Memory State
interface ServerState {
  games: Map<string, GameRoom>;
  queue: Player[];
  authenticatedPlayers: Map<WebSocket, Player>;
  playerToGame: Map<string, string>;
}

// Game Room State
interface GameRoom {
  game: BanChess;
  players: Map<string, PlayerInfo>;
  whitePlayerId?: string;
  blackPlayerId?: string;
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

## Scalability Architecture

### Horizontal Scaling Plan

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
    
    Redis[(Redis)]
    DB[(PostgreSQL)]
    
    LB --> Next1
    LB --> Next2
    LB --> NextN
    
    Next1 --> Redis
    Next2 --> Redis
    NextN --> Redis
    
    WS1 --> Redis
    WS2 --> Redis
    WSN --> Redis
    
    Redis --> DB
```

### Scaling Considerations

1. **Session Management**
   - Move from in-memory to Redis
   - Sticky sessions for WebSocket

2. **Game State**
   - Distributed game state with Redis
   - Database persistence for history

3. **Load Balancing**
   - HTTP load balancer for Next.js
   - WebSocket-aware load balancer

4. **Caching**
   - CDN for static assets
   - Redis for session cache
   - Browser caching strategies

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
│   └── ws-server.ts      # WebSocket server
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

*Last Updated: 2025-08-26*  
*Architecture Version: 1.0.0*