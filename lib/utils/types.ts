/**
 * Comprehensive TypeScript utility types for enhanced type safety and developer experience
 * Designed specifically for the 2ban-2chess Next.js application
 */

// ========================================
// RESULT AND ERROR HANDLING TYPES
// ========================================

/**
 * Represents the result of an operation that can succeed or fail
 * @template T - Success value type
 * @template E - Error value type
 * @example
 * const result: Result<User, string> = await fetchUser(id);
 * if (result.success) {
 *   console.log(result.data.name); // Type-safe access
 * } else {
 *   console.error(result.error); // Type-safe error handling
 * }
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

export interface Success<T> {
  readonly success: true;
  readonly data: T;
}

export interface Failure<E> {
  readonly success: false;
  readonly error: E;
}

/**
 * Async result type for operations that can fail
 * @template T - Success value type
 * @template E - Error value type
 * @example
 * const fetchUserData: AsyncResult<User, ApiError> = async (id: string) => {
 *   try {
 *     const user = await api.getUser(id);
 *     return { success: true, data: user };
 *   } catch (error) {
 *     return { success: false, error: error as ApiError };
 *   }
 * };
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Optional type that can be null, undefined, or a value
 * @template T - The wrapped type
 */
export type Optional<T> = T | null | undefined;

/**
 * Type for operations that might not return a value
 * @template T - The value type
 * @template E - The error type
 */
export type Maybe<T, E = string> = T | E | null | undefined;

// ========================================
// ADVANCED OBJECT MANIPULATION TYPES
// ========================================

/**
 * Make all properties in T optional and nullable recursively
 * @template T - The type to make deeply partial
 * @example
 * type PartialUser = DeepPartial<{ profile: { name: string; age: number } }>;
 * // Result: { profile?: { name?: string | null; age?: number | null } | null }
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] | null;
};

/**
 * Make all properties in T required recursively
 * @template T - The type to make deeply required
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Make all properties in T readonly recursively
 * @template T - The type to make deeply readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Make specific keys K in T required while keeping others optional
 * @template T - The base type
 * @template K - Keys to make required
 * @example
 * type UserWithId = RequireKeys<Partial<User>, 'id'>; // id is required, others optional
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific keys K in T optional while keeping others required
 * @template T - The base type
 * @template K - Keys to make optional
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Extract non-nullable properties from a type
 * @template T - The type to make non-nullable
 */
export type StrictNonNullable<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

/**
 * Create a type where all properties are mutable (opposite of readonly)
 * @template T - The type to make mutable
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Deep mutable version - makes all properties mutable recursively
 * @template T - The type to make deeply mutable
 */
export type DeepMutable<T> = {
  -readonly [P in keyof T]: T[P] extends object ? DeepMutable<T[P]> : T[P];
};

// ========================================
// ARRAY AND COLLECTION UTILITIES
// ========================================

/**
 * Get the type of array elements
 * @template A - The array type
 * @example
 * type StringElement = ArrayElement<string[]>; // string
 * type GameElement = ArrayElement<Game[]>; // Game
 */
export type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;

/**
 * Create a non-empty array type
 * @template T - The element type
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Get the first element type of a tuple
 * @template T - The tuple type
 */
export type Head<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]] ? H : never;

/**
 * Get all but the first element of a tuple
 * @template T - The tuple type
 */
export type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer Rest] ? Rest : [];

/**
 * Get the last element type of a tuple
 * @template T - The tuple type
 */
export type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer L] ? L : never;

/**
 * Get the length of a tuple as a literal type
 * @template T - The tuple type
 */
export type Length<T extends readonly unknown[]> = T['length'];

// ========================================
// FUNCTION AND CALLABLE UTILITIES
// ========================================

/**
 * Extract function parameters as a tuple
 * @template T - The function type
 */
export type Parameters<T extends (...args: never[]) => unknown> = T extends (...args: infer P) => unknown ? P : never;

/**
 * Extract function return type
 * @template T - The function type
 */
export type ReturnType<T extends (...args: never[]) => unknown> = T extends (...args: never[]) => infer R ? R : unknown;

/**
 * Extract the awaited type from a Promise
 * @template T - The Promise type
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Create a function type with specific parameters and return type
 * @template P - Parameters tuple
 * @template R - Return type
 */
export type Fn<P extends readonly unknown[], R> = (...args: P) => R;

/**
 * Create an async function type
 * @template P - Parameters tuple
 * @template R - Return type
 */
export type AsyncFn<P extends readonly unknown[], R> = (...args: P) => Promise<R>;

/**
 * Make a function's parameters optional
 * @template T - The function type
 */
export type OptionalParams<T extends (...args: never[]) => unknown> = 
  T extends (...args: infer P) => infer R 
    ? (...args: Partial<P>) => R 
    : never;

// ========================================
// KEY-VALUE AND OBJECT UTILITIES
// ========================================

/**
 * Create a union of all property values in an object type
 * @template T - The object type
 * @example
 * type Colors = ValueOf<{ red: '#ff0000'; blue: '#0000ff' }>; // '#ff0000' | '#0000ff'
 */
export type ValueOf<T> = T[keyof T];

/**
 * Create a type-safe key-value pair
 * @template T - The object type
 */
export type KeyValuePair<T> = {
  [K in keyof T]: {
    key: K;
    value: T[K];
  };
}[keyof T];

/**
 * Get all string keys from a type
 * @template T - The object type
 */
export type StringKeys<T> = Extract<keyof T, string>;

/**
 * Get all number keys from a type
 * @template T - The object type
 */
export type NumberKeys<T> = Extract<keyof T, number>;

/**
 * Get all symbol keys from a type
 * @template T - The object type
 */
export type SymbolKeys<T> = Extract<keyof T, symbol>;

/**
 * Create a type from an object's entries
 * @template T - The object type
 */
export type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

// ========================================
// CONDITIONAL AND UTILITY TYPES
// ========================================

/**
 * Conditional type that returns T if condition C is true, otherwise F
 * @template C - The condition
 * @template T - Type when true
 * @template F - Type when false
 */
export type If<C extends boolean, T, F> = C extends true ? T : F;

/**
 * Check if two types are equal
 * @template X - First type
 * @template Y - Second type
 */
export type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

/**
 * Check if a type extends another
 * @template T - The type to check
 * @template U - The type to check against
 */
export type Extends<T, U> = T extends U ? true : false;

/**
 * Exclude null and undefined from a union type
 * @template T - The union type
 */
export type NotNullish<T> = T extends null | undefined ? never : T;

/**
 * Check if a type is any
 * @template T - The type to check
 */
export type IsAny<T> = 0 extends (1 & T) ? true : false;

/**
 * Check if a type is never
 * @template T - The type to check
 */
export type IsNever<T> = [T] extends [never] ? true : false;

/**
 * Check if a type is unknown
 * @template T - The type to check
 */
export type IsUnknown<T> = IsAny<T> extends true ? false : unknown extends T ? true : false;

// ========================================
// JSON AND SERIALIZATION TYPES
// ========================================

/**
 * JSON-serializable primitive types
 */
export type JsonPrimitive = string | number | boolean | null;

/**
 * JSON-serializable types only
 */
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

/**
 * JSON-serializable object
 */
export interface JsonObject {
  [key: string]: JsonValue;
}

/**
 * JSON-serializable array
 */
export interface JsonArray extends Array<JsonValue> {}

/**
 * Make a type JSON-serializable by converting non-serializable types
 * @template T - The type to make JSON-serializable
 */
export type JsonSerializable<T> = T extends JsonPrimitive
  ? T
  : T extends Date
  ? string
  : T extends RegExp
  ? string
  : T extends Function
  ? never
  : T extends object
  ? { [K in keyof T]: JsonSerializable<T[K]> }
  : never;

// ========================================
// BRANDED TYPES FOR TYPE SAFETY
// ========================================

/**
 * Branded types for compile-time type safety
 * @template T - The underlying type
 * @template B - The brand identifier
 * @example
 * type UserId = Brand<string, 'UserId'>;
 * type GameId = Brand<string, 'GameId'>;
 * // These are not assignable to each other despite both being strings
 */
export type Brand<T, B> = T & { readonly __brand: B };

/**
 * Multiple brand support for types that need multiple identifiers
 * @template T - The underlying type
 * @template B - The brand identifiers tuple
 */
export type MultiBrand<T, B extends readonly string[]> = T & {
  readonly __brands: B;
};

// Game-specific branded types for the chess application
export type GameId = Brand<string, 'GameId'>;
export type UserId = Brand<string, 'UserId'>;
export type Square = Brand<string, 'ChessSquare'>;
export type FEN = Brand<string, 'FEN'>;
export type PGN = Brand<string, 'PGN'>;
export type UCI = Brand<string, 'UCI'>;
export type SAN = Brand<string, 'SAN'>;
export type Timestamp = Brand<number, 'Timestamp'>;
export type Rating = Brand<number, 'Rating'>;
export type TimeControl = Brand<number, 'TimeControlSeconds'>;

// ========================================
// BRANDED TYPE UTILITIES
// ========================================

/**
 * Utility to create branded values
 * @template T - The underlying type
 * @template B - The brand identifier
 * @param value - The value to brand
 * @returns The branded value
 * @example
 * const gameId = createBrand<string, 'GameId'>('game123');
 */
export function createBrand<T, B>(value: T): Brand<T, B> {
  return value as Brand<T, B>;
}

/**
 * Utility to extract the underlying value from a branded type
 * @template T - The underlying type
 * @template B - The brand identifier
 * @param branded - The branded value
 * @returns The underlying value
 * @example
 * const gameId: GameId = createBrand('game123');
 * const rawId = unwrapBrand(gameId); // string
 */
export function unwrapBrand<T, B>(branded: Brand<T, B>): T {
  return branded as T;
}

/**
 * Type guard to check if a value is a specific branded type
 * @template T - The underlying type
 * @template B - The brand identifier
 * @param value - The value to check
 * @param validator - Function to validate the underlying type
 * @returns Type predicate for the branded type
 */
export function isBrandedType<T, B>(
  value: unknown,
  validator: (val: unknown) => val is T
): value is Brand<T, B> {
  return validator(value);
}