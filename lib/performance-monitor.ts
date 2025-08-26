/**
 * Performance monitoring utility for real-time metrics
 */

export interface PerformanceMetrics {
  fps: number;
  latency: number;
  memoryUsage: number;
  renderTime: number;
  networkLatency: number;
  timestamp: number;
}

export interface PerformanceThresholds {
  fpsWarning: number;
  fpsCritical: number;
  latencyWarning: number;
  latencyCritical: number;
  memoryWarning: number;
  memoryCritical: number;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  fpsWarning: 30,
  fpsCritical: 15,
  latencyWarning: 200,
  latencyCritical: 500,
  memoryWarning: 100 * 1024 * 1024, // 100MB
  memoryCritical: 200 * 1024 * 1024, // 200MB
};

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsHistory = 100;
  private fpsFrames: number[] = [];
  private lastFrameTime = performance.now();
  private rafId: number | null = null;
  private thresholds: PerformanceThresholds;
  private callbacks: Map<string, (metrics: PerformanceMetrics) => void> = new Map();

  constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * Start monitoring performance
   */
  start(): void {
    if (this.rafId !== null) return;
    
    this.measureFrame();
  }

  /**
   * Stop monitoring performance
   */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Measure frame performance
   */
  private measureFrame = (): void => {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Calculate FPS
    if (deltaTime > 0) {
      const fps = 1000 / deltaTime;
      this.fpsFrames.push(fps);
      
      // Keep only last 60 frames for average
      if (this.fpsFrames.length > 60) {
        this.fpsFrames.shift();
      }
    }

    // Collect metrics every second
    if (this.fpsFrames.length >= 60 || (now % 1000) < 16) {
      this.collectMetrics();
    }

    this.rafId = requestAnimationFrame(this.measureFrame);
  };

  /**
   * Collect current performance metrics
   */
  private collectMetrics(): void {
    const metrics: PerformanceMetrics = {
      fps: this.calculateAverageFPS(),
      latency: this.getLatency(),
      memoryUsage: this.getMemoryUsage(),
      renderTime: this.getRenderTime(),
      networkLatency: this.getNetworkLatency(),
      timestamp: Date.now(),
    };

    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    // Check thresholds and notify
    this.checkThresholds(metrics);
    
    // Notify callbacks
    this.callbacks.forEach(callback => callback(metrics));
  }

  /**
   * Calculate average FPS
   */
  private calculateAverageFPS(): number {
    if (this.fpsFrames.length === 0) return 60;
    
    const sum = this.fpsFrames.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.fpsFrames.length);
  }

  /**
   * Get current latency (placeholder - should be set by WebSocket)
   */
  private getLatency(): number {
    // This should be set by WebSocket ping/pong
    return (window as any).__wsLatency || 0;
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Get render time using Performance API
   */
  private getRenderTime(): number {
    const entries = performance.getEntriesByType('measure');
    const renderEntries = entries.filter(e => e.name.includes('render'));
    
    if (renderEntries.length > 0) {
      const lastRender = renderEntries[renderEntries.length - 1];
      return lastRender.duration;
    }
    
    return 0;
  }

  /**
   * Get network latency from resource timing
   */
  private getNetworkLatency(): number {
    const entries = performance.getEntriesByType('resource');
    const wsEntries = entries.filter(e => e.name.includes('ws://') || e.name.includes('wss://'));
    
    if (wsEntries.length > 0) {
      const lastEntry = wsEntries[wsEntries.length - 1] as PerformanceResourceTiming;
      return lastEntry.duration;
    }
    
    return 0;
  }

  /**
   * Check performance thresholds
   */
  private checkThresholds(metrics: PerformanceMetrics): void {
    const warnings: string[] = [];
    const critical: string[] = [];

    if (metrics.fps < this.thresholds.fpsCritical) {
      critical.push(`FPS critically low: ${metrics.fps}`);
    } else if (metrics.fps < this.thresholds.fpsWarning) {
      warnings.push(`FPS low: ${metrics.fps}`);
    }

    if (metrics.latency > this.thresholds.latencyCritical) {
      critical.push(`Latency critically high: ${metrics.latency}ms`);
    } else if (metrics.latency > this.thresholds.latencyWarning) {
      warnings.push(`Latency high: ${metrics.latency}ms`);
    }

    if (metrics.memoryUsage > this.thresholds.memoryCritical) {
      critical.push(`Memory usage critical: ${Math.round(metrics.memoryUsage / 1024 / 1024)}MB`);
    } else if (metrics.memoryUsage > this.thresholds.memoryWarning) {
      warnings.push(`Memory usage high: ${Math.round(metrics.memoryUsage / 1024 / 1024)}MB`);
    }

    // Log warnings and critical issues
    if (critical.length > 0) {
      console.error('Performance Critical:', critical.join(', '));
    }
    if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn('Performance Warning:', warnings.join(', '));
    }
  }

  /**
   * Subscribe to performance updates
   */
  subscribe(id: string, callback: (metrics: PerformanceMetrics) => void): void {
    this.callbacks.set(id, callback);
  }

  /**
   * Unsubscribe from performance updates
   */
  unsubscribe(id: string): void {
    this.callbacks.delete(id);
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get average metrics over a time period
   */
  getAverageMetrics(periodMs: number = 60000): PerformanceMetrics | null {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp <= periodMs);
    
    if (recentMetrics.length === 0) return null;

    return {
      fps: Math.round(recentMetrics.reduce((sum, m) => sum + m.fps, 0) / recentMetrics.length),
      latency: Math.round(recentMetrics.reduce((sum, m) => sum + m.latency, 0) / recentMetrics.length),
      memoryUsage: Math.round(recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length),
      renderTime: Math.round(recentMetrics.reduce((sum, m) => sum + m.renderTime, 0) / recentMetrics.length),
      networkLatency: Math.round(recentMetrics.reduce((sum, m) => sum + m.networkLatency, 0) / recentMetrics.length),
      timestamp: now,
    };
  }

  /**
   * Mark a custom performance event
   */
  mark(name: string): void {
    performance.mark(name);
  }

  /**
   * Measure between two marks
   */
  measure(name: string, startMark: string, endMark: string): void {
    try {
      performance.measure(name, startMark, endMark);
    } catch (e) {
      console.error('Performance measurement failed:', e);
    }
  }

  /**
   * Clear performance data
   */
  clear(): void {
    this.metrics = [];
    this.fpsFrames = [];
    performance.clearMarks();
    performance.clearMeasures();
  }
}

// Export singleton instance
const performanceMonitor = new PerformanceMonitor();

// Auto-start in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  performanceMonitor.start();
}

export default performanceMonitor;