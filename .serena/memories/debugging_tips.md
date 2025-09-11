# Debugging Tips for 2ban-2chess

## Development Setup for Debugging
Always use separate terminals for better debugging:
- Terminal 1: `npm run dev:ws` - WebSocket server logs
- Terminal 2: `npm run dev:next` - Next.js server logs

## Common Issues and Solutions

### WebSocket Connection Issues
- Check if WebSocket server is running on port 3001
- Verify NEXT_PUBLIC_WEBSOCKET_URL environment variable
- Check browser console for connection errors
- Look for CORS issues in production

### Game State Issues
- Check Redis container is running: `docker ps`
- Verify game state in WebSocket server logs
- Use browser DevTools Network tab to inspect WS messages
- Check for BCN serialization errors

### Authentication Issues
- Verify OAuth credentials in environment variables
- Check NextAuth configuration in `/lib/auth.ts`
- Look for session errors in browser console
- Test with Guest mode to isolate OAuth issues

### Build/Type Errors
- Run `npm run type-check` to identify TypeScript issues
- Check for missing dependencies: `npm install`
- Verify Prisma client generation: `npx prisma generate`
- Clear Next.js cache: `rm -rf .next` (or delete .next folder)

### Test Failures
- Run tests in headed mode: `npm run test:headed`
- Use test UI for debugging: `npm run test:ui`
- Check for timing issues in E2E tests
- Verify test environment setup

### Performance Issues
- Check for React re-renders with React DevTools
- Monitor WebSocket message frequency
- Profile with Chrome DevTools Performance tab
- Check for memory leaks in long-running games

## Debugging Tools
- **React DevTools**: Component tree and state inspection
- **Chrome DevTools**: Network, Console, Performance tabs
- **WebSocket Frame Inspector**: Monitor WS messages
- **Redux DevTools**: If using Redux (not in current setup)

## Logging
- Server logs: Check terminal running `npm run dev:ws`
- Client logs: Browser console
- Build logs: Output from `npm run build`
- Test logs: Playwright report with `npm run test:report`

## Windows-Specific Issues
- Use PowerShell or Git Bash for better compatibility
- Check for zombie processes: `npm run find-zombies`
- Kill stuck processes: `npm run kill-zombies`
- Ensure Redis Docker container has proper permissions