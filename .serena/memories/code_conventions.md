# Code Style and Conventions

## TypeScript Configuration
- **Strict Mode**: Enabled but with `noImplicitAny: false`
- **Target**: ES2017
- **Module**: ESNext with bundler resolution
- **JSX**: Preserve mode for Next.js compilation
- **Path Aliases**: `@/*` maps to project root

## Naming Conventions
- **Files**: camelCase for components (`GameClient.tsx`), kebab-case for pages/routes
- **Components**: PascalCase (`ChessBoard`, `GameClient`)
- **Hooks**: camelCase with `use` prefix (`useGameState`, `useGameTimer`)
- **Types/Interfaces**: PascalCase (`GameState`, `ClientMessage`)
- **Variables/Functions**: camelCase (`handleMove`, `gameState`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_CONFIG`, `WEBSOCKET_URL`)

## React/Next.js Patterns
- **Server Components**: Default for all pages (no 'use client' unless needed)
- **Client Components**: Add `'use client'` pragma when needed
- **Hooks**: Custom hooks in `/hooks` directory
- **Context**: Used for WebSocket and User Role management
- **Suspense**: Used for async boundaries and loading states

## Code Organization
- **Single Responsibility**: Each component/function has one clear purpose
- **Modular Structure**: Separate concerns into different files/modules
- **Type Safety**: Full TypeScript typing, avoid `any` type
- **Error Handling**: Comprehensive error boundaries and try-catch blocks

## ESLint Rules
- `@typescript-eslint/no-explicit-any`: error
- `@typescript-eslint/no-unused-vars`: warn (ignore _ prefixed)
- `no-console`: off (allowed for debugging)
- `react/no-unescaped-entities`: warn
- E2E tests have relaxed rules

## Important Project Rules (from CLAUDE.md)
- **NEVER create parallel components** - Always modify existing files in-place
- **DELETE old code immediately** when replacing functionality
- **No duplicate implementations** - Single source of truth
- Examples to avoid:
  - Creating `GameClientV2` instead of updating `GameClient`
  - Creating `AuthProviderNext` instead of updating `AuthProvider`