/**
 * Whistle AI SDK - Main Entry Point
 * 
 * Hybrid AI SDK that intelligently routes between:
 * - Client-side AI (browser, instant, free)
 * - TEE backend (server, fast, cheap)
 * - FHE backend (future, compliance, secure)
 */

export { WhistleAI } from './WhistleAI';
export { ClientAI } from './client/ClientAI';
export { ServerAI } from './server/ServerAI';
export { SmartRouter } from './router/SmartRouter';
export { SolanaIntegration } from './solana/SolanaIntegration';
export { ZKProofs } from './crypto/ZKProofs';

// Types
export * from './types';

// Utils
export * from './utils';

