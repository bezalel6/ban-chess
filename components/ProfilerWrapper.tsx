'use client';

import { Profiler, ProfilerOnRenderCallback, ReactNode } from 'react';

const onRenderCallback: ProfilerOnRenderCallback = (
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) => {
  // Log performance metrics to console in development
  if (process.env.NODE_ENV === 'development') {
    if (actualDuration > 16) { // Log if render takes more than 16ms (60fps threshold)
      console.warn(`⚠️ Slow render detected in ${id}:`, {
        phase,
        actualDuration: `${actualDuration.toFixed(2)}ms`,
        baseDuration: `${baseDuration.toFixed(2)}ms`,
        timestamp: new Date(commitTime).toISOString(),
      });
    }
    
    // Log to window for Chrome DevTools Performance tab integration
    if (typeof window !== 'undefined' && (window as any).performance) {
      (window as any).performance.mark(`${id}-${phase}-end`);
      (window as any).performance.measure(
        `${id}-${phase}`,
        undefined,
        `${id}-${phase}-end`
      );
    }
  }
};

interface ProfilerWrapperProps {
  id: string;
  children: ReactNode;
}

export default function ProfilerWrapper({ id, children }: ProfilerWrapperProps) {
  if (process.env.NODE_ENV === 'production') {
    return <>{children}</>;
  }

  return (
    <Profiler id={id} onRender={onRenderCallback}>
      {children}
    </Profiler>
  );
}