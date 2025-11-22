'use client';

import { useEffect } from 'react';

/**
 * Suppresses non-critical WebSocket errors from Solana Web3.js
 * These errors occur when the RPC doesn't support WebSockets, but
 * the library falls back to polling, so functionality isn't affected.
 */
export default function WebSocketErrorSuppressor() {
  useEffect(() => {
    // Suppress WebSocket connection errors from Solana Web3.js
    const originalError = console.error;
    const originalWarn = console.warn;

    const errorFilter = (message: any, ...args: any[]) => {
      // Filter out WebSocket errors from Solana Web3.js
      const messageStr = String(message);
      if (
        messageStr.includes('ws error') ||
        messageStr.includes('WebSocket connection') ||
        messageStr.includes('WebSocketBrowserImpl') ||
        (messageStr.includes('failed') && args.some(arg => String(arg).includes('wss://')))
      ) {
        // Suppress these errors - they're non-critical
        return;
      }
      originalError(message, ...args);
    };

    const warnFilter = (message: any, ...args: any[]) => {
      // Filter out WebSocket warnings
      const messageStr = String(message);
      if (
        messageStr.includes('ws error') ||
        messageStr.includes('WebSocket connection') ||
        messageStr.includes('WebSocketBrowserImpl')
      ) {
        // Suppress these warnings
        return;
      }
      originalWarn(message, ...args);
    };

    // Override console methods
    console.error = errorFilter;
    console.warn = warnFilter;

    // Cleanup on unmount
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  return null;
}

