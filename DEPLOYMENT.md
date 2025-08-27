# Deployment Guide for 2Ban 2Chess

## Issue: "Connecting to game server..." Infinite Loop

### Problem
Users get stuck at "Connecting to game server..." because the WebSocket URL is hardcoded to `ws://localhost:8081`, which doesn't work in production.

### Solution

#### For Local Development
1. Ensure both servers are running:
   ```bash
   npm run dev
   ```
   This starts both the Next.js app (port 3000) and WebSocket server (port 8081).

2. Verify `.env.local` contains:
   ```
   NEXT_PUBLIC_WS_URL=ws://localhost:8081
   ```

#### For Production Deployment

**Option 1: Deploy WebSocket Server Separately**

1. Deploy the WebSocket server to a service like:
   - Railway.app
   - Render.com
   - Fly.io
   - Heroku
   - AWS EC2/ECS

2. Update your production environment variables:
   ```
   NEXT_PUBLIC_WS_URL=wss://your-websocket-server.com
   ```

3. Example WebSocket server deployment file (`server/index.ts`):
   ```typescript
   import './ws-server';
   ```

4. Add a `package.json` script for production WebSocket server:
   ```json
   "start:ws": "tsx server/ws-server.ts"
   ```

**Option 2: Use a WebSocket Service**
- Pusher
- Ably
- Socket.io with managed hosting
- Supabase Realtime

### Quick Fix for Testing

If you need to test the deployed app with WebSocket functionality:

1. Run the WebSocket server locally:
   ```bash
   npm run ws-server
   ```

2. Use ngrok to expose it:
   ```bash
   ngrok http 8081
   ```

3. Update the production environment variable temporarily:
   ```
   NEXT_PUBLIC_WS_URL=wss://your-ngrok-url.ngrok.io
   ```

### Environment Variables Setup

#### Vercel Deployment
1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add: `NEXT_PUBLIC_WS_URL` with your WebSocket server URL

#### Other Platforms
Set the environment variable according to your platform's documentation.

### Verification Steps

1. Check if WebSocket server is running:
   - Open browser console
   - Look for WebSocket connection attempts
   - Should see connection to your configured URL

2. Test locally first:
   ```bash
   npm run dev
   ```
   - Join queue
   - Match should redirect properly
   - Game should load without connection issues

3. Common issues:
   - CORS: Ensure WebSocket server allows connections from your domain
   - SSL: Use `wss://` for production (not `ws://`)
   - Firewall: Ensure WebSocket port is open

### Code Changes Made

1. Added WebSocket URL to `.env.local`
2. Removed debug console.log statements from `lib/ws-hooks-optimized.ts`
3. Fixed ESLint issues in WebSocket hooks

### Next Steps

1. Choose a WebSocket hosting solution
2. Deploy the `server/ws-server.ts` file
3. Update `NEXT_PUBLIC_WS_URL` in production
4. Test the full flow in production