'use client';

import React, { useState, useCallback } from 'react';
import { ClipboardCopyIcon, ClipboardIcon, DownloadIcon, UploadIcon } from 'lucide-react';

interface ImportExportPanelProps {
  onImport: (notation: string) => void;
  onExport: () => string;
  currentNotation: string;
}

export default function ImportExportPanel({ 
  onImport, 
  onExport,
  currentNotation 
}: ImportExportPanelProps) {
  const [importText, setImportText] = useState('');
  const [exportText, setExportText] = useState('');
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  // Handle import
  const handleImport = useCallback(() => {
    if (importText.trim()) {
      onImport(importText.trim());
      setShowImportSuccess(true);
      setTimeout(() => setShowImportSuccess(false), 2000);
    }
  }, [importText, onImport]);

  // Handle export
  const handleExport = useCallback(() => {
    const notation = onExport();
    setExportText(notation);
  }, [onExport]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (exportText) {
      try {
        await navigator.clipboard.writeText(exportText);
        setShowCopySuccess(true);
        setTimeout(() => setShowCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  }, [exportText]);

  // Load from file
  const handleFileLoad = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportText(content);
      };
      reader.readAsText(file);
    }
  }, []);

  // Save to file
  const handleFileSave = useCallback(() => {
    const notation = exportText || onExport();
    const blob = new Blob([notation], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game_${new Date().toISOString().slice(0, 10)}.bcn`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportText, onExport]);

  return (
    <div className="w-full">
      <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6">
        Import / Export Game
      </h2>

      {/* Import Section */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-foreground-muted mb-3">
          Import BCN/PGN
        </h3>
        
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Paste BCN or PGN notation here...
Example: b:e2e4 m:e7e5 b:d2d4 m:d7d5"
          className="w-full h-32 p-3 bg-background rounded-lg border border-border 
                   text-foreground placeholder-foreground-subtle resize-none
                   focus:outline-none focus:ring-2 focus:ring-lichess-orange-500"
        />
        
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <button
            onClick={handleImport}
            disabled={!importText.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 
                     bg-lichess-orange-500 text-white rounded-lg font-medium text-sm
                     hover:bg-lichess-orange-600 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UploadIcon className="w-4 h-4" />
            Import
          </button>
          
          <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 
                         bg-background-tertiary text-foreground rounded-lg font-medium text-sm
                         hover:bg-lichess-brown-500/20 transition-colors cursor-pointer">
            <ClipboardIcon className="w-4 h-4" />
            Load File
            <input
              type="file"
              accept=".bcn,.pgn,.txt"
              onChange={handleFileLoad}
              className="hidden"
            />
          </label>
        </div>
        
        {showImportSuccess && (
          <div className="mt-2 text-sm text-success-500">
            ✓ Game imported successfully
          </div>
        )}
      </div>

      <div className="border-t border-border my-6" />

      {/* Export Section */}
      <div>
        <h3 className="text-sm font-semibold text-foreground-muted mb-3">
          Export BCN
        </h3>
        
        <textarea
          value={exportText || currentNotation}
          readOnly
          placeholder="Game notation will appear here..."
          className="w-full h-32 p-3 bg-background rounded-lg border border-border 
                   text-foreground placeholder-foreground-subtle resize-none
                   focus:outline-none focus:ring-2 focus:ring-lichess-orange-500"
        />
        
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <button
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-2 
                     bg-lichess-orange-500 text-white rounded-lg font-medium text-sm
                     hover:bg-lichess-orange-600 transition-colors"
          >
            <DownloadIcon className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="truncate">Generate</span>
          </button>
          
          <button
            onClick={handleCopy}
            disabled={!exportText && !currentNotation}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-2 
                     bg-background-tertiary text-foreground rounded-lg font-medium text-sm
                     hover:bg-lichess-brown-500/20 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ClipboardCopyIcon className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="truncate">Copy</span>
          </button>
          
          <button
            onClick={handleFileSave}
            disabled={!exportText && !currentNotation}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-2 
                     bg-background-tertiary text-foreground rounded-lg font-medium text-sm
                     hover:bg-lichess-brown-500/20 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DownloadIcon className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="truncate">Save</span>
          </button>
        </div>
        
        {showCopySuccess && (
          <div className="mt-2 text-sm text-success-500">
            ✓ Copied to clipboard
          </div>
        )}
      </div>

      {/* Format Help */}
      <div className="mt-6 p-3 bg-background/50 rounded-lg">
        <h4 className="text-xs font-semibold text-foreground-muted mb-2">
          BCN Format
        </h4>
        <div className="text-xs text-foreground-subtle space-y-1">
          <div><span className="text-lichess-orange-500">b:</span> Ban move (e.g., b:e2e4)</div>
          <div><span className="text-lichess-orange-500">m:</span> Regular move (e.g., m:d2d4)</div>
          <div><span className="text-lichess-orange-500">m:</span> Promotion (e.g., m:e7e8q)</div>
        </div>
      </div>
    </div>
  );
}