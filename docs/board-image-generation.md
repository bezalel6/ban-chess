# Chess Board Image Generation Research

## Overview
This document outlines various approaches for generating chess board screenshots/images at specific positions, with or without ban move indicators, for the 2ban-2chess application.

## Use Cases
- **Social Media Sharing**: Players sharing interesting positions
- **Game Thumbnails**: Visual previews in user profiles and game lists
- **Analysis Diagrams**: Teaching materials with ban moves highlighted
- **Open Graph Images**: Preview cards when sharing game links
- **Game Documentation**: Creating visual records of important positions

## Implementation Options

### Option 1: Client-Side Screenshot (Quickest Implementation)

Using `html2canvas` or `dom-to-image` to capture the existing ChessBoard component.

#### Installation
```bash
npm install html2canvas
# or
npm install dom-to-image
```

#### Implementation Example
```typescript
// utils/board-capture.ts
import html2canvas from 'html2canvas';

export async function captureBoard(boardElement: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(boardElement, {
    backgroundColor: null,
    scale: 2, // Higher quality
    logging: false
  });
  
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

export async function downloadBoardImage(boardElement: HTMLElement, filename?: string) {
  const blob = await captureBoard(boardElement);
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.download = filename || `chess-position-${Date.now()}.png`;
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
}

export async function copyBoardToClipboard(boardElement: HTMLElement) {
  const blob = await captureBoard(boardElement);
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob })
  ]);
}
```

#### Pros
- Reuses existing ChessBoard component with all styling
- Captures ban arrows and highlights accurately
- No additional rendering logic needed
- Works immediately without server changes

#### Cons
- Client-side only (can't generate images server-side)
- Quality depends on screen resolution
- Requires user interaction (can't pre-generate)

### Option 2: Server-Side API with chess-image-generator

Creating an API endpoint using specialized npm packages.

#### Available NPM Packages

##### @flynnhillier/chessboard-image-gen (Most Recent)
- Published: 10 months ago
- TypeScript support
- Customizable styling
```bash
npm install @flynnhillier/chessboard-image-gen
```

##### chess-image-generator
- Mature package (5 years old but stable)
- Supports FEN, PGN, array formats
- Customizable colors and styles
```bash
npm install chess-image-generator
```

##### chess-image-generator-ts
- TypeScript version
- Modern API
- Board flipping options
```bash
npm install chess-image-generator-ts
```

#### Implementation Example
```typescript
// app/api/board-image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import ChessImageGenerator from 'chess-image-generator-ts';
import { createCanvas, loadImage } from 'canvas';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fen = searchParams.get('fen') || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
  const ban = searchParams.get('ban'); // e.g., "e2e4"
  const orientation = searchParams.get('orientation') || 'white';
  const size = parseInt(searchParams.get('size') || '400');
  
  // Generate base chess board
  const imageGenerator = new ChessImageGenerator({
    size,
    light: '#f0d9b5',
    dark: '#b58863',
    orientation: orientation as 'white' | 'black'
  });
  
  let buffer = await imageGenerator.generateBuffer(fen);
  
  // Add ban arrow overlay if needed
  if (ban && ban.length === 4) {
    buffer = await addBanArrow(buffer, ban, size);
  }
  
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    }
  });
}

async function addBanArrow(imageBuffer: Buffer, ban: string, boardSize: number): Promise<Buffer> {
  const canvas = createCanvas(boardSize, boardSize);
  const ctx = canvas.getContext('2d');
  
  // Load the chess board image
  const img = await loadImage(imageBuffer);
  ctx.drawImage(img, 0, 0);
  
  // Parse ban move (e.g., "e2e4")
  const from = ban.substring(0, 2);
  const to = ban.substring(2, 4);
  
  // Convert algebraic notation to pixel coordinates
  const squareSize = boardSize / 8;
  const fromCoords = getSquareCenter(from, squareSize);
  const toCoords = getSquareCenter(to, squareSize);
  
  // Draw red arrow
  ctx.strokeStyle = '#FF0000';
  ctx.fillStyle = '#FF0000';
  ctx.lineWidth = squareSize / 10;
  ctx.globalAlpha = 0.8;
  
  drawArrow(ctx, fromCoords.x, fromCoords.y, toCoords.x, toCoords.y);
  
  return canvas.toBuffer('image/png');
}
```

#### API Usage
```
GET /api/board-image?fen=<FEN>&ban=e2e4&orientation=white&size=400
```

### Option 3: Hybrid Component with Export Feature

A dedicated React component that handles both display and export functionality.

```typescript
// components/ExportableBoard.tsx
import { useState } from 'react';
import ChessBoard from '@/components/ChessBoard';
import { captureBoard, downloadBoardImage, copyBoardToClipboard } from '@/utils/board-capture';

interface ExportableBoardProps {
  fen: string;
  ban?: { from: string; to: string };
  gameInfo?: {
    white: string;
    black: string;
    moveNumber: number;
  };
}

export function ExportableBoard({ fen, ban, gameInfo }: ExportableBoardProps) {
  const [isExporting, setIsExporting] = useState(false);
  
  const handleDownload = async () => {
    setIsExporting(true);
    const boardElement = document.getElementById('exportable-board');
    if (boardElement) {
      const filename = gameInfo 
        ? `${gameInfo.white}-vs-${gameInfo.black}-move-${gameInfo.moveNumber}.png`
        : undefined;
      await downloadBoardImage(boardElement, filename);
    }
    setIsExporting(false);
  };
  
  const handleCopy = async () => {
    setIsExporting(true);
    const boardElement = document.getElementById('exportable-board');
    if (boardElement) {
      await copyBoardToClipboard(boardElement);
      // Show success toast
    }
    setIsExporting(false);
  };
  
  const handleShare = async () => {
    if (!navigator.share) {
      handleCopy();
      return;
    }
    
    const boardElement = document.getElementById('exportable-board');
    if (boardElement) {
      const blob = await captureBoard(boardElement);
      const file = new File([blob], 'chess-position.png', { type: 'image/png' });
      
      await navigator.share({
        files: [file],
        title: 'Chess Position',
        text: gameInfo 
          ? `${gameInfo.white} vs ${gameInfo.black} - Move ${gameInfo.moveNumber}`
          : 'Check out this chess position!'
      });
    }
  };
  
  return (
    <div className="relative">
      <div id="exportable-board">
        <ChessBoard fen={fen} ban={ban} />
        {gameInfo && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
            <div className="text-sm">
              {gameInfo.white} vs {gameInfo.black} • Move {gameInfo.moveNumber}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex gap-2 mt-2">
        <button onClick={handleDownload} disabled={isExporting}>
          Download
        </button>
        <button onClick={handleCopy} disabled={isExporting}>
          Copy
        </button>
        <button onClick={handleShare} disabled={isExporting}>
          Share
        </button>
      </div>
    </div>
  );
}
```

### Option 4: Puppeteer for High-Quality Renders

Using Puppeteer (already installed) for server-side, pixel-perfect screenshots.

```typescript
// app/api/board-screenshot/route.ts
import puppeteer from 'puppeteer';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fen = searchParams.get('fen');
  const ban = searchParams.get('ban');
  const size = parseInt(searchParams.get('size') || '800');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: size, height: size });
    
    // Navigate to a special route that renders just the board
    const url = `${process.env.NEXT_PUBLIC_BASE_URL}/board-only?fen=${encodeURIComponent(fen)}&ban=${ban}`;
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    // Wait for board to render
    await page.waitForSelector('.chess-board-inner');
    
    const screenshot = await page.screenshot({
      type: 'png',
      encoding: 'binary',
      omitBackground: true
    });
    
    return new NextResponse(screenshot, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } finally {
    await browser.close();
  }
}
```

#### Pros
- Pixel-perfect rendering
- Exactly matches the web UI
- Supports all visual features (arrows, highlights, etc.)

#### Cons
- Resource intensive
- Slower than other methods
- Requires headless browser setup

## Recommended Implementation Strategy

### Phase 1: Quick Client-Side Solution
1. Install `html2canvas`
2. Add "Share Position" button to GameClient
3. Implement download/copy/share functions
4. Include game metadata overlay

### Phase 2: Scalable Server Solution
1. Create `/api/board-image` endpoint
2. Use `chess-image-generator-ts` for base board rendering
3. Implement canvas-based ban arrow overlay
4. Add caching layer for common positions

### Phase 3: Enhanced Features
1. Generate thumbnails for completed games
2. Create Open Graph images for game URLs
3. Add position editor with export capability
4. Implement batch generation for game analysis

## Additional Considerations

### Performance
- Cache generated images using Redis or CDN
- Pre-generate thumbnails for completed games
- Use WebP format for smaller file sizes

### Accessibility
- Include alt text with FEN notation
- Provide text-based position description
- Support high contrast mode

### Security
- Validate FEN strings to prevent injection
- Rate limit image generation endpoints
- Sanitize filenames for downloads

## External Resources

### Web-Based Tools
- **ChessVision.ai FEN to Image**: Simple tool with persistent links
- **ChessboardImage.com**: Direct URL-based image generation

### Libraries
- [chess-image-generator GitHub](https://github.com/andyruwruw/chess-image-generator)
- [Canvas API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [html2canvas Documentation](https://html2canvas.hertzen.com/documentation)

## Implementation Priority

1. **High Priority**: Client-side screenshot for immediate sharing
2. **Medium Priority**: Server API for thumbnails and previews
3. **Low Priority**: Puppeteer for perfect rendering (only if needed)

## Estimated Implementation Time

- **Client-side solution**: 2-3 hours
- **Basic server API**: 3-4 hours
- **Full feature set**: 8-10 hours

---

*Last updated: January 2025*
*Author: 2ban-2chess Development Team*