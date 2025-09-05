// These will be used by the Board component
export type { Key, Dests } from "@bezalel6/react-chessground";

export type Color = "white" | "black";
export type Square = string;
export type Orientation = "white" | "black";
export type ActionType = "ban" | "move";

export interface Move {
  from: Square;
  to: Square;
  promotion?: "q" | "r" | "b" | "n";
}

export interface Ban {
  from: Square;
  to: Square;
}

export interface BoardPosition {
  fen: string;
  check?: Color;
  lastMove?: [Square, Square];
}

export interface BoardPermissions {
  canInteract: boolean;
  canMove: boolean;
  canBan: boolean;
  movableColor?: Color | "both";
}

export interface BoardHandlers {
  onMove: (move: Move) => void;
  onBan: (ban: Ban) => void;
  onSquareSelect?: (square: Square) => void;
  onSquareDeselect?: () => void;
}

export interface BoardConfig {
  orientation: Orientation;
  coordinates?: boolean;
  animation?: {
    enabled: boolean;
    duration: number;
  };
  highlight?: {
    lastMove: boolean;
    check: boolean;
  };
}

export interface ChessboardProps {
  // Core game state
  position: BoardPosition;
  destinations: Map<Square, Square[]>;
  
  // Current action context
  actionType: ActionType;
  currentBan?: Ban;
  
  // Permissions
  permissions: BoardPermissions;
  
  // Board configuration
  config?: Partial<BoardConfig>;
  
  // Event handlers
  handlers: BoardHandlers;
  
  // Optional refresh trigger
  refreshKey?: number;
}

export interface OverlayProps {
  visible: boolean;
  className?: string;
}

export interface BanOverlayProps extends OverlayProps {
  ban: Ban | null;
}

export interface AlertOverlayProps extends OverlayProps {
  message: string;
  severity: "info" | "warning" | "error";
  duration?: number;
  onDismiss?: () => void;
}

export interface CheckOverlayProps extends OverlayProps {
  color: Color;
  square: Square;
}