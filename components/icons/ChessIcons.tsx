import React from 'react';
import type { LucideProps } from 'lucide-react';

// Custom Chess Piece Icons as React Components
// These are simplified representations optimized for small display sizes

export const ChessKnight: React.FC<LucideProps> = props => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    {...props}
  >
    <path d='M7 22h10M9 22v-2M15 22v-2M6 18h12M8 18v-2c0-1.5-1-3-1-3s-1-2 0-3 3-3 3-3l1-2c0-1 1-2 2-2s2 1 2 2c0 0 1 1 1 2s-1 2-1 2c0 0 1 1 1 3v5' />
    <circle cx='11' cy='9' r='0.5' fill='currentColor' />
  </svg>
);

export const ChessPawn: React.FC<LucideProps> = props => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    {...props}
  >
    <path d='M7 22h10M9 22v-2M15 22v-2M8 20h8M10 20v-3M14 20v-3M9 17h6M10 17v-3c-1 0-2-1-2-2 0-2 2-4 4-4s4 2 4 4c0 1-1 2-2 2v3' />
    <circle cx='12' cy='8' r='2' />
  </svg>
);

export const ChessRook: React.FC<LucideProps> = props => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    {...props}
  >
    <path d='M6 22h12M8 22v-2M16 22v-2M7 20h10M9 20v-10M15 20v-10M8 10h8M8 10V6M16 10V6M8 6h2M11 6h2M14 6h2' />
  </svg>
);

export const ChessBishop: React.FC<LucideProps> = props => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    {...props}
  >
    <path d='M7 22h10M9 22v-2M15 22v-2M8 20h8M10 20v-3M14 20v-3M9 17h6M10 17v-4c-1-1-2-3-2-5 0-2 2-4 4-4s4 2 4 4c0 2-1 4-2 5v4' />
    <circle cx='12' cy='6' r='1' />
    <path d='M12 9v2' />
  </svg>
);

export const ChessQueen: React.FC<LucideProps> = props => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    {...props}
  >
    <path d='M6 22h12M8 22v-2M16 22v-2M7 20h10M9 20v-6M15 20v-6M8 14h8M9 14l-2-8M15 14l2-8M12 14v-8' />
    <circle cx='9' cy='5' r='1' />
    <circle cx='12' cy='4' r='1' />
    <circle cx='15' cy='5' r='1' />
  </svg>
);

export const ChessKing: React.FC<LucideProps> = props => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    {...props}
  >
    <path d='M6 22h12M8 22v-2M16 22v-2M7 20h10M9 20v-6M15 20v-6M8 14h8M9 14l-1-6M15 14l1-6M10 8h4M12 8V6M12 4v2M11 5h2' />
  </svg>
);

// Ban icon specific for 2ban chess - combining a chess piece with a ban symbol
export const ChessBan: React.FC<LucideProps> = props => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    {...props}
  >
    <circle cx='12' cy='12' r='10' />
    <path d='M4.93 4.93l14.14 14.14' />
    <path d='M9 12v-2c0-1 1-2 3-2s3 1 3 2v2M10 16h4' />
  </svg>
);

// Castling move icon - showing rook and king swap
export const ChessCastle: React.FC<LucideProps> = props => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    {...props}
  >
    <path d='M5 12h14M5 12l3-3M5 12l3 3M19 12l-3-3M19 12l-3 3' />
    <rect x='3' y='8' width='4' height='8' rx='0.5' />
    <rect x='17' y='8' width='4' height='8' rx='0.5' />
    <path d='M3 8V7M7 8V7M17 8V7M21 8V7' />
  </svg>
);

// Promotion icon - pawn to queen transformation
export const ChessPromotion: React.FC<LucideProps> = props => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    {...props}
  >
    <path d='M12 2v8M9 5l3-3 3 3' />
    <circle cx='12' cy='14' r='2' />
    <path d='M10 16v2M14 16v2M8 18h8M9 20h6M10 22h4' />
    <circle cx='9' cy='11' r='0.5' fill='currentColor' />
    <circle cx='12' cy='10' r='0.5' fill='currentColor' />
    <circle cx='15' cy='11' r='0.5' fill='currentColor' />
  </svg>
);
