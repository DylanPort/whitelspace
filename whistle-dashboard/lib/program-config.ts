/**
 * WHISTLE Network Program Configuration
 * All deployed addresses and constants in one place
 */

import { PublicKey } from '@solana/web3.js';

// ============= MAINNET DEPLOYMENT =============

// Program ID
export const PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr');

// Authority (controls the program)
export const AUTHORITY = new PublicKey('6BNdVMgx2JZJPvkRCLyV2LLxft4S1cwuqoX2BS9eFyvh');

// Token
export const WHISTLE_MINT = new PublicKey('6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump');
export const WHISTLE_DECIMALS = 6;

// Core Accounts (PDAs)
export const ACCOUNTS = {
  stakingPool: new PublicKey('6Ls9QVrP3K35TdQ8dbSJAp1L48tsYFvcbixsXXL9KDAB'),
  tokenVault: new PublicKey('6AP8c7sCQsm2FMvNJw6fQN5PnMdkySH75h7EPE2kD3Yq'),
  paymentVault: new PublicKey('CU1ZcHccCbQT8iA6pcb3ZyTjog8ckmDHH8gaAmKfC73G'),
};

// Program Constants
export const CONSTANTS = {
  minStakeAmount: 100_000_000, // 100 WHISTLE (6 decimals)
  minProviderBond: 1_000_000_000, // 1000 WHISTLE
  queryCost: 10_000, // 0.00001 SOL per query
  cooldownPeriod: 24 * 60 * 60, // 24 hours in seconds
};

// Distribution Splits
export const DISTRIBUTION = {
  // Query payment distribution
  provider: 70, // 70% to provider
  bonus: 20, // 20% to bonus pool
  treasury: 5, // 5% to treasury
  stakers: 5, // 5% to stakers
  
  // X402 payment distribution
  x402: {
    stakers: 90, // 90% to stakers
    treasury: 10, // 10% to treasury
  }
};

// RPC Configuration
export const RPC_CONFIG = {
  endpoint: 'https://rpc-mainnet.solanatracker.io/?api_key=4f442388-ae6f-41ba-a9c4-30d3ff2ee2a0',
  commitment: 'confirmed' as const,
};

// Instruction Discriminators (for raw instruction building)
// MUST match the deployed contract enum order exactly!
export const INSTRUCTIONS = {
  InitializePool: 0,
  Stake: 1,
  Unstake: 2,
  TransferAccess: 3,
  ActivateNodeOperator: 4,
  RecordDataUsage: 5,
  SetPoolStatus: 6,
  LockRate: 7,
  InitializePaymentVault: 8,
  RegisterProvider: 9,        // Correct: index 9 in deployed contract
  DeregisterProvider: 10,
  UpdateEndpoint: 11,
  RecordHeartbeat: 12,
  RecordQueryMetrics: 13,
  UpdateReputationMetrics: 14,
  SlashProvider: 15,
  ProcessQueryPayment: 16,
  ClaimProviderEarnings: 17,
  DistributeBonusPool: 18,
  DistributeStakerRewards: 19,
  ClaimStakerRewards: 20,
};

// Account Sizes (for rent calculations)
export const ACCOUNT_SIZES = {
  stakingPool: 163, // Updated size
  stakerAccount: 88,
  providerAccount: 512, // Includes endpoint string
  paymentVault: 89,
  x402Wallet: 41,
};

// Validation
export function validateConfig(): boolean {
  console.log('🔍 Validating WHISTLE Network Configuration...');
  
  // Check all addresses are valid
  const addresses = [
    { name: 'Program ID', address: PROGRAM_ID },
    { name: 'Authority', address: AUTHORITY },
    { name: 'WHISTLE Mint', address: WHISTLE_MINT },
    { name: 'Staking Pool', address: ACCOUNTS.stakingPool },
    { name: 'Token Vault', address: ACCOUNTS.tokenVault },
    { name: 'Payment Vault', address: ACCOUNTS.paymentVault },
  ];
  
  for (const { name, address } of addresses) {
    try {
      const _ = address.toBase58();
      console.log(`✅ ${name}: ${address.toBase58()}`);
    } catch (error) {
      console.error(`❌ Invalid ${name}`);
      return false;
    }
  }
  
  console.log('✅ Configuration valid!');
  return true;
}

// Export for debugging
export function printConfig(): void {
  console.log('='.repeat(60));
  console.log('WHISTLE NETWORK CONFIGURATION');
  console.log('='.repeat(60));
  console.log('Program:', PROGRAM_ID.toBase58());
  console.log('Authority:', AUTHORITY.toBase58());
  console.log('Token:', WHISTLE_MINT.toBase58());
  console.log('');
  console.log('Core Accounts:');
  console.log('  Staking Pool:', ACCOUNTS.stakingPool.toBase58());
  console.log('  Token Vault:', ACCOUNTS.tokenVault.toBase58());
  console.log('  Payment Vault:', ACCOUNTS.paymentVault.toBase58());
  console.log('');
  console.log('Constants:');
  console.log('  Min Stake:', CONSTANTS.minStakeAmount / 1e6, 'WHISTLE');
  console.log('  Min Provider Bond:', CONSTANTS.minProviderBond / 1e6, 'WHISTLE');
  console.log('  Query Cost:', CONSTANTS.queryCost / 1e9, 'SOL');
  console.log('='.repeat(60));
}
