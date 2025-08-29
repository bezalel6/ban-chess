# CLAUDE.md – Next.js 15 + React 19 Project Guide

⚠️ **Critical Instructions:**
1. If you discover any **misalignment or contradiction** between this document and the actual codebase (e.g., outdated patterns, different dependencies, conflicting conventions), **immediately halt the task you are working on** and **alert the team**. Do not proceed until the discrepancy is resolved.
2. When implementing new features or refactoring existing ones, **do not create parallel components with new names** (e.g., `GameClientV2`, `SimplifiedServer`). This causes long-term confusion and leaves old problematic logic behind. Instead, the rule is: **delete and replace**. Always clean up the old implementation as part of the change.

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
```bash
# Install deps
npm install

# Dev server
npm run dev

# Lint
npm run lint

# Type check
npm run type-check

# Build
npm run build

# Start production
npm start
```

---

## 9. Tailwind Configuration
**tailwind.config.js**
```js
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4f46e5",
          light: "#6366f1",
          dark: "#3730a3",
        },
      },
      borderRadius: {
        xl: "1rem",
      },
    },
  },
  plugins: [],
}
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

