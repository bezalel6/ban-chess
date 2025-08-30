/**
 * React-specific TypeScript utility types for components and hooks
 * Designed for the 2ban-2chess Next.js application with React 19
 */

import type { 
  ReactNode, 
  ComponentType, 
  RefObject, 
  MutableRefObject,
  CSSProperties,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes
} from 'react';
import type { Optional, Brand } from './types';

// ========================================
// COMPONENT PROP UTILITIES
// ========================================

/**
 * Make specific props required in a component prop type
 * @template T - The component props type
 * @template K - Keys to make required
 */
export type RequireProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific props optional in a component prop type
 * @template T - The component props type
 * @template K - Keys to make optional
 */
export type OptionalProps<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Extract props from a component type
 * @template T - The component type
 */
export type PropsOf<T> = T extends ComponentType<infer P> ? P : never;

/**
 * Component with children
 */
export interface WithChildren {
  children: ReactNode;
}

/**
 * Component with optional children
 */
export interface WithOptionalChildren {
  children?: ReactNode;
}

/**
 * Component with className support
 */
export interface WithClassName {
  className?: string;
}

/**
 * Component with style support
 */
export interface WithStyle {
  style?: CSSProperties;
}

/**
 * Component with common HTML attributes
 */
export interface WithHtmlAttributes {
  id?: string;
  className?: string;
  style?: CSSProperties;
  'data-testid'?: string;
}

/**
 * Polymorphic component props
 * @template T - The HTML element type
 */
export interface PolymorphicProps<T extends keyof HTMLElementTagNameMap = 'div'> {
  as?: T;
}

// ========================================
// FORM COMPONENT TYPES
// ========================================

/**
 * Base form field props
 */
export interface BaseFieldProps extends WithHtmlAttributes {
  name: string;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
}

/**
 * Text input field props
 */
export interface TextFieldProps extends BaseFieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
}

/**
 * Select field props
 * @template T - The option value type
 */
export interface SelectFieldProps<T = string> extends BaseFieldProps, Omit<SelectHTMLAttributes<HTMLSelectElement>, 'name' | 'value' | 'onChange'> {
  value?: T;
  options: Array<{
    value: T;
    label: string;
    disabled?: boolean;
  }>;
  placeholder?: string;
  onChange?: (value: T) => void;
}

/**
 * Button component props
 */
export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>, WithHtmlAttributes {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

// ========================================
// HOOK UTILITY TYPES
// ========================================

/**
 * Hook return type utility
 * @template T - The hook function type
 */
export type HookReturnType<T> = T extends (...args: never[]) => infer R ? R : never;

/**
 * Async hook state
 * @template T - The data type
 * @template E - The error type
 */
export interface AsyncHookState<T, E = Error> {
  data: Optional<T>;
  error: Optional<E>;
  loading: boolean;
  called?: boolean;
}

/**
 * Async hook actions
 * @template TArgs - The function arguments type
 */
export interface AsyncHookActions<TArgs extends readonly unknown[] = []> {
  execute: (...args: TArgs) => Promise<void>;
  reset: () => void;
  cancel?: () => void;
}

/**
 * Complete async hook return type
 * @template T - The data type
 * @template E - The error type
 * @template TArgs - The function arguments type
 */
export type AsyncHook<T, E = Error, TArgs extends readonly unknown[] = []> = 
  AsyncHookState<T, E> & AsyncHookActions<TArgs>;

/**
 * Local storage hook return type
 * @template T - The stored value type
 */
export interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (value: T | ((prev: T) => T)) => void;
  removeValue: () => void;
}

/**
 * Toggle hook return type
 */
export interface UseToggleReturn {
  value: boolean;
  toggle: () => void;
  setTrue: () => void;
  setFalse: () => void;
  setValue: (value: boolean) => void;
}

// ========================================
// REF UTILITY TYPES
// ========================================

/**
 * Ref type that can be either mutable or immutable
 * @template T - The ref value type
 */
export type AnyRef<T> = RefObject<T> | MutableRefObject<T>;

/**
 * Ref callback function type
 * @template T - The element type
 */
export type RefCallback<T> = (node: T | null) => void;

/**
 * Combined ref type (can be object ref or callback)
 * @template T - The element type
 */
export type CombinedRef<T> = AnyRef<T> | RefCallback<T>;

// ========================================
// EVENT HANDLER TYPES
// ========================================

/**
 * Generic event handler type
 * @template T - The event type
 */
export type EventHandler<T = Event> = (event: T) => void;

/**
 * Form event handlers
 */
export interface FormEventHandlers {
  onSubmit?: EventHandler;
  onChange?: EventHandler;
  onFocus?: EventHandler;
  onBlur?: EventHandler;
  onKeyDown?: EventHandler;
  onKeyUp?: EventHandler;
}

/**
 * Mouse event handlers
 */
export interface MouseEventHandlers {
  onClick?: EventHandler;
  onDoubleClick?: EventHandler;
  onMouseDown?: EventHandler;
  onMouseUp?: EventHandler;
  onMouseEnter?: EventHandler;
  onMouseLeave?: EventHandler;
  onMouseMove?: EventHandler;
}

// ========================================
// GAME-SPECIFIC COMPONENT TYPES
// ========================================

/**
 * Chess board square identifier
 */
export type ChessSquare = Brand<string, 'ChessSquare'>;

/**
 * Chess piece type
 */
export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

/**
 * Chess piece color
 */
export type PieceColor = 'white' | 'black';

/**
 * Chess piece
 */
export interface ChessPiece {
  type: PieceType;
  color: PieceColor;
}

/**
 * Chess board position
 */
export type BoardPosition = Record<ChessSquare, ChessPiece | null>;

/**
 * Chess move
 */
export interface ChessMove {
  from: ChessSquare;
  to: ChessSquare;
  promotion?: PieceType;
  piece?: ChessPiece;
  captured?: ChessPiece;
  san?: string;
  uci?: string;
}

/**
 * Chess board component props
 */
export interface ChessBoardProps extends WithHtmlAttributes {
  position: BoardPosition;
  orientation?: PieceColor;
  onMove?: (move: ChessMove) => void;
  onSquareClick?: (square: ChessSquare) => void;
  legalMoves?: ChessMove[];
  highlights?: {
    squares?: ChessSquare[];
    lastMove?: { from: ChessSquare; to: ChessSquare };
  };
  disabled?: boolean;
  showCoordinates?: boolean;
  size?: number | 'auto';
}

/**
 * Game status component props
 */
export interface GameStatusProps extends WithHtmlAttributes {
  gameState: {
    status: 'waiting' | 'ongoing' | 'completed';
    currentPlayer?: PieceColor;
    result?: string;
    inCheck?: boolean;
  };
  players: {
    white?: { name: string; rating?: number };
    black?: { name: string; rating?: number };
  };
  timeControl?: {
    white: { remaining: number };
    black: { remaining: number };
  };
}

/**
 * Move history component props
 */
export interface MoveHistoryProps extends WithHtmlAttributes {
  moves: ChessMove[];
  currentMoveIndex?: number;
  onMoveClick?: (moveIndex: number) => void;
  format?: 'san' | 'uci';
  showNumbers?: boolean;
}

// ========================================
// CONTEXT AND PROVIDER TYPES
// ========================================

/**
 * Context provider wrapper props
 * @template T - The context value type
 */
export interface ContextProviderProps<T> extends WithChildren {
  value?: T;
  defaultValue?: T;
}

/**
 * Game context value
 */
export interface GameContextValue {
  gameId: Optional<string>;
  position: BoardPosition;
  legalMoves: ChessMove[];
  gameState: {
    status: 'waiting' | 'ongoing' | 'completed';
    currentPlayer: PieceColor;
    result?: string;
    inCheck: boolean;
  };
  players: {
    white?: { id: string; name: string; rating?: number };
    black?: { id: string; name: string; rating?: number };
  };
  makeMove: (move: ChessMove) => Promise<boolean>;
  makeBan: (move: { from: ChessSquare; to: ChessSquare }) => Promise<boolean>;
}

/**
 * Auth context value
 */
export interface AuthContextValue {
  user: Optional<{
    id: string;
    username: string;
    provider: string;
    email?: string;
    image?: string;
  }>;
  loading: boolean;
  signIn: (provider: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

// ========================================
// RENDER PROP TYPES
// ========================================

/**
 * Render prop function
 * @template T - The render prop arguments type
 */
export type RenderProp<T = Record<string, unknown>> = (args: T) => ReactNode;

/**
 * Component with render prop
 * @template T - The render prop arguments type
 */
export interface WithRenderProp<T = Record<string, unknown>> {
  children: RenderProp<T>;
}

/**
 * Component that can accept either children or render prop
 * @template T - The render prop arguments type
 */
export interface WithChildrenOrRenderProp<T = Record<string, unknown>> {
  children: ReactNode | RenderProp<T>;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Type guard to check if children is a render prop
 * @template T - The render prop arguments type
 * @param children - The children prop
 * @returns Type predicate for render prop
 */
export function isRenderProp<T = Record<string, unknown>>(
  children: ReactNode | RenderProp<T>
): children is RenderProp<T> {
  return typeof children === 'function';
}

/**
 * Type guard to check if a ref is a ref object
 * @template T - The ref value type
 * @param ref - The ref to check
 * @returns Type predicate for ref object
 */
export function isRefObject<T>(ref: CombinedRef<T>): ref is RefObject<T> | MutableRefObject<T> {
  return typeof ref === 'object' && ref !== null && 'current' in ref;
}

/**
 * Type guard to check if a ref is a callback ref
 * @template T - The ref value type
 * @param ref - The ref to check
 * @returns Type predicate for callback ref
 */
export function isRefCallback<T>(ref: CombinedRef<T>): ref is RefCallback<T> {
  return typeof ref === 'function';
}

/**
 * Create a chess square from file and rank
 * @param file - The file letter (a-h)
 * @param rank - The rank number (1-8)
 * @returns Chess square identifier
 */
export function createChessSquare(file: string, rank: number): ChessSquare {
  return `${file}${rank}` as ChessSquare;
}

/**
 * Parse a chess square into file and rank
 * @param square - The chess square identifier
 * @returns File and rank
 */
export function parseChessSquare(square: ChessSquare): { file: string; rank: number } {
  return {
    file: square[0],
    rank: parseInt(square[1], 10),
  };
}