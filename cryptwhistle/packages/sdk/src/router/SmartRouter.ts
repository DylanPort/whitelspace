/**
 * Smart Router - Decides which compute layer to use
 * Optimizes for speed, cost, and privacy requirements
 */

import { ComputeLayer, QueryOptions } from '../types';

export interface RouterConfig {
  preferClientSide?: boolean;
}

export class SmartRouter {
  private config: RouterConfig;

  constructor(config: RouterConfig = {}) {
    this.config = {
      preferClientSide: config.preferClientSide !== false
    };
  }

  /**
   * Select optimal compute layer for a query
   */
  async selectLayer(
    task: string,
    input: any,
    options: QueryOptions = {}
  ): Promise<ComputeLayer> {
    // 1. If user explicitly requested a layer, use it
    if (options.computeLayer && options.computeLayer !== 'auto') {
      return options.computeLayer;
    }

    // 2. Check if client-side is possible
    const canRunClient = this.canRunClientSide(task, input);
    
    if (!canRunClient) {
      // Must use server
      return this.selectServerLayer(options);
    }

    // 3. Check constraints
    
    // If proof required, must use TEE or FHE
    if (options.requireProof) {
      return 'tee'; // TEE is faster than FHE
    }

    // If latency is critical, prefer client
    if (options.maxLatency && options.maxLatency < 500) {
      return canRunClient ? 'client' : 'tee';
    }

    // If cost is zero (free tier), prefer client
    if (options.maxCost === 0) {
      return canRunClient ? 'client' : 'tee';
    }

    // 4. Default routing strategy
    if (this.config.preferClientSide && canRunClient) {
      return 'client';
    }

    // 5. Estimate complexity and decide
    const complexity = this.estimateComplexity(task, input);
    
    if (complexity === 'low' && canRunClient) {
      return 'client';
    } else if (complexity === 'medium') {
      return 'tee';
    } else {
      return 'tee'; // High complexity, use TEE (FHE too slow)
    }
  }

  /**
   * Check if task can run client-side
   */
  private canRunClientSide(task: string, input: any): boolean {
    // Check browser support
    if (typeof window === 'undefined') {
      return false; // Not in browser
    }

    // Check WebAssembly support
    if (!('WebAssembly' in window)) {
      return false;
    }

    // Task-specific checks
    switch (task) {
      case 'sentiment-analysis':
      case 'text-classification':
      case 'translation':
        return true;
      
      case 'transcription':
        // Check if audio is reasonably sized
        const audioSize = input.audio instanceof Blob 
          ? input.audio.size 
          : input.audio.byteLength;
        return audioSize < 10 * 1024 * 1024; // < 10MB
      
      case 'chat':
        // Simple queries can run client-side
        const messageLength = Array.isArray(input.messages)
          ? input.messages.reduce((sum: number, m: any) => sum + m.content.length, 0)
          : input.messages.length;
        return messageLength < 1000; // Short conversations
      
      case 'privacy-analysis':
        return true; // Can fetch public data and analyze locally
      
      default:
        return false; // Unknown tasks go to server
    }
  }

  /**
   * Select between TEE and FHE for server-side compute
   */
  private selectServerLayer(options: QueryOptions): 'tee' | 'fhe' {
    // FHE is only needed for specific compliance requirements
    // For now, always use TEE (faster and cheaper)
    // In future, check if compliance proof is required
    return 'tee';
  }

  /**
   * Estimate query complexity
   */
  private estimateComplexity(
    task: string,
    input: any
  ): 'low' | 'medium' | 'high' {
    switch (task) {
      case 'sentiment-analysis':
      case 'text-classification':
        return 'low';
      
      case 'translation':
      case 'transcription':
        return 'medium';
      
      case 'chat':
        const messageCount = Array.isArray(input.messages) 
          ? input.messages.length 
          : 1;
        if (messageCount < 5) return 'low';
        if (messageCount < 20) return 'medium';
        return 'high';
      
      case 'privacy-analysis':
        return 'low';
      
      default:
        return 'medium';
    }
  }

  /**
   * Get device capabilities
   */
  static getDeviceCapabilities(): {
    hasWebGPU: boolean;
    hasWebAssembly: boolean;
    availableMemory: number;
    isMobile: boolean;
  } {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        hasWebGPU: false,
        hasWebAssembly: false,
        availableMemory: 0,
        isMobile: false
      };
    }

    return {
      hasWebGPU: 'gpu' in navigator,
      hasWebAssembly: 'WebAssembly' in window,
      availableMemory: (navigator as any).deviceMemory || 4, // GB
      isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    };
  }
}

