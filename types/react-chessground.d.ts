// Custom type definitions for react-chessground
// Based on @types/react-chessground but with all types exported

declare module 'react-chessground' {
  import React from 'react';

  export type Color = 'white' | 'black';
  export type Role = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';
  export type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
  export type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
  export type Key = 'a0' | `${File}${Rank}`;
  export type SquareClasses = Map<Key, string>;
  export type Dests = Map<Key, Key[]>;

  export interface Piece {
    role: Role;
    color: Color;
    promoted?: boolean;
  }

  export interface HighlightOptions {
    lastMove?: boolean; // add last-move class to squares
    check?: boolean; // add check class to squares
    custom?: SquareClasses; // add custom classes to custom squares
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
    free?: boolean; // all moves are valid - board editor
    color?: Color | 'both'; // color that can move. white | black | both | undefined
    dests?: Dests; // valid moves. {"a2" ["a3" "a4"] "b1" ["a3" "c3"]}
    showDests?: boolean; // whether to add the move-dest class on squares
    events?: {
      after?: (orig: Key, dest: Key, metadata: MoveMetadata) => void; // called after the move has been played
      afterNewPiece?: (role: Role, key: Key, metadata: MoveMetadata) => void; // called after a new piece is dropped on the board
    };
    rookCastle?: boolean; // castle by moving the king to the rook
  }

  export interface PremovableOptions {
    enabled?: boolean; // allow premoves for color that can not move
    showDests?: boolean; // whether to add the premove-dest class on squares
    castle?: boolean; // whether to allow king castle premoves
    dests?: Key[]; // premove destinations for the current selection
    customDests?: Dests; // use custom valid premoves. {"a2" ["a3" "a4"] "b1" ["a3" "c3"]}
    events?: {
      set?: (orig: Key, dest: Key, metadata?: { ctrlKey?: boolean }) => void; // called after the premove has been set
      unset?: () => void; // called after the premove has been unset
    };
  }

  export interface PredroppableOptions {
    enabled?: boolean; // allow predrops for color that can not move
    events?: {
      set?: (role: Role, key: Key) => void; // called after the predrop has been set
      unset?: () => void; // called after the predrop has been unset
    };
  }

  export interface DraggableOptions {
    enabled?: boolean; // allow moves & premoves to use drag'n drop
    distance?: number; // minimum distance to initiate a drag; in pixels
    autoDistance?: boolean; // lets chessground set distance to zero when user drags pieces
    showGhost?: boolean; // show ghost of piece being dragged
    deleteOnDropOff?: boolean; // delete a piece when it is dropped off the board
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
    customSvg?: { html: string; center?: 'orig' | 'dest' | 'label' };
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
    enabled?: boolean; // can draw
    visible?: boolean; // can view
    defaultSnapToValidMove?: boolean;
    eraseOnClick?: boolean; // false to keep the drawing if a movable piece is clicked
    shapes?: DrawShape[];
    autoShapes?: DrawShape[];
    brushes?: DrawBrushes;
    onChange?: (shapes: DrawShape[]) => void; // called after drawable shapes change
  }

  export interface ReactChessGroundProps
    extends Omit<
      React.HTMLAttributes<HTMLDivElement>,
      'draggable' | 'onSelect'
    > {
    width?: string | number;
    height?: string | number;
    fen?: string; // chess position in Forsyth notation
    orientation?: Color; // board orientation. white | black
    turnColor?: Color; // turn to play. white | black
    check?: Color | boolean; // true for current color, false to unset
    lastMove?: Key[]; // squares part of the last move ["c3", "c4"]
    selected?: Key; // square currently selected "a1"
    coordinates?: boolean; // include coords attributes
    autoCastle?: boolean; // immediately complete the castle by moving the rook after king move
    viewOnly?: boolean; // don't bind events: the user will never be able to move pieces around
    disableContextMenu?: boolean; // because who needs a context menu on a chessboard
    resizable?: boolean;
    addPieceZIndex?: boolean; // adds z-index values to pieces (for 3D)
    highlight?: HighlightOptions;
    animation?: AnimationOptions;
    movable?: MovableOptions;
    premovable?: PremovableOptions;
    predroppable?: PredroppableOptions;
    draggable?: DraggableOptions;
    selectable?: { enabled?: boolean }; // disable to enforce dragging over click-click move
    drawable?: DrawableOptions;
    onChange?: () => void; // called after the situation changes on the board
    onMove?: (orig: Key, dest: Key, capturedPiece?: Piece) => void; // called after a piece has been moved
    onDropNewPiece?: (piece: Piece, key: Key) => void;
    onSelect?: (key: Key) => void; // called when a square is selected
  }

  class Chessground extends React.Component<ReactChessGroundProps> {}

  export default Chessground;
}
