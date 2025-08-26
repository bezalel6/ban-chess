# Next.js 15 Chess Platform Refactoring Prompt

## Mission Statement
Refactor the 2ban-2chess real-time online chess platform to fully leverage Next.js 15's best practices, patterns, and conventions while maintaining 100% feature parity and enhancing performance, type safety, and developer experience.

## Current Architecture Assessment

### Technology Stack
- **Next.js**: 15.1.4 (App Router)
- **React**: 19.0.0
- **TypeScript**: ^5.0.0
- **Authentication**: iron-session
- **Real-time**: WebSocket with custom hooks
- **Chess Engine**: ban-chess.ts
- **UI**: Tailwind CSS with custom components

### Key Features to Preserve
1. **Real-time multiplayer chess** with WebSocket connections
2. **User authentication** with session management
3. **Game rooms and matchmaking** system
4. **Move history and game status** tracking
5. **Ban chess variant** implementation
6. **Sound system** with Howler.js
7. **Responsive UI** with dark theme

---

## PHASE 1: Architecture Analysis & Migration Planning

### 1.1 Current State Audit
**Objective**: Systematically analyze all components for Next.js 15 compliance

**Tasks**:
- [ ] **Async Request API Audit**: Identify all usages of `params`, `searchParams`, `cookies()`, `headers()` that need async conversion
- [ ] **Server/Client Boundary Analysis**: Map all components to optimal Server vs Client Component usage
- [ ] **Auth System Assessment**: Document current hybrid API/Server Action approach for consolidation
- [ ] **Error Handling Review**: Identify gaps in error boundaries and loading states
- [ ] **Performance Bottleneck Identification**: Analyze bundle size, hydration patterns, and caching strategies

**Deliverables**:
- Complete compliance assessment report
- Component migration priority matrix
- Risk assessment with mitigation strategies
- Performance baseline metrics

**Validation Criteria**:
- All non-compliant patterns documented
- Migration complexity scored (1-5 scale)
- Zero breaking changes identified

### 1.2 Migration Strategy Design
**Objective**: Create phased approach with rollback capabilities

**Tasks**:
- [ ] **Dependency Impact Map**: Chart component interdependencies
- [ ] **Feature Flag Strategy**: Plan for safe incremental rollout
- [ ] **Testing Strategy**: Define validation approach for each phase
- [ ] **Rollback Procedures**: Document safe reversion paths

---

## PHASE 2: Core Infrastructure Refactoring

### 2.1 Authentication System Modernization
**Current Issues**:
- Mixed API routes (`/api/auth/login/route.ts`) and Server Actions (`/app/actions/auth.ts`)
- Inconsistent error handling between approaches
- Session management scattered across multiple files

**Refactoring Tasks**:
- [ ] **Consolidate to Server Actions**: Remove API routes, use Server Actions exclusively
- [ ] **Async Cookie Handling**: Update `lib/auth.ts` to properly await `cookies()`
- [ ] **Form State Management**: Implement proper `useActionState` patterns
- [ ] **Session Persistence**: Enhance session management with proper streaming
- [ ] **Type Safety**: Strengthen auth types with discriminated unions

**Implementation Requirements**:
```typescript
// Target pattern for auth actions
'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export async function loginAction(
  prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | void> {
  const cookieStore = await cookies();
  // Implementation with proper error handling
}
```

**Validation Criteria**:
- All auth flows work identically to current implementation
- Session persistence maintained across page reloads
- Error states properly displayed in UI
- TypeScript strict mode compliance

### 2.2 Async Request API Migration
**Current Issues**:
- `app/game/[id]/page.tsx` correctly awaits params but other areas may not
- Headers and cookies usage may need async updates

**Refactoring Tasks**:
- [ ] **Params Async Conversion**: Ensure all `params` access is awaited
- [ ] **SearchParams Updates**: Convert any synchronous searchParams usage
- [ ] **Server Component Optimization**: Leverage async capabilities for data fetching
- [ ] **Metadata Generation**: Update dynamic metadata to use async params

**Implementation Requirements**:
```typescript
// Target pattern
export default async function Page({ 
  params, 
  searchParams 
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { id } = await params;
  const search = await searchParams;
  // Implementation
}
```

### 2.3 Error Boundary Enhancement
**Current State**: Basic error.tsx in game route, needs systematic approach

**Refactoring Tasks**:
- [ ] **Global Error Boundary**: Implement app-level error handling
- [ ] **Route-Specific Error States**: Enhance existing error.tsx files
- [ ] **WebSocket Error Recovery**: Improve connection failure handling
- [ ] **User-Friendly Error Messages**: Replace technical errors with user-actionable messages
- [ ] **Error Reporting Integration**: Add structured error logging

**Implementation Requirements**:
- Graceful WebSocket reconnection on network failures
- Game state recovery mechanisms
- Clear user feedback for all error scenarios
- Automatic retry logic where appropriate

---

## PHASE 3: Performance & Real-time Optimization

### 3.1 Server/Client Component Optimization
**Current Analysis**: Some components may be unnecessarily client-side

**Optimization Tasks**:
- [ ] **Static Components**: Move pure display components to Server Components
- [ ] **Selective Hydration**: Minimize client-side JavaScript bundle
- [ ] **Streaming Implementation**: Add Suspense boundaries for progressive loading
- [ ] **Metadata Optimization**: Implement proper SEO and social sharing metadata

**Target Patterns**:
```typescript
// Server Component for static game info
async function GameMetadata({ gameId }: { gameId: string }) {
  const gameInfo = await getGameInfo(gameId);
  return <GameInfoDisplay {...gameInfo} />;
}

// Client Component only for interactive elements
'use client';
function InteractiveBoard({ gameState, onMove }) {
  // Real-time interaction logic
}
```

### 3.2 WebSocket Pattern Enhancement
**Current State**: Solid useSyncExternalStore implementation in `ws-hooks.ts`

**Enhancement Tasks**:
- [ ] **Connection Pooling**: Optimize WebSocket resource usage
- [ ] **Message Queuing**: Handle offline state with message buffering
- [ ] **Reconnection Strategy**: Implement exponential backoff
- [ ] **Performance Monitoring**: Add connection quality metrics
- [ ] **Error Recovery**: Enhance automatic reconnection logic

**Implementation Requirements**:
- Seamless reconnection during gameplay
- Message ordering guarantees
- Bandwidth optimization for mobile users
- Connection state visibility to users

### 3.3 Caching Strategy Implementation
**Current Gap**: Limited caching implementation

**Caching Tasks**:
- [ ] **Static Asset Optimization**: Implement proper cache headers
- [ ] **Game State Caching**: Use React cache for game data
- [ ] **User Session Caching**: Optimize session lookup performance
- [ ] **Route Caching**: Implement appropriate cache strategies per route
- [ ] **CDN Optimization**: Configure edge caching where beneficial

**Implementation Requirements**:
```typescript
// Target caching patterns
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

const getCachedGameState = cache(async (gameId: string) => {
  return await fetchGameState(gameId);
});

const getStaticGameInfo = unstable_cache(
  async (gameId: string) => getGameInfo(gameId),
  ['game-info'],
  { revalidate: 3600 }
);
```

---

## PHASE 4: TypeScript & Modern React Patterns

### 4.1 Type Safety Enhancement
**Current State**: Good TypeScript usage but opportunities for improvement

**Enhancement Tasks**:
- [ ] **Discriminated Unions**: Enhance GameState and message types
- [ ] **Generic Type Helpers**: Create reusable type utilities
- [ ] **Zod Integration**: Add runtime type validation for WebSocket messages
- [ ] **Strict Mode Compliance**: Eliminate any remaining `any` types
- [ ] **Component Prop Types**: Strengthen component interface definitions

**Implementation Requirements**:
```typescript
// Target type patterns
type WebSocketMessage = 
  | { type: 'move'; payload: Move }
  | { type: 'ban'; payload: Ban }
  | { type: 'state'; payload: GameState }
  | { type: 'error'; payload: { message: string; code: string } };

interface StrictGameState {
  readonly fen: string;
  readonly turn: 'white' | 'black';
  readonly status: GameStatus;
  readonly players: Readonly<Record<'white' | 'black', string | null>>;
}
```

### 4.2 React 19 Feature Adoption
**Current State**: Using React 19 but not all new features leveraged

**Adoption Tasks**:
- [ ] **useActionState Migration**: Complete migration from useFormState
- [ ] **use() Hook Optimization**: Enhance promise handling patterns
- [ ] **Concurrent Features**: Implement time slicing for complex game state updates
- [ ] **Automatic Batching**: Optimize state updates for better performance
- [ ] **Error Boundary Integration**: Leverage React 19 error handling improvements

### 4.3 Custom Hook Optimization
**Current State**: Good WebSocket hooks, room for improvement

**Optimization Tasks**:
- [ ] **Hook Composition**: Break down complex hooks into focused utilities
- [ ] **Memoization Strategy**: Optimize expensive operations
- [ ] **Custom Hook Testing**: Add comprehensive hook test coverage
- [ ] **Performance Monitoring**: Add hooks for performance tracking

---

## PHASE 5: Validation & Polish

### 5.1 Feature Parity Validation
**Critical Requirement**: 100% feature preservation

**Validation Tasks**:
- [ ] **End-to-End Testing**: Comprehensive game flow testing
- [ ] **Real-time Feature Testing**: WebSocket functionality validation
- [ ] **Authentication Flow Testing**: Complete auth cycle validation
- [ ] **Cross-browser Testing**: Ensure compatibility maintained
- [ ] **Mobile Responsiveness**: Validate mobile experience preserved

### 5.2 Performance Benchmarking
**Baseline Metrics**: Establish before/after comparisons

**Benchmarking Tasks**:
- [ ] **Core Web Vitals**: Measure LCP, FID, CLS improvements
- [ ] **Bundle Size Analysis**: Document JavaScript bundle optimization
- [ ] **Time to Interactive**: Measure hydration performance
- [ ] **WebSocket Performance**: Connection establishment and message latency
- [ ] **Memory Usage**: Profile client-side memory consumption

**Target Improvements**:
- 20% reduction in Time to Interactive
- 15% reduction in bundle size
- Improved WebSocket connection reliability
- Better mobile performance scores

### 5.3 Code Quality & Documentation
**Final Polish Tasks**:
- [ ] **ESLint Configuration**: Update to Next.js 15 recommended rules
- [ ] **Code Comments**: Add comprehensive inline documentation
- [ ] **README Updates**: Document new architecture patterns
- [ ] **API Documentation**: Update development setup instructions
- [ ] **Type Documentation**: Generate comprehensive type documentation

---

## Implementation Guidelines

### Development Approach
1. **Feature Flag Strategy**: Use feature flags for safe incremental deployment
2. **Database Compatibility**: Ensure session storage remains compatible
3. **Backward Compatibility**: Maintain support for existing game URLs
4. **Progressive Enhancement**: Ensure basic functionality without JavaScript

### Quality Gates
- **TypeScript Strict Mode**: Zero type errors
- **ESLint Clean**: No linting violations
- **Test Coverage**: Maintain current test coverage minimum
- **Performance Budget**: No regression in Core Web Vitals
- **Accessibility**: Maintain WCAG compliance

### Risk Mitigation
- **Incremental Deployment**: Phase rollout with quick rollback capability
- **Feature Parity Testing**: Automated testing for all user flows
- **Performance Monitoring**: Real-time performance tracking
- **User Session Preservation**: Zero session data loss during migration

---

## Expected Outcomes

### Technical Benefits
- **Enhanced Type Safety**: Stricter TypeScript implementation
- **Improved Performance**: Faster page loads and better real-time responsiveness
- **Better Developer Experience**: Cleaner architecture and improved debugging
- **Future-Proof Codebase**: Full Next.js 15 compliance and modern patterns

### User Experience Benefits
- **Faster Load Times**: Optimized server/client boundaries
- **Better Error Handling**: Graceful error recovery and clear user feedback
- **Improved Reliability**: Enhanced WebSocket connection management
- **Seamless Authentication**: Smoother login/logout flows

### Maintenance Benefits
- **Cleaner Architecture**: Well-defined component boundaries
- **Enhanced Debugging**: Better error reporting and logging
- **Improved Testing**: More testable component structure
- **Documentation**: Comprehensive architectural documentation

---

## Success Metrics

### Functional Requirements
- [ ] All existing features work identically post-refactor
- [ ] Real-time gameplay maintains same responsiveness
- [ ] User authentication flows preserve session data
- [ ] Game state synchronization remains reliable

### Performance Requirements
- [ ] Lighthouse performance score improves by minimum 10 points
- [ ] Time to Interactive reduces by minimum 15%
- [ ] WebSocket connection establishment under 500ms
- [ ] Zero regression in mobile performance scores

### Code Quality Requirements
- [ ] TypeScript strict mode with zero errors
- [ ] ESLint with no violations
- [ ] Test coverage maintains current minimum threshold
- [ ] All components have proper TypeScript interfaces

This systematic approach ensures a thorough, safe refactoring that leverages all Next.js 15 benefits while preserving the robust real-time chess platform functionality.