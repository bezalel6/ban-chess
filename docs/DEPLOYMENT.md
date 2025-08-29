# Deployment Documentation

## Production Architecture

The application runs on Coolify with the following components:
1. **Next.js App** - Main application server (port 3000)
2. **WebSocket Server** - Real-time game server (port 3001)
3. **Redis** - Session and game state storage

## Docker Configuration

### Standalone Build (IMPORTANT)
The production deployment uses `Dockerfile.standalone` which creates a Next.js standalone build. This is critical for proper routing in production.

**Key differences:**
- **Dockerfile**: Uses `npm start` - ❌ Causes 404 errors in production
- **Dockerfile.standalone**: Runs `server.js` directly - ✅ Correct for standalone mode

### Files:
- `Dockerfile.standalone` - Production Next.js build (multi-stage, optimized)
- `Dockerfile.websocket` - WebSocket server build
- `docker-compose.coolify.yml` - Coolify deployment configuration

## Deployment Process

### 1. Local Build & Test
```bash
# Build production artifacts
npm run build
npm run build:ws

# Test locally
npm start  # Next.js on port 3000
npm run ws-server  # WebSocket on port 3001
```

### 2. Deploy to Coolify
```powershell
# Full deployment with build
.\deploy-to-coolify.ps1

# Deploy without rebuild
.\deploy-to-coolify.ps1 -SkipBuild

# Deploy and trigger Coolify rebuild
.\deploy-to-coolify.ps1 -Trigger
```

### 3. Verify Deployment
```powershell
# Run verification tests
.\scripts\verify-deployment.ps1

# Verbose output for debugging
.\scripts\verify-deployment.ps1 -Verbose
```

## Troubleshooting

### 404 Errors on All Routes
**Cause**: Using wrong Dockerfile or startup command
**Solution**: Ensure `docker-compose.coolify.yml` uses `Dockerfile.standalone`

### WebSocket Connection Failed
**Cause**: WebSocket server not running or wrong URL
**Solution**: Check `NEXT_PUBLIC_WEBSOCKET_URL` environment variable

### Authentication Not Working
**Cause**: Missing `NEXTAUTH_SECRET` in production
**Solution**: Set `NEXTAUTH_SECRET` in Coolify environment variables

## Environment Variables

### Required in Production:
```env
NODE_ENV=production
NEXTAUTH_URL=https://chess.rndev.site
NEXTAUTH_SECRET=<your-secret>
NEXT_PUBLIC_WEBSOCKET_URL=wss://ws-chess.rndev.site
DATABASE_URL=<if-using-database>
```

### Coolify Configuration:
Set these in Coolify's environment variables section for the application.

## Monitoring

### Health Checks:
- App: `https://chess.rndev.site/api/health`
- WebSocket: `wss://ws-chess.rndev.site` (upgrade required response = healthy)

### Logs:
Access via Coolify dashboard or SSH to server:
```bash
docker logs <container-id>
```

## Critical Notes

1. **Always use `Dockerfile.standalone` for production** - The regular Dockerfile will cause routing issues
2. **Standalone mode requires `output: 'standalone'` in next.config.js**
3. **The standalone server runs on `server.js`, not via `npm start`**
4. **Environment variables must be set at build time for `NEXT_PUBLIC_*` variables**