'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Error boundary to catch React 19 compatibility issues
class ChessBoardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ChessBoard error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='flex items-center justify-center h-full min-h-[400px] bg-background-secondary rounded-lg p-8'>
          <div className='text-center max-w-md'>
            <h3 className='text-lg font-semibold mb-2'>
              Chess Board Loading Issue
            </h3>
            <p className='text-foreground-muted mb-4'>
              The chess board component encountered a compatibility issue with
              React 19.
            </p>
            <p className='text-sm text-foreground-muted mb-4'>
              This is a known issue with the chess library. Try refreshing the
              page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className='px-4 py-2 bg-lichess-orange-500 text-white rounded-lg hover:bg-lichess-orange-600'
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChessBoardErrorBoundary;
