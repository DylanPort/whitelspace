/**
 * X402 Distribution Monitor
 * Real-time monitoring of X402 payments and distributions
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { connection, X402_WALLET_ADDRESS, PAYMENT_VAULT_ADDRESS, WHISTLE_PROGRAM_ID } from './contract';

export interface X402Status {
  walletBalance: number;
  vaultBalance: number;
  totalDistributed: number;
  stakerPool: number;
  treasuryPool: number;
  lastDistribution?: {
    signature: string;
    amount: number;
    timestamp: number;
  };
  nextDistribution?: {
    estimatedTime: string;
    willTrigger: boolean;
  };
}

/**
 * Get current X402 system status
 */
export async function getX402Status(): Promise<X402Status> {
  try {
    // Get X402 wallet balance
    const walletBalance = await connection.getBalance(X402_WALLET_ADDRESS);
    
    // Get Payment Vault info
    const vaultInfo = await connection.getAccountInfo(PAYMENT_VAULT_ADDRESS);
    let vaultBalance = 0;
    let stakerPool = 0;
    let treasuryPool = 0;
    let totalDistributed = 0;
    
    if (vaultInfo) {
      vaultBalance = vaultInfo.lamports / LAMPORTS_PER_SOL;
      
      // Parse PaymentVault data structure
      // Layout: authority (32), staker_rewards_pool (8), bonus_pool (8), treasury (8), total_collected (8)
      const data = vaultInfo.data;
      if (data.length >= 64) {
        const stakerRewardsBuffer = data.slice(32, 40);
        const bonusPoolBuffer = data.slice(40, 48);
        const treasuryBuffer = data.slice(48, 56);
        const totalCollectedBuffer = data.slice(56, 64);
        
        stakerPool = Number(stakerRewardsBuffer.readBigUInt64LE(0)) / LAMPORTS_PER_SOL;
        treasuryPool = Number(treasuryBuffer.readBigUInt64LE(0)) / LAMPORTS_PER_SOL;
        totalDistributed = Number(totalCollectedBuffer.readBigUInt64LE(0)) / LAMPORTS_PER_SOL;
      }
    }
    
    // Check if distribution will trigger
    const willTrigger = (walletBalance / LAMPORTS_PER_SOL) > 0.01;
    
    return {
      walletBalance: walletBalance / LAMPORTS_PER_SOL,
      vaultBalance,
      totalDistributed,
      stakerPool,
      treasuryPool,
      nextDistribution: {
        estimatedTime: willTrigger ? 'Next cron check (~1 hour)' : 'Waiting for min threshold',
        willTrigger
      }
    };
  } catch (error) {
    console.error('Failed to get X402 status:', error);
    throw error;
  }
}

/**
 * Subscribe to X402 wallet changes
 */
export function subscribeToX402Wallet(callback: (balance: number) => void): number {
  return connection.onAccountChange(
    X402_WALLET_ADDRESS,
    (accountInfo) => {
      callback(accountInfo.lamports / LAMPORTS_PER_SOL);
    },
    'confirmed'
  );
}

/**
 * Get recent X402 distributions
 */
export async function getRecentDistributions(limit: number = 10) {
  try {
    const signatures = await connection.getSignaturesForAddress(
      X402_WALLET_ADDRESS,
      { limit }
    );
    
    const distributions = [];
    
    for (const sig of signatures) {
      const tx = await connection.getParsedTransaction(sig.signature, 'confirmed');
      if (!tx || !tx.meta) continue;
      
      // Check if this is a distribution transaction
      const instructions = tx.transaction.message.instructions;
      for (const ix of instructions) {
        if ('programId' in ix && ix.programId.equals(WHISTLE_PROGRAM_ID)) {
          // This is likely a distribution
          const preBalance = tx.meta.preBalances[0] || 0;
          const postBalance = tx.meta.postBalances[0] || 0;
          const amount = preBalance - postBalance;
          
          if (amount > 0) {
            distributions.push({
              signature: sig.signature,
              amount: amount / LAMPORTS_PER_SOL,
              timestamp: sig.blockTime || 0,
              stakerShare: (amount * 0.9) / LAMPORTS_PER_SOL,
              treasuryShare: (amount * 0.1) / LAMPORTS_PER_SOL,
            });
          }
        }
      }
    }
    
    return distributions;
  } catch (error) {
    console.error('Failed to get recent distributions:', error);
    return [];
  }
}

/**
 * Calculate estimated rewards for a staker
 */
export async function calculateEstimatedRewards(
  stakerAddress: PublicKey,
  stakedAmount: number
): Promise<number> {
  try {
    const status = await getX402Status();
    
    // Get total staked from pool
    const poolAddress = PublicKey.findProgramAddressSync(
      [Buffer.from('staking_pool'), new PublicKey('6BNdVMgx2JZJPvkRCLyV2LLxft4S1cwuqoX2BS9eFyvh').toBuffer()],
      WHISTLE_PROGRAM_ID
    )[0];
    
    const poolInfo = await connection.getAccountInfo(poolAddress);
    if (!poolInfo) return 0;
    
    // Parse total staked (at offset 48 in StakingPool struct)
    const totalStakedBuffer = poolInfo.data.slice(48, 56);
    const totalStaked = Number(totalStakedBuffer.readBigUInt64LE(0)) / 1e6; // WHISTLE has 6 decimals
    
    if (totalStaked === 0) return 0;
    
    // Calculate share
    const sharePercentage = stakedAmount / totalStaked;
    const estimatedReward = status.stakerPool * sharePercentage;
    
    return estimatedReward;
  } catch (error) {
    console.error('Failed to calculate estimated rewards:', error);
    return 0;
  }
}

/**
 * Format time until next distribution
 */
export function formatTimeUntilDistribution(): string {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  
  const diff = nextHour.getTime() - now.getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  return '~1 hour';
}
