# ♟️ Ban Chess Web (MVP)

An experimental **online platform for playing Ban Chess**, a chess variant where players alternate between banning opponent moves and making their own moves. 

> 📖 **For complete game rules, see [RULES.md](./RULES.md)** - the canonical ruleset for Ban-Chess.

Built with:

- [Next.js 14 (App Router)](https://nextjs.org/) — UI & routing
- [react-chessground](https://github.com/ruilisi/react-chessground) — interactive chessboard
- [ban-chess.ts](https://github.com/bezalel6/ban-chess.ts) — variant engine
- [WebSockets](https://www.npmjs.com/package/ws) — real-time sync between players

This MVP is lightweight, fast to spin up, and ready for rapid iteration.

---

## 🚀 Features

### Core Gameplay
- Create solo practice games or find opponents online
- Real-time move + ban synchronization with WebSockets
- Interactive chessboard powered by **react-chessground**
- Game logic enforced by **ban-chess.ts** with BCN (Ban Chess Notation) serialization
- Support for 15+10 time control (15 minutes + 10 second increment)

### User Experience
- Guest authentication with automatic username generation
- Active game detection on home page with continue/resign options
- Clean resignation flow with inline confirmation (no browser prompts)
- Resizable game board with persistent size preference
- Mobile-responsive design

### Technical Features
- Efficient BCN serialization for moves/bans (50% bandwidth reduction)
- Automatic game cleanup after completion (2-second archival delay)
- WebSocket connection resilience with automatic reconnection
- Redis-backed game state for persistence across server restarts
- Separated concerns: WebSocket server for live games only

---

## 🛠️ Project Structure

```
2ban-2chess/
├─ app/
│  ├─ page.tsx               # Landing page with game status
│  ├─ game/[id]/page.tsx     # Dynamic game board page
│  └─ play/
│     ├─ local/page.tsx      # Solo practice mode
│     └─ online/page.tsx     # Online matchmaking
│
├─ components/
│  ├─ ChessBoard.tsx         # React Chessground wrapper
│  ├─ GameClient.tsx         # Main game UI controller
│  ├─ ActiveGameCard.tsx     # Active game status display
│  └─ game/
│     ├─ GameSidebar.tsx     # Player info & move history
│     ├─ GameStatusPanel.tsx # Game state & controls
│     └─ ResizableBoard.tsx  # Resizable chess board wrapper
│
├─ hooks/
│  └─ useGameState.tsx       # WebSocket game state management
│
├─ lib/
│  ├─ game-types.ts          # TypeScript types & messages
│  └─ game-utils.ts          # Game permission utilities
│
├─ server/
│  └─ ws-server.ts           # WebSocket server with Redis
│
├─ contexts/
│  └─ WebSocketContext.tsx   # WebSocket connection provider
│
└─ package.json
```

---

## ⚡ Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/bezalel6/2ban-2chess.git
cd 2ban-2chess
npm install
```

### 2. Start Development Servers

**Recommended approach:** Run each server in a separate terminal for better log insight and debugging.

**Terminal 1: WebSocket Server**
```bash
npm run dev:ws
```
This starts the WebSocket server on **ws://localhost:8081** with hot reload.

**Terminal 2: Next.js Development Server**
```bash
npm run dev:next
```
This starts the Next.js app at [http://localhost:3000](http://localhost:3000).

**Alternative: Single Command** *(less optimal for debugging)*
```bash
npm run dev
```
Runs both servers concurrently, but logs are mixed and harder to analyze.

> 📖 **For detailed development setup, debugging tips, and best practices, see [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)**

---

## 🎮 Usage

1. Open [http://localhost:3000](http://localhost:3000).
2. Click **"New Game"** → generates unique game ID and room.
3. Copy the URL and share with opponent.
4. On the game page:

   * **Black bans first** - the game starts with Black banning a White move
   * If it's your turn to **ban**, select an opponent's move to disable it (ban lasts one move only)
   * If it's your turn to **move**, make a legal move on the board (cannot be the banned move)
   * Turn order: Black bans → White moves → White bans → Black moves → repeat
5. Game state updates in real time across all clients.

> See [RULES.md](./RULES.md) for detailed game rules, special move handling, and edge cases.

---

## 📡 WebSocket Protocol

### ban-chess.ts Type Definitions

The game uses the following TypeScript types from the ban-chess.ts library:

```ts
interface Move {
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

interface Ban {
  from: string;
  to: string;
}

type Action = 
  | { move: Move }
  | { ban: Ban };

interface ActionResult {
  success: boolean;
  action?: Action;
  san?: string;
  error?: string;
  newFen?: string;
  gameOver?: boolean;
  checkmate?: boolean;
  stalemate?: boolean;
}

interface HistoryEntry {
  turnNumber: number;
  player: 'white' | 'black';
  actionType: 'ban' | 'move';
  action: Ban | Move;
  san?: string;
  fen: string;
  bannedMove?: Ban;
}
```

### Client → Server messages

```ts
type ClientMsg =
  | { type: "create"; gameId: string }
  | { type: "join"; gameId: string }
  | { type: "ban"; gameId: string; ban: Ban }
  | { type: "move"; gameId: string; move: Move };
```

### Server → Client messages

```ts
type ServerMsg =
  | { 
      type: "state"; 
      fen: string; 
      pgn: string; 
      nextAction: "ban" | "move"; 
      legalMoves?: Move[]; 
      legalBans?: Ban[];
      history?: HistoryEntry[];
    }
  | { type: "error"; message: string; error?: string };
```

---

## 🖼️ Board UI

The board is rendered using [react-chessground](https://github.com/ruilisi/react-chessground):

* `fen`: current position
* `movable.dests`: built from `legalMoves` or `legalBans`
* `onMove`: sends `{ type: "move" }` or `{ type: "ban" }` to server

---

## 📜 License

* `ban-chess.ts` is MIT
* `react-chessground` is GPL-3.0
* This project is GPL-3.0 due to `react-chessground` dependency

---

## ✅ Next Steps

* [ ] Add authentication (user accounts, ratings)
* [ ] Persist games in a DB (Postgres + Prisma)
* [ ] Matchmaking / lobby system
* [ ] Spectator mode
* [ ] Analysis board & ban history

---

### Credits

* [ban-chess.ts](https://github.com/bezalel6/ban-chess.ts) by [@bezalel6](https://github.com/bezalel6)
* [react-chessground](https://github.com/ruilisi/react-chessground) (React wrapper around Chessground from Lichess)


---
