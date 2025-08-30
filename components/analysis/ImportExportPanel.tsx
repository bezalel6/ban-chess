'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  ClipboardCopyIcon,
  ClipboardPasteIcon,
  DownloadIcon,
  UploadIcon,
  FileInputIcon,
  RefreshCwIcon,
  EditIcon,
  EyeIcon,
} from 'lucide-react';

interface ImportExportPanelProps {
  onImport: (notation: string) => void;
  onExport: () => string;
  currentNotation: string;
}

export default function ImportExportPanel({
  onImport,
  onExport,
  currentNotation,
}: ImportExportPanelProps) {
  const [notationText, setNotationText] = useState('');
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [showSuccess, setShowSuccess] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync with current notation when in view mode
  useEffect(() => {
    if (mode === 'view') {
      setNotationText(currentNotation);
      setHasUnsavedChanges(false);
    }
  }, [currentNotation, mode]);

  // Toggle between view and edit modes
  const toggleMode = useCallback(() => {
    if (mode === 'edit' && hasUnsavedChanges) {
      const confirmSwitch = window.confirm(
        'You have unsaved changes. Switch to view mode without importing?'
      );
      if (!confirmSwitch) return;
    }

    setMode(prev => (prev === 'view' ? 'edit' : 'view'));
    if (mode === 'edit') {
      // Switching to view mode - refresh with current game
      setNotationText(currentNotation);
      setHasUnsavedChanges(false);
    }
  }, [mode, hasUnsavedChanges, currentNotation]);

  // Handle text changes
  const handleTextChange = useCallback(
    (value: string) => {
      setNotationText(value);
      setHasUnsavedChanges(value !== currentNotation);
    },
    [currentNotation]
  );

  // Import the notation
  const handleImport = useCallback(() => {
    if (notationText.trim() && notationText !== currentNotation) {
      onImport(notationText.trim());
      setShowSuccess('Game imported successfully');
      setHasUnsavedChanges(false);
      setMode('view');
      setTimeout(() => setShowSuccess(''), 2000);
    }
  }, [notationText, currentNotation, onImport]);

  // Refresh/Export current game
  const handleRefresh = useCallback(() => {
    const notation = onExport();
    setNotationText(notation);
    setShowSuccess('Game notation refreshed');
    setTimeout(() => setShowSuccess(''), 2000);
  }, [onExport]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    const textToCopy = notationText || currentNotation;
    if (textToCopy) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        setShowSuccess('Copied to clipboard');
        setTimeout(() => setShowSuccess(''), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  }, [notationText, currentNotation]);

  // Paste from clipboard
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setNotationText(text);
      setMode('edit');
      setHasUnsavedChanges(true);
      setShowSuccess('Pasted from clipboard');
      setTimeout(() => setShowSuccess(''), 2000);
    } catch (err) {
      console.error('Failed to paste:', err);
    }
  }, []);

  // Load from file
  const handleFileLoad = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = e => {
          const content = e.target?.result as string;
          setNotationText(content);
          setMode('edit');
          setHasUnsavedChanges(true);
          setShowSuccess(`Loaded ${file.name}`);
          setTimeout(() => setShowSuccess(''), 2000);
        };
        reader.readAsText(file);
      }
      // Reset the input so the same file can be loaded again
      event.target.value = '';
    },
    []
  );

  // Save to file
  const handleFileSave = useCallback(() => {
    const textToSave = notationText || currentNotation;
    if (!textToSave) return;

    const blob = new Blob([textToSave], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game_${new Date().toISOString().slice(0, 10)}.bcn`;
    a.click();
    URL.revokeObjectURL(url);

    setShowSuccess('File downloaded');
    setTimeout(() => setShowSuccess(''), 2000);
  }, [notationText, currentNotation]);

  // TODO(human): Implement the detectNotationType function
  // This function should analyze the notation text and return the type
  // Consider checking for BCN format (b:, m:) vs PGN format (1. e4 e5)

  return (
    <div className='w-full'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-lg sm:text-xl font-bold text-foreground'>
          Game Notation
        </h2>

        <button
          onClick={toggleMode}
          className='flex items-center gap-2 px-3 py-1.5 text-sm
                   bg-background-tertiary rounded-lg hover:bg-lichess-brown-500/20
                   transition-colors'
          title={mode === 'view' ? 'Edit notation' : 'View current game'}
        >
          {mode === 'view' ? (
            <>
              <EditIcon className='w-4 h-4' />
              Edit
            </>
          ) : (
            <>
              <EyeIcon className='w-4 h-4' />
              View
            </>
          )}
        </button>
      </div>

      {/* Status indicator */}
      {hasUnsavedChanges && (
        <div className='mb-2 text-sm text-amber-500'>
          ⚠ Unsaved changes - click Import to apply
        </div>
      )}

      {/* Main text area */}
      <div className='relative'>
        <textarea
          value={notationText}
          onChange={e => handleTextChange(e.target.value)}
          readOnly={mode === 'view'}
          placeholder={
            mode === 'edit'
              ? 'Paste BCN or PGN notation here...\nExample: b:e2e4 m:e7e5 b:d2d4 m:d7d5'
              : 'No game loaded'
          }
          className={`w-full h-40 p-3 bg-background rounded-lg border 
                   ${mode === 'edit' ? 'border-lichess-orange-500' : 'border-border'}
                   text-foreground placeholder-foreground-subtle 
                   ${mode === 'view' ? 'resize-none cursor-default' : 'resize-y'}
                   focus:outline-none focus:ring-2 focus:ring-lichess-orange-500
                   transition-colors`}
        />

        {/* Mode indicator badge */}
        <div
          className={`absolute top-2 right-2 px-2 py-1 text-xs rounded
                      ${
                        mode === 'edit'
                          ? 'bg-lichess-orange-500 text-white'
                          : 'bg-background-tertiary text-foreground-muted'
                      }`}
        >
          {mode === 'edit' ? 'EDIT MODE' : 'VIEW MODE'}
        </div>
      </div>

      {/* Action buttons */}
      <div className='flex flex-wrap gap-2 mt-3'>
        {mode === 'edit' ? (
          <>
            <button
              onClick={handleImport}
              disabled={!notationText.trim() || !hasUnsavedChanges}
              className='flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2 
                       bg-lichess-orange-500 text-white rounded-lg font-medium text-sm
                       hover:bg-lichess-orange-600 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <UploadIcon className='w-4 h-4' />
              Import
            </button>

            <button
              onClick={handlePaste}
              className='flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2 
                       bg-background-tertiary text-foreground rounded-lg font-medium text-sm
                       hover:bg-lichess-brown-500/20 transition-colors'
            >
              <ClipboardPasteIcon className='w-4 h-4' />
              Paste
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleRefresh}
              className='flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2 
                       bg-lichess-orange-500 text-white rounded-lg font-medium text-sm
                       hover:bg-lichess-orange-600 transition-colors'
            >
              <RefreshCwIcon className='w-4 h-4' />
              Refresh
            </button>

            <button
              onClick={handleCopy}
              disabled={!notationText && !currentNotation}
              className='flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2 
                       bg-background-tertiary text-foreground rounded-lg font-medium text-sm
                       hover:bg-lichess-brown-500/20 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <ClipboardCopyIcon className='w-4 h-4' />
              Copy
            </button>
          </>
        )}

        {/* File operations - available in both modes */}
        <label
          className='flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2 
                   bg-background-tertiary text-foreground rounded-lg font-medium text-sm
                   hover:bg-lichess-brown-500/20 transition-colors cursor-pointer'
        >
          <FileInputIcon className='w-4 h-4' />
          Load
          <input
            type='file'
            accept='.bcn,.pgn,.txt'
            onChange={handleFileLoad}
            className='hidden'
          />
        </label>

        <button
          onClick={handleFileSave}
          disabled={!notationText && !currentNotation}
          className='flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2 
                   bg-background-tertiary text-foreground rounded-lg font-medium text-sm
                   hover:bg-lichess-brown-500/20 transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed'
        >
          <DownloadIcon className='w-4 h-4' />
          Save
        </button>
      </div>

      {/* Success message */}
      {showSuccess && (
        <div className='mt-2 text-sm text-success-500'>✓ {showSuccess}</div>
      )}

      {/* Format help - collapsible */}
      <details className='mt-6'>
        <summary className='cursor-pointer text-sm font-semibold text-foreground-muted hover:text-foreground'>
          Format Guide
        </summary>
        <div className='mt-2 p-3 bg-background/50 rounded-lg'>
          <div className='text-xs text-foreground-subtle space-y-1'>
            <div className='font-semibold mb-1'>BCN Format:</div>
            <div>
              <span className='text-lichess-orange-500'>b:</span> Ban move
              (e.g., b:e2e4)
            </div>
            <div>
              <span className='text-lichess-orange-500'>m:</span> Regular move
              (e.g., m:d2d4)
            </div>
            <div>
              <span className='text-lichess-orange-500'>m:</span> Promotion
              (e.g., m:e7e8q)
            </div>
            <div className='mt-2 font-semibold'>PGN Format:</div>
            <div>Standard chess notation (e.g., 1. e4 e5 2. Nf3 Nc6)</div>
          </div>
        </div>
      </details>
    </div>
  );
}
