/**
 * Ghost VPN - Privacy-Respecting Analytics
 * Monitor VPN usage without compromising privacy
 */

import { EventEmitter } from 'events';

export interface VPNMetrics {
  connectionTime: Date;
  disconnectionTime?: Date;
  duration: number; // seconds
  bytesTransferred: {
    upload: number;
    download: number;
    total: number;
  };
  averageLatency: number;
  serverRegion: string;
  protocol: string;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  reconnections: number;
  errors: number;
}

export interface ServerMetrics {
  ip: string;
  region: string;
  uptime: number; // percentage
  latency: number;
  bandwidth: {
    available: number;
    used: number;
  };
  connections: number;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: Date;
}

export class VPNAnalytics extends EventEmitter {
  private metrics: VPNMetrics | null = null;
  private sessionStart: Date | null = null;
  private totalBytesUp = 0;
  private totalBytesDown = 0;
  private latencyMeasurements: number[] = [];
  private reconnectCount = 0;
  private errorCount = 0;

  constructor() {
    super();
  }

  /**
   * Start tracking session
   */
  startSession(serverRegion: string, protocol: string): void {
    this.sessionStart = new Date();
    this.metrics = {
      connectionTime: this.sessionStart,
      duration: 0,
      bytesTransferred: {
        upload: 0,
        download: 0,
        total: 0
      },
      averageLatency: 0,
      serverRegion,
      protocol,
      connectionQuality: 'good',
      reconnections: 0,
      errors: 0
    };
    
    this.emit('session-started', this.metrics);
  }

  /**
   * End tracking session
   */
  endSession(): VPNMetrics | null {
    if (!this.metrics || !this.sessionStart) return null;

    this.metrics.disconnectionTime = new Date();
    this.metrics.duration = Math.floor(
      (this.metrics.disconnectionTime.getTime() - this.sessionStart.getTime()) / 1000
    );

    // Calculate final metrics
    this.metrics.bytesTransferred = {
      upload: this.totalBytesUp,
      download: this.totalBytesDown,
      total: this.totalBytesUp + this.totalBytesDown
    };

    this.metrics.averageLatency = this.calculateAverageLatency();
    this.metrics.connectionQuality = this.determineConnectionQuality();
    this.metrics.reconnections = this.reconnectCount;
    this.metrics.errors = this.errorCount;

    const finalMetrics = { ...this.metrics };
    
    // Reset for next session
    this.resetMetrics();
    
    this.emit('session-ended', finalMetrics);
    return finalMetrics;
  }

  /**
   * Update bandwidth usage
   */
  updateBandwidth(bytesUp: number, bytesDown: number): void {
    this.totalBytesUp += bytesUp;
    this.totalBytesDown += bytesDown;

    if (this.metrics) {
      this.metrics.bytesTransferred = {
        upload: this.totalBytesUp,
        download: this.totalBytesDown,
        total: this.totalBytesUp + this.totalBytesDown
      };
    }

    this.emit('bandwidth-updated', {
      upload: this.totalBytesUp,
      download: this.totalBytesDown
    });
  }

  /**
   * Record latency measurement
   */
  recordLatency(latency: number): void {
    this.latencyMeasurements.push(latency);
    
    // Keep only last 100 measurements
    if (this.latencyMeasurements.length > 100) {
      this.latencyMeasurements.shift();
    }

    if (this.metrics) {
      this.metrics.averageLatency = this.calculateAverageLatency();
      this.metrics.connectionQuality = this.determineConnectionQuality();
    }

    this.emit('latency-recorded', latency);
  }

  /**
   * Record reconnection
   */
  recordReconnection(): void {
    this.reconnectCount++;
    if (this.metrics) {
      this.metrics.reconnections = this.reconnectCount;
    }
    this.emit('reconnection-recorded');
  }

  /**
   * Record error
   */
  recordError(error: Error): void {
    this.errorCount++;
    if (this.metrics) {
      this.metrics.errors = this.errorCount;
    }
    this.emit('error-recorded', error);
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): VPNMetrics | null {
    if (!this.metrics || !this.sessionStart) return null;

    const now = new Date();
    return {
      ...this.metrics,
      duration: Math.floor((now.getTime() - this.sessionStart.getTime()) / 1000),
      bytesTransferred: {
        upload: this.totalBytesUp,
        download: this.totalBytesDown,
        total: this.totalBytesUp + this.totalBytesDown
      },
      averageLatency: this.calculateAverageLatency(),
      connectionQuality: this.determineConnectionQuality()
    };
  }

  /**
   * Get historical data (privacy-respecting)
   */
  async getHistoricalData(days: number = 30): Promise<VPNMetrics[]> {
    // In a real implementation, this would fetch from local storage
    // NO data sent to external servers - all local
    return [];
  }

  /**
   * Export analytics (for user)
   */
  exportAnalytics(): string {
    const data = this.getCurrentMetrics();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Calculate average latency
   */
  private calculateAverageLatency(): number {
    if (this.latencyMeasurements.length === 0) return 0;
    
    const sum = this.latencyMeasurements.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.latencyMeasurements.length);
  }

  /**
   * Determine connection quality based on latency
   */
  private determineConnectionQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    const avgLatency = this.calculateAverageLatency();
    
    if (avgLatency < 50) return 'excellent';
    if (avgLatency < 100) return 'good';
    if (avgLatency < 200) return 'fair';
    return 'poor';
  }

  /**
   * Reset metrics
   */
  private resetMetrics(): void {
    this.metrics = null;
    this.sessionStart = null;
    this.totalBytesUp = 0;
    this.totalBytesDown = 0;
    this.latencyMeasurements = [];
    this.reconnectCount = 0;
    this.errorCount = 0;
  }

  /**
   * Generate usage report
   */
  generateReport(): {
    summary: string;
    metrics: VPNMetrics | null;
    recommendations: string[];
  } {
    const metrics = this.getCurrentMetrics();
    
    if (!metrics) {
      return {
        summary: 'No active VPN session',
        metrics: null,
        recommendations: []
      };
    }

    const recommendations: string[] = [];

    // Analyze and provide recommendations
    if (metrics.averageLatency > 150) {
      recommendations.push('Consider connecting to a closer server for better latency');
    }

    if (metrics.reconnections > 3) {
      recommendations.push('Frequent reconnections detected. Check your internet connection');
    }

    if (metrics.errors > 5) {
      recommendations.push('Multiple errors detected. Consider changing VPN protocol');
    }

    const summary = `
Connected for ${this.formatDuration(metrics.duration)}
Quality: ${metrics.connectionQuality}
Data transferred: ${this.formatBytes(metrics.bytesTransferred.total)}
Average latency: ${metrics.averageLatency}ms
    `.trim();

    return {
      summary,
      metrics,
      recommendations
    };
  }

  /**
   * Format bytes for display
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  /**
   * Format duration for display
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}

export default VPNAnalytics;

