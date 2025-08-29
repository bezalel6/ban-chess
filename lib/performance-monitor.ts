'use client';

// Performance monitoring utilities for Chrome DevTools
export function markStart(label: string) {
  if (typeof window !== 'undefined' && window.performance) {
    window.performance.mark(`${label}-start`);
  }
}

export function markEnd(label: string) {
  if (typeof window !== 'undefined' && window.performance) {
    window.performance.mark(`${label}-end`);
    try {
      window.performance.measure(label, `${label}-start`, `${label}-end`);
      const measure = window.performance.getEntriesByName(label, 'measure')[0];
      if (measure && measure.duration > 16) {
        console.warn(`⚠️ Slow operation: ${label} took ${measure.duration.toFixed(2)}ms`);
      }
    } catch {
      // Ignore if start mark doesn't exist
    }
  }
}

// Hook to track component render performance
export function useRenderTracking(componentName: string) {
  if (process.env.NODE_ENV === 'development') {
    markStart(`render-${componentName}`);
    // This will be called after render
    setTimeout(() => markEnd(`render-${componentName}`), 0);
  }
}