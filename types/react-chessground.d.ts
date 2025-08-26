// Custom type definitions for react-chessground
// Based on @types/react-chessground but with all types exported

declare module "react-chessground" {
  import React from "react";

  export type Color = "white" | "black";
  export type Role = "pawn" | "knight" | "bishop" | "rook" | "queen" | "king";
  export type File = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
  export type Rank = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";
  export type Key = "a0" | `${File}${Rank}`;
  export type SquareClasses = Map<Key, string>;
  export type Dests = Map<Key, Key[]>;

  export interface Piece {
    role: Role;
    color: Color;
    promoted?: boolean;
  }

  export interface HighlightOptions {
    lastMove?: boolean;
    check?: boolean;
    custom?: SquareClasses;
  }

  export interface AnimationOptions {
    enabled?: boolean;
    duration?: number;
  }

  export interface MoveMetadata {
    premove: boolean;
    ctrlKey?: boolean;
    holdTime?: number;
    captured?: Piece;
    predrop?: boolean;
  }

  export interface MovableOptions {
    free?: boolean;
    color?: Color | "both";
    dests?: Dests;
    showDests?: boolean;
    events?: {
      after?: (orig: Key, dest: Key, metadata: MoveMetadata) => void;
      afterNewPiece?: (role: Role, key: Key, metadata: MoveMetadata) => void;
    };
    rookCastle?: boolean;
  }

  export interface PremovableOptions {
    enabled?: boolean;
    showDests?: boolean;
    castle?: boolean;
    dests?: Key[];
    customDests?: Dests;
    events?: {
      set?: (orig: Key, dest: Key, metadata?: { ctrlKey?: boolean }) => void;
      unset?: () => void;
    };
  }

  export interface PredroppableOptions {
    enabled?: boolean;
    events?: {
      set?: (role: Role, key: Key) => void;
      unset?: () => void;
    };
  }

  export interface DraggableOptions {
    enabled?: boolean;
    distance?: number;
    autoDistance?: boolean;
    showGhost?: boolean;
    deleteOnDropOff?: boolean;
  }

  export interface DrawShapePiece {
    role: Role;
    color: Color;
    scale?: number;
  }

  export interface DrawModifiers {
    lineWidth?: number;
    hilite?: boolean;
  }

  export interface DrawShape {
    orig: Key;
    dest?: Key;
    brush?: string;
    modifiers?: DrawModifiers;
    piece?: DrawShapePiece;
    customSvg?: { html: string; center?: "orig" | "dest" | "label" };
    label?: { text: string; fill?: string };
  }

  export interface DrawBrush {
    key: string;
    color: string;
    opacity: number;
    lineWidth: number;
  }

  export interface DrawBrushes {
    green: DrawBrush;
    red: DrawBrush;
    blue: DrawBrush;
    yellow: DrawBrush;
    [color: string]: DrawBrush;
  }

  export interface DrawableOptions {
    enabled?: boolean;
    visible?: boolean;
    defaultSnapToValidMove?: boolean;
    eraseOnClick?: boolean;
    shapes?: DrawShape[];
    autoShapes?: DrawShape[];
    brushes?: DrawBrushes;
    onChange?: (shapes: DrawShape[]) => void;
  }

  export interface ReactChessGroundProps
    extends Omit<
      React.HTMLAttributes<HTMLDivElement>,
      "draggable" | "onSelect"
    > {
    width?: string | number;
    height?: string | number;
    fen?: string;
    orientation?: Color;
    turnColor?: Color;
    check?: Color | boolean;
    lastMove?: Key[];
    selected?: Key;
    coordinates?: boolean;
    autoCastle?: boolean;
    viewOnly?: boolean;
    disableContextMenu?: boolean;
    resizable?: boolean;
    addPieceZIndex?: boolean;
    highlight?: HighlightOptions;
    animation?: AnimationOptions;
    movable?: MovableOptions;
    premovable?: PremovableOptions;
    predroppable?: PredroppableOptions;
    draggable?: DraggableOptions;
    selectable?: { enabled?: boolean };
    drawable?: DrawableOptions;
    onChange?: () => void;
    onMove?: (orig: Key, dest: Key, capturedPiece?: Piece) => void;
    onDropNewPiece?: (piece: Piece, key: Key) => void;
    onSelect?: (key: Key) => void;
  }

  class Chessground extends React.Component<ReactChessGroundProps> {}

  export default Chessground;
}
