/**
 * Type-safe props for all chess components using the TypeScript utilities
 */

import type { ReactNode, CSSProperties } from 'react';
import type {
  SimpleGameState,
  Ban,
  HistoryEntry,
  TimeControl,
  PlayerClock,
  GameEvent,
} from '@/lib/game-types';
import type { FEN, Square, ChessMove, PGN } from '@/lib/utils/types';
import type {
  ChessBoardProps as BaseChessBoardProps,
  ChessMoveHandler,
  ChessTimerProps,
} from '@/lib/utils/react-types';

/**
 * Enhanced ChessBoard component props with full type safety
 */
export interface ChessBoardProps extends BaseChessBoardProps {
  gameState: SimpleGameState;
  onMove: ChessMoveHandler;
  onBan: (ban: Ban) => void;
  playerColor?: 'white' | 'black';
  isAnalysisMode?: boolean;
  showCoordinates?: boolean;
  showLegalMoves?: boolean;
  highlightedSquares?: Square[];
  arrowAnnotations?: Array<{
    from: Square;
    to: Square;
    color?: string;
  }>;
  boardTheme?: 'default' | 'wood' | 'marble' | 'dark';
  pieceTheme?: 'default' | 'neo' | 'classic';
  animationDuration?: number;
  onSquareClick?: (square: Square) => void;
  onSquareRightClick?: (square: Square) => void;
  disabled?: boolean;
}

/**
 * Game client props with WebSocket connection
 */
export interface GameClientProps {
  gameId: string;
  userId: string;
  username: string;
  initialState?: SimpleGameState;
  onGameEnd?: (result: string, winner?: 'white' | 'black' | 'draw') => void;
  onError?: (error: Error) => void;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

/**
 * Game status panel props
 */
export interface GameStatusPanelProps {
  gameState: SimpleGameState;
  currentPlayer: 'white' | 'black';
  isGameOver: boolean;
  result?: string;
  winner?: 'white' | 'black' | 'draw';
  gameOverReason?: string;
  onResign?: () => void;
  onOfferDraw?: () => void;
  onAcceptDraw?: () => void;
  className?: string;
}

/**
 * Game timer component props
 */
export interface GameTimerComponentProps extends ChessTimerProps {
  clock: PlayerClock;
  isActive: boolean;
  color: 'white' | 'black';
  onTimeout?: () => void;
  onGiveTime?: (seconds: number) => void;
  showGiveTimeButton?: boolean;
  className?: string;
}

/**
 * Move history list props
 */
export interface MoveHistoryProps {
  history: HistoryEntry[];
  currentMoveIndex?: number;
  onMoveClick?: (index: number) => void;
  showMoveNumbers?: boolean;
  showTimestamps?: boolean;
  notation?: 'san' | 'uci';
  className?: string;
  maxHeight?: number | string;
}

/**
 * Game event log props
 */
export interface GameEventLogProps {
  events: GameEvent[];
  maxEvents?: number;
  showTimestamps?: boolean;
  filterTypes?: GameEvent['type'][];
  onEventClick?: (event: GameEvent) => void;
  className?: string;
  autoScroll?: boolean;
}

/**
 * Player info card props
 */
export interface PlayerInfoProps {
  username: string;
  rating?: number;
  color: 'white' | 'black';
  clock?: PlayerClock;
  isActive: boolean;
  isOnline?: boolean;
  avatar?: string;
  showRating?: boolean;
  showClock?: boolean;
  capturedPieces?: string[];
  materialAdvantage?: number;
  className?: string;
}

/**
 * Game sidebar props
 */
export interface GameSidebarProps {
  gameState: SimpleGameState;
  history: HistoryEntry[];
  events?: GameEvent[];
  showChat?: boolean;
  showMoveHistory?: boolean;
  showEventLog?: boolean;
  showGameInfo?: boolean;
  onMoveClick?: (index: number) => void;
  className?: string;
  width?: number | string;
}

/**
 * Analysis board props
 */
export interface AnalysisBoardProps
  extends Omit<ChessBoardProps, 'onMove' | 'onBan'> {
  pgn?: PGN | string;
  fen?: FEN | string;
  onPositionChange?: (fen: FEN | string) => void;
  onAnalysisComplete?: (evaluation: number, bestMove: ChessMove) => void;
  engineDepth?: number;
  showEvaluation?: boolean;
  showBestMove?: boolean;
  allowEditing?: boolean;
  variations?: Array<{
    moves: ChessMove[];
    evaluation?: number;
    comment?: string;
  }>;
}

/**
 * Resizable board wrapper props
 */
export interface ResizableBoardProps {
  children: ReactNode;
  minSize?: number;
  maxSize?: number;
  defaultSize?: number;
  onResize?: (size: number) => void;
  maintainAspectRatio?: boolean;
  resizeHandles?: ('n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw')[];
  className?: string;
}

/**
 * Game creation dialog props
 */
export interface GameCreationDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateGame: (options: GameCreationOptions) => void;
  defaultTimeControl?: TimeControl;
  showAdvancedOptions?: boolean;
}

/**
 * Game creation options
 */
export interface GameCreationOptions {
  timeControl: TimeControl;
  rated: boolean;
  color?: 'white' | 'black' | 'random';
  variant?: 'standard' | 'ban-chess';
  isPrivate?: boolean;
  password?: string;
  allowSpectators?: boolean;
  allowTakebacks?: boolean;
}

/**
 * Game list item props
 */
export interface GameListItemProps {
  game: {
    id: string;
    white: string;
    black: string;
    result?: string;
    timeControl?: TimeControl;
    rated: boolean;
    startedAt: Date;
    completedAt?: Date;
  };
  onClick?: (gameId: string) => void;
  showResult?: boolean;
  showTimeControl?: boolean;
  showDate?: boolean;
  isActive?: boolean;
  className?: string;
}

/**
 * Spectator mode props
 */
export interface SpectatorModeProps {
  gameId: string;
  allowChat?: boolean;
  showPlayerInfo?: boolean;
  showAnalysis?: boolean;
  onLeave?: () => void;
}

/**
 * Ban indicator props
 */
export interface BanIndicatorProps {
  bannedSquare: Square;
  bannedBy: 'white' | 'black';
  showAnimation?: boolean;
  animationDuration?: number;
  onClick?: (square: Square) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Promotion dialog props
 */
export interface PromotionDialogProps {
  open: boolean;
  color: 'white' | 'black';
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
  onCancel: () => void;
  position?: { x: number; y: number };
}

/**
 * Type guards for component props
 */
export function isChessBoardProps(props: unknown): props is ChessBoardProps {
  return (
    typeof props === 'object' &&
    props !== null &&
    'gameState' in props &&
    'onMove' in props &&
    'onBan' in props
  );
}

export function isGameClientProps(props: unknown): props is GameClientProps {
  return (
    typeof props === 'object' &&
    props !== null &&
    'gameId' in props &&
    'userId' in props &&
    'username' in props
  );
}
