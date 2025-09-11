# Suggested Commands for Development

## Development Servers (Recommended: Separate Terminals)
```bash
# Terminal 1: WebSocket server with hot reload
npm run dev:ws

# Terminal 2: Next.js development server
npm run dev:next

# Alternative: Both servers (less optimal for debugging)
npm run dev
```

## Code Quality & Validation
```bash
# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Both type-check and lint
npm run analyze

# Build for production
npm run build
```

## Testing
```bash
# Run all E2E tests
npm run test

# Interactive test UI
npm run test:ui

# Specific test suites
npm run test:auth         # Authentication tests
npm run test:game         # Game functionality tests
npm run test:multiplayer  # Multiplayer tests
npm run test:a11y         # Accessibility tests

# Test with visible browser
npm run test:headed

# Show test report
npm run test:report
```

## Database Commands
```bash
# Generate Prisma client
npx prisma generate

# Reset database
npm run db:reset

# Seed database
npm run db:seed

# Fix game results format
npm run db:fix-results
```

## Windows-Specific Utilities
```bash
# Find zombie processes
npm run find-zombies

# Kill zombie processes
npm run kill-zombies
```

## Git Commands (Windows)
```bash
# Check status
git status

# Create feature branch
git checkout -b feature/your-feature

# Stage changes
git add .

# Commit with message
git commit -m "feat: your message"

# Push to remote
git push -u origin feature/your-feature
```

## Production Commands
```bash
# Start production server
npm start

# Run WebSocket server only
npm run ws-server
```