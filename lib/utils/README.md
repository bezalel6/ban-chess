# TypeScript Utility Types for 2ban-2chess

This directory contains comprehensive TypeScript utility types designed specifically for the 2ban-2chess Next.js application. The utilities are organized into focused modules for different aspects of the application.

## 📁 File Structure

```
lib/utils/
├── index.ts              # Main export file with type guards and assertions
├── types.ts              # Core utility types (Result, Brand, etc.)
├── api-types.ts          # API and HTTP-related types
├── database-types.ts     # Database and ORM-related types
├── websocket-types.ts    # WebSocket and real-time communication types
├── react-types.ts        # React component and hook types
├── error-types.ts        # Error handling and validation types
└── README.md             # This documentation file
```

## 🚀 Usage Examples

### Basic Import Patterns

```typescript
// Import from main index for common types
import type { Result, AsyncResult, GameId } from '@/lib/utils';

// Import from specific modules for specialized types
import type { ApiResponse, RouteHandler } from '@/lib/utils/api-types';
import type { ChessBoardProps } from '@/lib/utils/react-types';
import type { WsGameStateMessage } from '@/lib/utils/websocket-types';
```

### Result Type Pattern

```typescript
import type { Result, AsyncResult } from '@/lib/utils';

// Synchronous operations
function validateMove(move: string): Result<ChessMove, ValidationError> {
  if (!isValidMove(move)) {
    return { success: false, error: new ValidationError('Invalid move') };
  }
  return { success: true, data: parseMove(move) };
}

// Asynchronous operations
async function fetchUser(id: string): AsyncResult<User, ApiError> {
  try {
    const user = await api.getUser(id);
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: error as ApiError };
  }
}
```

### Branded Types for Type Safety

```typescript
import type { GameId, UserId, createBrand } from '@/lib/utils';

// Create branded values
const gameId: GameId = createBrand<string, 'GameId'>('game-123');
const userId: UserId = createBrand<string, 'UserId'>('user-456');

// These are not assignable to each other despite both being strings
function joinGame(gameId: GameId, userId: UserId) {
  // Type-safe function that only accepts proper branded types
}
```

### API Response Types

```typescript
import type { ApiResponse, createApiResponse } from '@/lib/utils/api-types';

// Route handler with proper typing
export async function GET(): Promise<NextResponse<ApiResponse<User[]>>> {
  const users = await db.user.findMany();
  return NextResponse.json(createApiResponse(users, 'Users fetched successfully'));
}
```

### React Component Props

```typescript
import type { ButtonProps, WithChildren } from '@/lib/utils/react-types';

// Type-safe component with extended props
interface CustomButtonProps extends ButtonProps {
  icon?: ReactNode;
  tooltip?: string;
}

export function CustomButton({ 
  children, 
  variant = 'primary',
  size = 'md',
  icon,
  tooltip,
  ...props 
}: CustomButtonProps & WithChildren) {
  // Implementation
}
```

## 📖 Module Overview

### 1. `types.ts` - Core Utilities

**Key Features:**
- **Result/Error Types**: `Result<T, E>`, `AsyncResult<T, E>` for functional error handling
- **Object Manipulation**: `DeepPartial<T>`, `RequireKeys<T, K>`, `OptionalKeys<T, K>`
- **Array Utilities**: `NonEmptyArray<T>`, `ArrayElement<T>`, `Head<T>`, `Tail<T>`
- **Branded Types**: Type-safe wrappers like `GameId`, `UserId`, `FEN`
- **Conditional Types**: `If<C, T, F>`, `Equals<X, Y>`, type-level programming

**Example:**
```typescript
// Functional error handling
const result: Result<User, string> = await fetchUser(id);
if (result.success) {
  console.log(result.data.name); // Type-safe access
}

// Branded types prevent mixups
const gameId: GameId = createBrand('game-123');
const userId: UserId = createBrand('user-456');
```

### 2. `api-types.ts` - API & HTTP

**Key Features:**
- **Response Wrappers**: `ApiResponse<T>`, `PaginatedResponse<T>`
- **Route Handlers**: `RouteHandler<TParams, TResponse>` for Next.js 15
- **HTTP Types**: `HttpMethod`, `HttpStatusCode` unions
- **Validation**: `QueryParams<T>`, `ValidatedBody<T>`
- **Namespaced APIs**: `UserApi`, `GameApi` for specific endpoints

**Example:**
```typescript
// Type-safe route handler
const getUserGames: RouteHandler<
  { username: string }, 
  UserApi.UserGamesResponse
> = async (request, { params }) => {
  const { username } = await params;
  // Implementation with full type safety
};
```

### 3. `database-types.ts` - Database & ORM

**Key Features:**
- **Repository Pattern**: `BaseRepository<T>`, `SoftDeleteRepository<T>`
- **Query Building**: `QueryOptions<T>`, `FilterOptions<T>`, `SortOptions<T>`
- **Model Types**: `UserModel`, `GameModel`, `MoveModel` based on schema
- **Pagination**: `PaginatedResult<T>` with helper functions
- **CRUD Operations**: Type-safe create/update input types

**Example:**
```typescript
// Repository with full type safety
class UserRepository implements BaseRepository<UserModel> {
  async findById(id: string): DbResult<Optional<UserModel>> {
    // Database operations with proper error handling
  }
}
```

### 4. `websocket-types.ts` - Real-time Communication

**Key Features:**
- **Message System**: `ClientMessage`, `ServerMessage` unions
- **Game Messages**: `WsGameStateMessage`, `WsActionMessage` for chess moves
- **Connection Management**: `WsClient`, `WsServer` interfaces
- **Event Handlers**: Type-safe WebSocket event handling
- **State Management**: Connection states, ready states, close codes

**Example:**
```typescript
// Type-safe WebSocket message handling
function handleMessage(message: ServerMessage) {
  if (isMessageType(message, 'state')) {
    // message is now typed as WsGameStateMessage
    updateGameBoard(message.fen);
  }
}
```

### 5. `react-types.ts` - React Components

**Key Features:**
- **Component Props**: `ButtonProps`, `TextFieldProps`, form components
- **Chess Components**: `ChessBoardProps`, `GameStatusProps`, chess-specific types
- **Hook Types**: `AsyncHook<T>`, `UseToggleReturn`, common hook patterns
- **Event Handlers**: Type-safe React event handling
- **Context Types**: `GameContextValue`, `AuthContextValue`

**Example:**
```typescript
// Chess-specific component with full typing
interface ChessBoardProps {
  position: BoardPosition;
  onMove?: (move: ChessMove) => void;
  legalMoves?: ChessMove[];
  orientation?: PieceColor;
}

export function ChessBoard({ position, onMove, ...props }: ChessBoardProps) {
  // Implementation with type safety
}
```

### 6. `error-types.ts` - Error Handling

**Key Features:**
- **Error Hierarchy**: `AppError` with categorized error types
- **Validation Errors**: Field-specific validation with constraints
- **Network Errors**: HTTP status codes, retry logic, timeout handling
- **Game Errors**: Chess-specific error types and business logic
- **Error Recovery**: Retryable errors, user-friendly messages

**Example:**
```typescript
// Comprehensive error handling
try {
  const result = await makeMove(gameId, move);
} catch (error) {
  if (isGameError(error)) {
    showGameError(error.errorType); // Type-safe error handling
  } else if (isRetryableError(error)) {
    scheduleRetry(error);
  }
}
```

## 🛡️ Type Safety Features

### 1. Branded Types
Prevent common mistakes by wrapping primitives:
```typescript
type GameId = Brand<string, 'GameId'>;
type UserId = Brand<string, 'UserId'>;

// These are not interchangeable despite both being strings
function joinGame(gameId: GameId, userId: UserId) { }
```

### 2. Result Types
Functional error handling without exceptions:
```typescript
function parseMove(input: string): Result<ChessMove, ValidationError> {
  // Always returns success or failure, never throws
}
```

### 3. Deep Type Utilities
Work with complex nested objects safely:
```typescript
type PartialUser = DeepPartial<User>; // All fields optional recursively
type RequiredProfile = RequireKeys<User, 'profile'>; // Make profile required
```

### 4. Conditional Types
Type-level programming for complex scenarios:
```typescript
type ApiMethod<T> = T extends 'GET' ? GetHandler : PostHandler;
```

## 🎯 Best Practices

### 1. Import Only What You Need
```typescript
// ✅ Good - specific imports
import type { Result, GameId } from '@/lib/utils';
import type { ApiResponse } from '@/lib/utils/api-types';

// ❌ Avoid - importing everything
import type * as Utils from '@/lib/utils';
```

### 2. Use Branded Types for Critical IDs
```typescript
// ✅ Good - type-safe IDs
type GameId = Brand<string, 'GameId'>;
type UserId = Brand<string, 'UserId'>;

// ❌ Avoid - mixing up string IDs
function joinGame(gameId: string, userId: string) { }
```

### 3. Prefer Result Types Over Exceptions
```typescript
// ✅ Good - explicit error handling
async function fetchUser(id: string): AsyncResult<User, ApiError> {
  // Always returns Result, no hidden exceptions
}

// ❌ Avoid - throwing exceptions
async function fetchUser(id: string): Promise<User> {
  throw new Error('User not found'); // Hidden in type signature
}
```

### 4. Use Type Guards for Runtime Safety
```typescript
// ✅ Good - runtime type checking
if (isApiError(response)) {
  handleError(response.error);
} else {
  processData(response.data);
}
```

## 🔧 Integration Points

### Next.js 15 Route Handlers
```typescript
import type { RouteHandler } from '@/lib/utils/api-types';

export const GET: RouteHandler<{ id: string }, User> = async (req, { params }) => {
  const { id } = await params;
  // Fully typed route handler
};
```

### Drizzle ORM Models
```typescript
import type { UserModel, CreateUserInput } from '@/lib/utils/database-types';

// Database operations with proper typing
const user: UserModel = await db.insert(users).values(userData);
```

### WebSocket Communication
```typescript
import type { WsGameStateMessage } from '@/lib/utils/websocket-types';

// Type-safe WebSocket message handling
socket.on('message', (message: WsGameStateMessage) => {
  updateGameState(message.fen);
});
```

### React Components
```typescript
import type { ChessBoardProps } from '@/lib/utils/react-types';

// Chess-specific component typing
export function ChessBoard(props: ChessBoardProps) {
  // Implementation
}
```

## 🚀 Performance Considerations

- **Tree Shaking**: Use specific imports to enable dead code elimination
- **Type-Only Imports**: Use `import type` for types to avoid runtime bloat  
- **Minimal Runtime**: Most utilities are compile-time only
- **Brand Types**: Zero runtime overhead, compile-time safety only

## 🧪 Testing Integration

The utility types are designed to work seamlessly with testing:

```typescript
import type { AsyncResult } from '@/lib/utils';
import { createApiResponse } from '@/lib/utils/api-types';

// Mock API responses with proper typing
const mockUserResponse = createApiResponse(mockUser, 'Success');
expect(isApiSuccess(mockUserResponse)).toBe(true);
```

## 🔄 Evolution and Maintenance

- **Modular Design**: Each file handles a specific domain
- **Backward Compatible**: New types don't break existing code
- **Documentation**: All types have JSDoc comments with examples
- **Consistent Patterns**: Similar naming and structure across modules

---

This utility type system provides a robust foundation for type-safe development in the 2ban-2chess application, ensuring compile-time safety while maintaining runtime performance.