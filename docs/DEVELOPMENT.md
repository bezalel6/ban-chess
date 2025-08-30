# Development Guide

This guide covers development setup, best practices, and debugging approaches for the 2 Ban 2 Chess application.

## 🚀 Quick Start

### Recommended Development Setup

**Run servers in separate terminals for optimal development experience:**

**Terminal 1: WebSocket Server**

```bash
npm run dev:ws
```

**Terminal 2: Next.js Development Server**

```bash
npm run dev:next
```

### Why Separate Terminals?

Running servers in separate terminals provides significant advantages over the combined `npm run dev` approach:

#### **🔍 Clear Log Separation**

- **WebSocket logs** appear in Terminal 1 with clear labeling
- **Next.js logs** appear in Terminal 2 without interference
- No mixed output that makes debugging difficult

#### **🎯 Targeted Debugging**

- Restart individual servers without affecting the other
- Monitor specific server performance and resource usage
- Isolate issues to frontend vs backend immediately

#### **⚡ Development Efficiency**

- Quick identification of which server has issues
- Separate error tracking and stack traces
- Independent server lifecycle management

## 🔧 Development Commands

### Server Management

```bash
# Recommended approach
npm run dev:ws          # WebSocket server with hot reload
npm run dev:next        # Next.js development server

# Alternative (less optimal)
npm run dev             # Both servers concurrently

# Production
npm run ws-server       # WebSocket server (production mode)
npm run build           # Build Next.js app
npm run start           # Production Next.js server
```

### Code Quality

```bash
npm run lint            # ESLint validation
npm run type-check      # TypeScript compilation check
npm run analyze         # Run both lint and type-check
```

### Testing

```bash
npm run test            # Playwright E2E tests
npm run test:ui         # Interactive test runner
npm run test:debug      # Debug mode for tests
```

## 📊 Log Analysis

### WebSocket Server Logs (Terminal 1)

Look for:

- `[WebSocket] Server started on port 8081`
- `Player authenticated: username`
- `Action in game gameId: move/ban`
- `Matched player1 vs player2`

### Next.js Server Logs (Terminal 2)

Look for:

- `Ready - started server on 0.0.0.0:3000`
- Hot reload notifications
- Compilation errors/warnings
- API route debugging

## 🐛 Common Issues & Debugging

### WebSocket Connection Problems

**Symptoms:** Players can't join games, moves don't sync
**Check Terminal 1 for:**

- Port conflicts on 8081
- Authentication failures
- CORS issues

### Next.js Build Issues

**Symptoms:** UI not loading, TypeScript errors
**Check Terminal 2 for:**

- Compilation errors
- Missing dependencies
- Hot reload failures

### Game Logic Issues

**Check both terminals for:**

- ban-chess.ts validation errors
- Invalid move/ban attempts
- Game state synchronization problems

### Redis Connection Issues (Production)

**Symptoms:** WebSocket server fails to start, authentication errors
**Common errors and solutions:**

1. **`NOAUTH Authentication required`**
   - **Cause:** Redis requires password but none provided
   - **Solution:** Set `REDIS_URL` with password in environment:
     ```bash
     REDIS_URL=redis://:your-password@redis:6379
     ```

2. **`ERR invalid password`**
   - **Cause:** Wrong password provided
   - **Solution:** Verify Redis password is correct

3. **`Connection refused`**
   - **Cause:** Redis not running or wrong host/port
   - **Solution:** Check Redis is running and accessible

4. **Setting Redis Password in Production**
   - Never commit passwords to repository
   - Set in deployment environment variables
   - Format: `redis://:password@host:port` or `redis://username:password@host:port`

## 🧪 Testing Setup

For running E2E tests, ensure both servers are running:

```bash
# Terminal 1
npm run dev:ws

# Terminal 2
npm run dev:next

# Terminal 3 (for tests)
npm run test
```

## 📈 Performance Monitoring

### WebSocket Server Performance

Monitor Terminal 1 for:

- Connection count per game
- Memory usage patterns
- Response times for actions

### Next.js Performance

Monitor Terminal 2 for:

- Bundle size warnings
- Hydration issues
- Component render performance

## 🔄 Hot Reload Behavior

- **WebSocket Server (`dev:ws`)**: Automatically restarts on TypeScript changes
- **Next.js (`dev:next`)**: Fast Refresh for React components, full restart for config changes

## 💡 Pro Tips

1. **Use descriptive terminal titles** to distinguish servers easily
2. **Keep terminals side by side** for simultaneous monitoring
3. **Use terminal multiplexers** (tmux/screen) for persistent sessions
4. **Monitor both terminals** during critical debugging sessions
5. **Restart individual servers** when making significant changes

This approach scales better as the application grows and makes collaborative debugging much more efficient.
