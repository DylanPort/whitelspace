#!/usr/bin/env node
/**
 * Claim Staker Rewards Script
 * 
 * Allows stakers to claim their proportional share of x402 90% distribution.
 * 
 * Usage:
 *   node claim-my-rewards.js
 */

import { 
  Connection, 
  PublicKey, 
  Transaction,
  TransactionInstruction,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram
} from '@solana/web3.js';
import * as fs from 'fs';
import * as readline from 'readline';

// ============= CONFIGURATION =============

const CONFIG = {
  rpcEndpoint: process.env.SOLANA_RPC || 'https://rpc.whistle.ninja',
  programId: new PublicKey('5cmaPy5i8efSWSwRVVuWr9VUx8sAMv6qMVSE1o82TRgc'),
  stakerKeypairPath: process.env.STAKER_KEYPAIR || './staker-keypair.json',
};

// ============= PDA HELPERS =============

function getStakerAccountPDA(staker, programId) {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('staker'), staker.toBuffer()],
    programId
  );
  return { pda, bump };
}

function getStakingPoolPDA(authority, programId) {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('staking_pool'), authority.toBuffer()],
    programId
  );
  return { pda, bump };
}

function getPaymentVaultPDA(authority, programId) {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('payment_vault'), authority.toBuffer()],
    programId
  );
  return { pda, bump };
}

// ============= MAIN FUNCTIONS =============

async function getStakerInfo(connection, stakerPubkey, programId) {
  const { pda: stakerAccount } = getStakerAccountPDA(stakerPubkey, programId);
  
  try {
    const accountInfo = await connection.getAccountInfo(stakerAccount);
    
    if (!accountInfo) {
      return null;
    }
    
    // Parse account data (simplified - adjust offsets based on actual struct)
    const data = accountInfo.data;
    const staked_amount = data.readBigUInt64LE(32); // Adjust offset
    const pending_rewards = data.readBigUInt64LE(88); // Adjust offset
    
    return {
      address: stakerAccount.toBase58(),
      staked_amount: Number(staked_amount),
      pending_rewards: Number(pending_rewards),
      exists: true,
    };
  } catch (err) {
    console.error('Error reading staker account:', err);
    return null;
  }
}

async function calculateClaimableRewards(connection, stakerPubkey, authority, programId) {
  const { pda: stakerAccount } = getStakerAccountPDA(stakerPubkey, programId);
  const { pda: stakingPool } = getStakingPoolPDA(authority, programId);
  const { pda: paymentVault } = getPaymentVaultPDA(authority, programId);
  
  try {
    const [stakerInfo, poolInfo, vaultInfo] = await Promise.all([
      connection.getAccountInfo(stakerAccount),
      connection.getAccountInfo(stakingPool),
      connection.getAccountInfo(paymentVault),
    ]);
    
    if (!stakerInfo || !poolInfo || !vaultInfo) {
      return { claimable: 0, error: 'Account not found' };
    }
    
    // Parse data (simplified - adjust based on actual struct layout)
    const staked_amount = Number(stakerInfo.data.readBigUInt64LE(32));
    const pending_rewards = Number(stakerInfo.data.readBigUInt64LE(88));
    
    const total_staked = Number(poolInfo.data.readBigUInt64LE(40)); // Adjust offset
    const staker_rewards_pool = Number(vaultInfo.data.readBigUInt64LE(56)); // Adjust offset
    
    // If pending_rewards exists, use that
    if (pending_rewards > 0) {
      return {
        claimable: pending_rewards,
        source: 'pending_rewards',
        staked_amount,
        total_staked,
        staker_rewards_pool,
      };
    }
    
    // Otherwise calculate proportional share
    if (total_staked > 0 && staker_rewards_pool > 0) {
      const share = Math.floor((staked_amount / total_staked) * staker_rewards_pool);
      return {
        claimable: share,
        source: 'proportional',
        staked_amount,
        total_staked,
        staker_rewards_pool,
        percentage: ((staked_amount / total_staked) * 100).toFixed(2),
      };
    }
    
    return { claimable: 0, error: 'No rewards available' };
    
  } catch (err) {
    console.error('Error calculating rewards:', err);
    return { claimable: 0, error: err.message };
  }
}

async function claimRewards(connection, staker, authority, programId) {
  const { pda: stakerAccount } = getStakerAccountPDA(staker.publicKey, programId);
  const { pda: stakingPool } = getStakingPoolPDA(authority, programId);
  const { pda: paymentVault } = getPaymentVaultPDA(authority, programId);
  
  // Instruction index for ClaimStakerRewards
  const CLAIM_STAKER_REWARDS_INDEX = 15; // Adjust based on your enum
  
  const instructionData = Buffer.from([CLAIM_STAKER_REWARDS_INDEX]);
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: staker.publicKey, isSigner: true, isWritable: true },
      { pubkey: stakerAccount, isSigner: false, isWritable: true },
      { pubkey: stakingPool, isSigner: false, isWritable: false },
      { pubkey: paymentVault, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data: instructionData,
  });
  
  const transaction = new Transaction().add(instruction);
  
  const signature = await connection.sendTransaction(transaction, [staker], {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });
  
  await connection.confirmTransaction(signature, 'confirmed');
  
  return signature;
}

// ============= CLI INTERFACE =============

async function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   WHISTLE Staker Rewards Claim Tool            ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  // Connect to Solana
  const connection = new Connection(CONFIG.rpcEndpoint, 'confirmed');
  console.log(`🔗 Connected to: ${CONFIG.rpcEndpoint}`);
  
  // Load staker keypair
  console.log(`🔑 Loading staker keypair from: ${CONFIG.stakerKeypairPath}`);
  
  if (!fs.existsSync(CONFIG.stakerKeypairPath)) {
    console.error(`\n❌ Keypair file not found: ${CONFIG.stakerKeypairPath}`);
    console.log('\nPlease create a keypair file or set STAKER_KEYPAIR env variable.');
    console.log('Example: export STAKER_KEYPAIR=./my-wallet.json\n');
    process.exit(1);
  }
  
  const stakerData = JSON.parse(fs.readFileSync(CONFIG.stakerKeypairPath, 'utf-8'));
  const staker = Keypair.fromSecretKey(new Uint8Array(stakerData));
  console.log(`   Staker: ${staker.publicKey.toBase58()}\n`);
  
  // Get authority (for now, using staker as authority - adjust if needed)
  const authority = staker.publicKey;
  
  console.log('📊 Fetching your staking info...\n');
  
  // Calculate claimable rewards
  const rewardsInfo = await calculateClaimableRewards(
    connection,
    staker.publicKey,
    authority,
    CONFIG.programId
  );
  
  if (rewardsInfo.error) {
    console.log(`❌ ${rewardsInfo.error}\n`);
    process.exit(1);
  }
  
  // Display info
  console.log('═══════════════════════════════════════════════');
  console.log('📈 YOUR STAKING STATS');
  console.log('═══════════════════════════════════════════════');
  console.log(`Your Stake:        ${rewardsInfo.staked_amount / LAMPORTS_PER_SOL} WHISTLE`);
  console.log(`Total Network:     ${rewardsInfo.total_staked / LAMPORTS_PER_SOL} WHISTLE`);
  console.log(`Your Share:        ${rewardsInfo.percentage || 'N/A'}%`);
  console.log(`\n💰 CLAIMABLE REWARDS`);
  console.log(`═══════════════════════════════════════════════`);
  console.log(`Amount:            ${rewardsInfo.claimable / LAMPORTS_PER_SOL} SOL`);
  console.log(`Source:            ${rewardsInfo.source}`);
  console.log(`Total Pool:        ${rewardsInfo.staker_rewards_pool / LAMPORTS_PER_SOL} SOL`);
  console.log('═══════════════════════════════════════════════\n');
  
  if (rewardsInfo.claimable === 0) {
    console.log('ℹ️  No rewards to claim at this time.\n');
    console.log('Rewards accumulate when:');
    console.log('  • X402 payments are distributed (90% to stakers)');
    console.log('  • RPC query fees are collected (5% to stakers)\n');
    process.exit(0);
  }
  
  // Confirm claim
  const answer = await promptUser(`Do you want to claim ${rewardsInfo.claimable / LAMPORTS_PER_SOL} SOL? (yes/no): `);
  
  if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
    console.log('\n❌ Claim cancelled.\n');
    process.exit(0);
  }
  
  console.log('\n🚀 Processing claim...\n');
  
  try {
    const signature = await claimRewards(connection, staker, authority, CONFIG.programId);
    
    console.log('✅ REWARDS CLAIMED SUCCESSFULLY!\n');
    console.log(`Transaction: https://solscan.io/tx/${signature}`);
    console.log(`Amount Received: ${rewardsInfo.claimable / LAMPORTS_PER_SOL} SOL\n`);
    
    // Check new balance
    const balance = await connection.getBalance(staker.publicKey);
    console.log(`💵 Your New Wallet Balance: ${balance / LAMPORTS_PER_SOL} SOL\n`);
    
  } catch (err) {
    console.error('\n❌ Claim failed:', err.message);
    console.error('\nPossible reasons:');
    console.error('  • No rewards available to claim');
    console.error('  • Staker account not initialized');
    console.error('  • Insufficient SOL for transaction fees');
    console.error('  • Network error\n');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nClaim cancelled by user.\n');
  process.exit(0);
});

// Start the script
main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});

