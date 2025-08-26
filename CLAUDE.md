# Next.js 14 Project Configuration

## Project Context

This is a Next.js 14 application (2ban-2chess) using:

- **App Router** (not Pages Router)
- **React 18** with Server Components by default
- **TypeScript** for type safety
- **Server Actions** for mutations
- **WebSocket server** for real-time game communication

## Security Best Practices

1. **Always validate Server Actions input** with Zod or similar
2. **Authenticate and authorize** in Server Actions and middleware
3. **Sanitize user input** before rendering
4. **Use environment variables correctly**:
   - `NEXT_PUBLIC_*` for client-side
   - Others stay server-side only
5. **Implement rate limiting** for public actions
6. **Configure CSP headers** in next.config.js

## Performance Optimization

1. **Use Server Components** to reduce bundle size
2. **Implement streaming** with Suspense boundaries
3. **Optimize images** with next/image component
4. **Use dynamic imports** for code splitting
5. **Configure proper caching** strategies
6. **Monitor Core Web Vitals**

## File Conventions

Always use these file names in the `app/` directory:

- `page.tsx` - Route page component
- `layout.tsx` - Shared layout wrapper
- `loading.tsx` - Loading UI (Suspense fallback)
- `error.tsx` - Error boundary (must be Client Component)
- `not-found.tsx` - 404 page
- `route.ts` - API route handler
- `template.tsx` - Re-rendered layout
- `default.tsx` - Parallel route fallback

## Data Fetching Patterns

```typescript
// ✅ GOOD: Fetch in Server Component
async function ProductList() {
  const products = await db.products.findMany();
  return <div>{/* render products */}</div>;
}

// ❌ AVOID: Client-side fetching when not needed
'use client';
function BadPattern() {
  const [data, setData] = useState(null);
  useEffect(() => { fetch('/api/data')... }, []);
}
```

## Linting and Code Quality

### Available Commands

```bash
# Type checking
npm run type-check      # Run TypeScript type checking

# Linting
npm run lint            # Run ESLint to check for errors
npm run lint:fix        # Auto-fix ESLint issues where possible

# Formatting
npm run format          # Format all files with Prettier
npm run format:check    # Check if files are properly formatted

# Combined commands
npm run check-all       # Run type-check, lint, and format:check
npm run fix-all         # Run lint:fix and format
```

### Configuration Files

- **TypeScript**: `tsconfig.json` - Strict mode enabled
- **ESLint**: `eslint.config.mjs` - ESLint v9 flat config with TypeScript rules
- **Prettier**: `.prettierrc.json` - Windows-compatible formatting (CRLF endings)
- **Husky**: `.husky/pre-commit` - Runs lint-staged on commit
- **Lint-staged**: `.lintstagedrc.json` - Runs ESLint and Prettier on staged files

### Key Rules

- **No explicit `any` types**: TypeScript's `strict` mode and ESLint's `@typescript-eslint/no-explicit-any` rule
- **Unused variables**: Must prefix with underscore (e.g., `_unusedVar`)
- **Console statements**: Only `console.warn` and `console.error` allowed
- **Windows line endings**: CRLF configured in Prettier

## Development Commands

```bash
npm run dev          # Start dev server with WebSocket server
npm run dev:next     # Start Next.js dev server only
npm run dev:ws       # Start WebSocket server only
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript validation
```

## Testing Approach

- **Unit tests**: Jest/Vitest for logic and utilities
- **Component tests**: React Testing Library
- **E2E tests**: Playwright or Cypress
- **Server Components**: Test data fetching logic separately
- **Server Actions**: Mock and test validation/business logic

## Project Structure

```text
app/
├── game/
│   └── [id]/        # Dynamic game routes
│       └── page.tsx
├── api/             # API routes (if needed)
├── layout.tsx       # Root layout
├── page.tsx         # Home page
└── globals.css      # Global styles

components/          # React components
├── ChessBoard.tsx
└── SoundControl.tsx

lib/                # Utilities and types
├── game-types.ts
├── sound-manager.ts
└── ws-client.ts

server/             # Backend services
└── ws-server.ts    # WebSocket server
```

## Server Components First

- **Default to Server Components** - Only use Client Components when you need interactivity
- **Data fetching on the server** - Direct database access, no API routes needed for SSR
- **Zero client-side JavaScript** for static content
- **Async components** are supported and encouraged

## Caching Strategy

- Use `fetch()` with Next.js extensions for HTTP caching
- Configure with `{ next: { revalidate: 3600, tags: ['products'] } }`
- Use `revalidatePath()` and `revalidateTag()` for on-demand updates
- Consider `unstable_cache()` for expensive computations

## Server Action with Form

```typescript
// actions.ts
'use server';
export async function createItem(prevState: any, formData: FormData) {
  // Validate, mutate, revalidate
  const validated = schema.parse(Object.fromEntries(formData));
  await db.items.create({ data: validated });
  revalidatePath('/items');
}

// form.tsx
'use client';
import { useActionState } from 'react';
export function Form() {
  const [state, formAction] = useActionState(createItem, {});
  return <form action={formAction}>...</form>;
}
```

## Optimistic Updates

```typescript
'use client';
import { useOptimistic } from 'react';
export function OptimisticList({ items, addItem }) {
  const [optimisticItems, addOptimisticItem] = useOptimistic(
    items,
    (state, newItem) => [...state, newItem]
  );
  // Use optimisticItems for immediate UI update
}
```

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Build succeeds locally
- [ ] Tests pass
- [ ] Security headers configured
- [ ] Error tracking setup (Sentry)
- [ ] Analytics configured
- [ ] SEO metadata in place
- [ ] Performance monitoring active

## Debugging Tips

1. Check React Developer Tools for Server/Client components
2. Use `console.log` in Server Components (appears in terminal)
3. Check Network tab for RSC payloads
4. Verify caching with `x-nextjs-cache` headers
5. Use `{ cache: 'no-store' }` to debug caching issues

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)