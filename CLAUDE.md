# CLAUDE.md – Next.js 15 + React 19 Project Guide

⚠️ **Critical Instructions:**

## 🔴 DELETE AND REPLACE RULE - NEVER CREATE PARALLEL COMPONENTS 🔴

**THIS IS THE MOST IMPORTANT RULE IN THIS DOCUMENT**

When changing ANY existing functionality:

- **NEVER** create new files with similar names (e.g., `AuthProvider2.tsx`, `AuthProviderNext.tsx`, `NewAuthProvider.tsx`)
- **NEVER** keep old implementations alongside new ones
- **ALWAYS** modify existing files in-place when changing functionality
- **ALWAYS** delete old code immediately when replacing it

### Examples of violations to avoid:

- ❌ Creating `GameClientV2` instead of updating `GameClient`
- ❌ Creating `AuthProviderNext` instead of updating `AuthProvider`
- ❌ Creating `SimplifiedServer` instead of updating the existing server
- ❌ Creating `NewWebSocketHandler` instead of updating `WebSocketHandler`

### Why this matters:

- Prevents confusion about which version is current
- Eliminates technical debt immediately
- Avoids old problematic logic lingering in the codebase
- Maintains a single source of truth

### Before making changes:

1. **STOP** - Are you about to create a new file with a similar name to an existing one?
2. **THINK** - Should you be modifying the existing file instead?
3. **ACT** - Update the existing file in-place, don't create duplicates

---

## Other Critical Instructions:

1. If you discover any **misalignment or contradiction** between this document and the actual codebase (e.g., outdated patterns, different dependencies, conflicting conventions), **immediately halt the task you are working on** and **alert the team**. Do not proceed until the discrepancy is resolved.

---

## 1. Context

- Framework: **Next.js 15 (App Router only)**
- Language: **TypeScript**
- Runtime: **React 19 (required)**
- Styling: **Tailwind CSS**
- No `pages/` or legacy patterns.

---

## 2. Breaking Changes from Next.js 14 → 15

- **Server Actions:** stable in `app/`, no longer experimental.
- **Data Fetching:**
  - `cookies()` and `headers()` are now **async**.
  - ✅ Keep `params` / `searchParams` usage synchronous (previous docs were misleading).
- **Middleware & Edge APIs:** stricter runtime validation.
- **Partial Prerendering:** available for hybrid SSR/SSG.
- **`unstable_cache`:** still experimental, usage optional.

---

## 3. File Conventions

- `app/` – routing, layouts, pages, API routes.
- `components/` – UI components.
- `lib/` – shared utilities.
- `hooks/` – custom React hooks.
- `styles/` – Tailwind config and globals.
- `tests/` – unit/integration tests.

---

## 4. Data Fetching Patterns

- **Server Components (default):**
  ```tsx
  export default async function Page() {
    const data = await getData();
    return <UI data={data} />;
  }
  ```
- **Client Components:** add `'use client'` pragma.
- **Suspense streaming:** wrap async boundaries.
- **Cache & Revalidation:**
  ```tsx
  export const revalidate = 60; // ISR every 60s
  ```

---

## 5. Security Best Practices

1. Use **NextAuth** or trusted providers for auth.
2. Validate & sanitize all user input.
3. Use **Helmet / secure headers** (`next-safe`) for CSP, XSS, HSTS.
4. Enable HTTPS and secure cookies.
5. Regular dependency updates.

---

## 6. Performance Optimization

- Use **React Suspense + streaming** where possible.
- Apply **Partial Prerendering** for mixed static/dynamic routes.
- Optimize images with `next/image`.
- Use `dynamic()` with `ssr: false` for client-only components.
- Avoid large client bundles (analyze with `next build --analyze`).

---

## 7. Testing & Debugging

- **Unit tests:** Jest + React Testing Library.
- **E2E tests:** Playwright or Cypress.
- **Linting:** ESLint + TypeScript strict mode.
- **Error tracking:** Sentry or LogRocket.
- **Profiling:** React DevTools, Chrome DevTools.

---

## 8. Development Commands

### Recommended Development Setup (Separate Terminals)

```bash
# Install deps
npm install

# Terminal 1: WebSocket server with detailed logs
npm run dev:ws

# Terminal 2: Next.js development server
npm run dev:next
```

### Alternative Commands

```bash
# Single command (less optimal for debugging)
npm run dev

# Production WebSocket server only
npm run ws-server

# Linting and validation
npm run lint
npm run type-check

# Build and production
npm run build
npm start
```

### Benefits of Separate Terminals

- **Clear log separation**: WebSocket and Next.js logs don't interfere
- **Specific debugging**: Restart individual servers without affecting the other
- **Performance monitoring**: Monitor each server's resource usage independently
- **Error isolation**: Quickly identify whether issues are frontend or backend

---

## 9. Tailwind Configuration

**tailwind.config.js**

```js
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#4f46e5',
          light: '#6366f1',
          dark: '#3730a3',
        },
      },
      borderRadius: {
        xl: '1rem',
      },
    },
  },
  plugins: [],
};
```

---

## 10. Deployment Checklist

- ✅ Run `npm run build` locally.
- ✅ Verify environment variables (`.env.production`).
- ✅ Check `robots.txt` and `sitemap.xml`.
- ✅ Configure caching/CDN headers.
- ✅ Confirm HTTPS and CSP headers.

---

## 11. Resources

- [Next.js 15 Docs](https://nextjs.org/docs)
- [React 19 RFCs](https://github.com/reactjs/rfcs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright](https://playwright.dev/)

- While still requiring some tweaks, consolidation, etc. This is the situation we need to think of when it comes to the sound effects locally available on the server:\

/sounds/
Silence.mp3 futuristic/ nes/ pirate/ standard/
Silence.ogg instrument/ other/ robot/ woodland/
default/ lisp/ piano/ sfx/
