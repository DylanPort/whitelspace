/**
 * WHISTLE Network TypeScript Types
 * @module types
 */

import { PublicKey, Connection } from '@solana/web3.js';

/**
 * Network type
 */
export type Network = 'mainnet' | 'devnet' | 'testnet' | 'localnet';

/**
 * SDK Configuration
 */
export interface WhistleConfig {
  /** Solana network to connect to */
  network?: Network;
  
  /** Custom RPC endpoint (overrides network) */
  rpcEndpoint?: string;
  
  /** Solana connection instance */
  connection?: Connection;
  
  /** Program ID (optional, uses default if not provided) */
  programId?: PublicKey;
  
  /** WHISTLE mint address (optional, uses default if not provided) */
  whistleMint?: PublicKey;
}

/**
 * Staking Pool account data
 */
export interface StakingPool {
  authority: PublicKey;
  whistleMint: PublicKey;
  tokenVault: PublicKey;
  totalStaked: bigint;
  totalAccessTokens: bigint;
  minStakeAmount: bigint;
  tokensPerWhistle: bigint;
  isActive: boolean;
  createdAt: bigint;
  cooldownPeriod: bigint;
  maxStakePerUser: bigint;
  rateLocked: boolean;
  bump: number;
}

/**
 * Staker Account data
 */
export interface StakerAccount {
  staker: PublicKey;
  stakedAmount: bigint;
  accessTokens: bigint;
  lastStakeTime: bigint;
  nodeOperator: boolean;
  votingPower: bigint;
  dataEncrypted: bigint;
  pendingRewards: bigint;
  bump: number;
}

/**
 * Provider Account data
 */
export interface ProviderAccount {
  provider: PublicKey;
  endpoint: string;
  registeredAt: bigint;
  isActive: boolean;
  stakeBond: bigint;
  totalEarned: bigint;
  pendingEarnings: bigint;
  queriesServed: bigint;
  reputationScore: bigint;
  uptimePercentage: bigint;
  responseTimeAvg: bigint;
  accuracyScore: bigint;
  lastHeartbeat: bigint;
  slashedAmount: bigint;
  penaltyCount: number;
  bump: number;
}

/**
 * Payment Vault account data
 */
export interface PaymentVault {
  authority: PublicKey;
  totalCollected: bigint;
  providerPool: bigint;
  bonusPool: bigint;
  treasury: bigint;
  stakerRewardsPool: bigint;
  lastDistribution: bigint;
  bump: number;
}

/**
 * Slash reason enum
 */
export enum SlashReason {
  LowUptime = 0,
  SlowResponse = 1,
  DataInaccuracy = 2,
}

/**
 * Transaction signature result
 */
export interface TransactionResult {
  signature: string;
  confirmed: boolean;
  error?: string;
}

/**
 * Query request parameters
 */
export interface QueryRequest {
  /** Wallet address to query */
  wallet?: string;
  
  /** Start date/time for range queries */
  from?: Date | number;
  
  /** End date/time for range queries */
  to?: Date | number;
  
  /** Maximum results to return */
  limit?: number;
  
  /** Offset for pagination */
  offset?: number;
  
  /** Program ID filter */
  programId?: string;
}

/**
 * Transaction data returned from queries
 */
export interface TransactionData {
  signature: string;
  slot: number;
  blockTime: number;
  from: string;
  to: string;
  amount: number;
  fee: number;
  programId: string;
  status: 'success' | 'failed';
  logs?: string[];
}

/**
 * Token balance data
 */
export interface TokenBalance {
  mint: string;
  amount: number;
  decimals: number;
  uiAmount: number;
}

/**
 * NFT metadata
 */
export interface NFTData {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
}

/**
 * Provider info for selection
 */
export interface ProviderInfo {
  publicKey: PublicKey;
  endpoint: string;
  reputationScore: number;
  uptimePercentage: number;
  responseTimeAvg: number;
  isActive: boolean;
  lastHeartbeat: Date;
}

/**
 * Stake transaction parameters
 */
export interface StakeParams {
  /** Amount to stake in WHISTLE tokens (human-readable, will be converted to base units) */
  amount: number;
  
  /** User's wallet public key */
  wallet: PublicKey;
}

/**
 * Unstake transaction parameters
 */
export interface UnstakeParams {
  /** Amount to unstake in WHISTLE tokens (human-readable, will be converted to base units) */
  amount: number;
  
  /** User's wallet public key */
  wallet: PublicKey;
}

/**
 * Provider registration parameters
 */
export interface RegisterProviderParams {
  /** Provider's wallet public key */
  provider: PublicKey;
  
  /** API endpoint URL */
  endpoint: string;
  
  /** Bond amount in WHISTLE tokens */
  bondAmount: number;
}

/**
 * Query payment parameters
 */
export interface QueryPaymentParams {
  /** User making the query */
  user: PublicKey;
  
  /** Provider serving the query */
  provider: PublicKey;
  
  /** Cost of the query in SOL */
  cost: number;
}

/**
 * SDK Events
 */
export type WhistleEvent = 
  | { type: 'staked'; data: { user: PublicKey; amount: bigint } }
  | { type: 'unstaked'; data: { user: PublicKey; amount: bigint } }
  | { type: 'provider-registered'; data: { provider: PublicKey; endpoint: string } }
  | { type: 'query-paid'; data: { user: PublicKey; provider: PublicKey; amount: bigint } }
  | { type: 'rewards-claimed'; data: { user: PublicKey; amount: bigint } };

/**
 * Event listener callback
 */
export type EventListener = (event: WhistleEvent) => void;



