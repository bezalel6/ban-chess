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

## 🚀 Features (MVP)

- Create a Ban Chess game and share link with opponent
- Join existing games via URL
- Real-time move + ban synchronization with WebSockets
- Interactive chessboard powered by **react-chessground**
- Game logic enforced by **ban-chess.ts**
- State broadcasted to both players (FEN, PGN, next action)

---

## 🛠️ Project Structure

```
ban-chess-web/
├─ app/
│  ├─ page.tsx               # Landing page (create new game)
│  └─ game/[id]/page.tsx     # Game board page
│
├─ components/
│  └─ ChessBoard.tsx         # React Chessground wrapper
│
├─ lib/
│  ├─ ws-client.ts           # WebSocket client hook
│  └─ game-types.ts          # Shared WS message types
│
├─ server/
│  └─ ws-server.ts           # Node WebSocket server with ban-chess.ts
│
├─ package.json
└─ tsconfig.json
```

---

## ⚡ Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/bezalel6/2ban-2chess.git
cd 2ban-2chess
npm install
```

### 2. Run WebSocket Server

```bash
npx ts-node server/ws-server.ts
```

This starts a WebSocket server on **ws://localhost:8081**.

### 3. Run Next.js App

```bash
npm run dev
```

App will be available at [http://localhost:3000](http://localhost:3000).

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
