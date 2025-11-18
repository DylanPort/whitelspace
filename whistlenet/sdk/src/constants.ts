/**
 * WHISTLE Network Constants
 * @module constants
 */

import { PublicKey } from '@solana/web3.js';

/**
 * WHISTLE Token Mint Address
 * Official mint: 6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump
 */
export const WHISTLE_MINT = new PublicKey('6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump');

/**
 * Smart Contract Program ID
 * Deployed on Mainnet: whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr (REINITIALIZED - 155-byte pool!)
 * Authority: 6BNdVMgx2JZJPvkRCLyV2LLxft4S1cwuqoX2BS9eFyvh
 */
export const PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr');

/**
 * Network constants from smart contract
 */
export const NETWORK_CONSTANTS = {
  /** Minimum WHISTLE tokens to stake */
  MIN_STAKE_AMOUNT: 100_000_000, // 100 WHISTLE (with decimals)
  
  /** Minimum provider bond in WHISTLE tokens */
  MIN_PROVIDER_BOND: 1_000_000_000, // 1000 WHISTLE
  
  /** Cost per query in lamports (SOL) */
  QUERY_COST: 10_000, // 0.00001 SOL
  
  /** Cooldown period for unstaking (seconds) */
  COOLDOWN_PERIOD: 604800, // 7 days
  
  /** Heartbeat timeout (seconds) */
  HEARTBEAT_TIMEOUT: 300, // 5 minutes
  
  /** Min heartbeat interval (seconds) */
  MIN_HEARTBEAT_INTERVAL: 30,
  
  /** Min/max endpoint URL length */
  MIN_ENDPOINT_LENGTH: 10,
  MAX_ENDPOINT_LENGTH: 256,
} as const;

/**
 * Payment split percentages
 */
export const PAYMENT_SPLIT = {
  PROVIDER: 70,    // 70% to provider
  BONUS_POOL: 20,  // 20% to bonus pool
  TREASURY: 5,     // 5% to treasury
  STAKERS: 5,      // 5% to stakers
} as const;

/**
 * PDA Seeds for account derivation
 */
export const PDA_SEEDS = {
  STAKING_POOL: Buffer.from('staking_pool'),
  TOKEN_VAULT: Buffer.from('token_vault'),
  PAYMENT_VAULT: Buffer.from('payment_vault'),
  STAKER: Buffer.from('staker'),
  PROVIDER: Buffer.from('provider'),
} as const;

/**
 * Network endpoints
 */
export const NETWORK_ENDPOINTS = {
  MAINNET: 'https://api.mainnet-beta.solana.com',
  DEVNET: 'https://api.devnet.solana.com',
  TESTNET: 'https://api.testnet.solana.com',
} as const;

/**
 * WHISTLE token decimals
 */
export const WHISTLE_DECIMALS = 6;

/**
 * Maximum providers for bonus distribution
 */
export const MAX_BONUS_PROVIDERS = 100;


