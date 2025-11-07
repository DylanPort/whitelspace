/**
 * Type definitions for Whistle AI SDK
 */

import { PublicKey, Transaction } from '@solana/web3.js';

export type ComputeLayer = 'client' | 'tee' | 'fhe' | 'auto';

export interface WhistleAIConfig {
  /** API endpoint for server-side compute */
  apiUrl?: string;
  /** Solana wallet for payments */
  wallet?: any; // Solana wallet adapter
  /** Prefer client-side computation */
  preferClientSide?: boolean;
  /** API key for authenticated requests */
  apiKey?: string;
  /** Custom RPC endpoint */
  rpcUrl?: string;
  /** Enable debug logging */
  debug?: boolean;
}

export interface QueryOptions {
  /** Preferred compute layer */
  computeLayer?: ComputeLayer;
  /** Require ZK proof of computation */
  requireProof?: boolean;
  /** Maximum latency in ms */
  maxLatency?: number;
  /** Maximum cost in SOL */
  maxCost?: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

export interface QueryResult<T = any> {
  /** The actual result */
  result: T;
  /** Metadata about execution */
  metadata: {
    /** Where it was computed */
    computeLayer: ComputeLayer;
    /** Duration in milliseconds */
    duration: number;
    /** Cost in SOL (0 for client-side) */
    cost: number;
    /** ZK proof if requested */
    proof?: string;
    /** Model used */
    model?: string;
    /** Timestamp */
    timestamp: number;
  };
}

export interface SentimentResult {
  label: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  score: number;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language?: string;
  chunks?: Array<{
    text: string;
    timestamp: [number, number];
  }>;
}

export interface TranslationResult {
  translation: string;
  confidence: number;
  sourceLang: string;
  targetLang: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  message: string;
  model: string;
  tokensUsed?: number;
}

export interface PrivacyAnalysis {
  score: number; // 0-10
  totalTransactions: number;
  privateTransactions: number;
  publicTransactions: number;
  risks: string[];
  recommendations: string[];
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  size: string;
  averageLatency: number;
  cost: number;
  layer: ComputeLayer;
  tasks: string[];
}

export interface PaymentParams {
  amount: number; // in SOL
  recipient: PublicKey;
  metadata?: Record<string, any>;
}

export interface X402Payment {
  transaction: Transaction;
  signature: string;
  amount: number;
  timestamp: number;
}

// Events
export type WhistleAIEvent = 
  | 'ready'
  | 'model-loaded'
  | 'query-start'
  | 'query-end'
  | 'error'
  | 'payment-required'
  | 'payment-complete';

export interface WhistleAIEventMap {
  'ready': void;
  'model-loaded': { modelId: string; layer: ComputeLayer };
  'query-start': { queryId: string };
  'query-end': { queryId: string; result: QueryResult };
  'error': { error: Error; context?: any };
  'payment-required': { amount: number };
  'payment-complete': { signature: string };
}

