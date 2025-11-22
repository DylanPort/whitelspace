/**
 * X402 Payment Distributor Cron Job
 * 
 * Automatically monitors X402 collection wallet and distributes
 * accumulated payments to stakers (90%) and treasury (10%).
 * 
 * Run this as a systemd service, PM2 process, or containerized cron job.
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import * as fs from 'fs';
import * as crypto from 'crypto';

// ============= CONFIGURATION =============

const CONFIG = {
  // RPC endpoint (use your private RPC for reliability)
  rpcEndpoint: process.env.SOLANA_RPC || 'https://rpc.whistle.ninja',
  
  // Program ID (WHTT program)
  programId: new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr'),
  
  // Authority address (must match the authority that deployed the contract)
  authorityAddress: new PublicKey('6BNdVMgx2JZJPvkRCLyV2LLxft4S1cwuqoX2BS9eFyvh'),
  
  // Authority keypair path (should have permission to trigger distributions)
  authorityKeypairPath: process.env.AUTHORITY_KEYPAIR || './authority.json',
  
  // Minimum balance threshold to trigger distribution (in SOL)
  minBalanceThreshold: parseFloat(process.env.MIN_THRESHOLD || '0.01'),
  
  // Check interval (in milliseconds, default 1 hour)
  checkInterval: parseInt(process.env.CHECK_INTERVAL || '3600000'),
  
  // Reserve balance to keep in X402 wallet (for rent + buffer, in SOL)
  reserveBalance: parseFloat(process.env.RESERVE_BALANCE || '0.001'),
  
  // Slack/Discord webhook for alerts (optional)
  alertWebhook: process.env.ALERT_WEBHOOK || null,
};

// ============= HELPERS =============

const connection = new Connection(CONFIG.rpcEndpoint, 'confirmed');

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function error(message, err) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`, err);
}

async function sendAlert(message) {
  if (!CONFIG.alertWebhook) return;
  
  try {
    await fetch(CONFIG.alertWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🔔 WHISTLE X402 Distributor: ${message}`
      }),
    });
  } catch (err) {
    error('Failed to send alert', err);
  }
}

// ============= X402 FUNCTIONS =============

function getX402WalletPDA(programId) {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('x402_payment_wallet')],
    programId
  );
  return { pda, bump };
}

function getPaymentVaultPDA(programId, authority) {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('payment_vault'), authority.toBuffer()],
    programId
  );
  return { pda, bump };
}

function getStakingPoolPDA(programId, authority) {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('staking_pool'), authority.toBuffer()],
    programId
  );
  return { pda, bump };
}

async function checkX402Balance() {
  const { pda } = getX402WalletPDA(CONFIG.programId);
  const balance = await connection.getBalance(pda);
  return {
    address: pda.toBase58(),
    lamports: balance,
    sol: balance / LAMPORTS_PER_SOL,
  };
}

// Calculate Anchor discriminator for ProcessX402Payment
function getAnchorDiscriminator(instructionName) {
  const preimage = `global:${instructionName}`;
  const hash = crypto.createHash('sha256').update(preimage).digest();
  return hash.slice(0, 8);
}

async function processX402Payment(authority, amount) {
  log(`Processing ${amount / LAMPORTS_PER_SOL} SOL from X402 wallet...`);
  
  const { pda: x402Wallet } = getX402WalletPDA(CONFIG.programId);
  const { pda: paymentVault } = getPaymentVaultPDA(CONFIG.programId, CONFIG.authorityAddress);
  const { pda: stakingPool } = getStakingPoolPDA(CONFIG.programId, CONFIG.authorityAddress);
  
  // Calculate Anchor discriminator
  const discriminator = getAnchorDiscriminator('process_x402_payment');
  
  // Build instruction data: [discriminator: 8 bytes][amount: u64]
  const instructionData = Buffer.alloc(16);
  discriminator.copy(instructionData, 0);
  instructionData.writeBigUInt64LE(BigInt(amount), 8);
  
  // Build transaction with correct account order (matches IDL)
  const instruction = new TransactionInstruction({
    programId: CONFIG.programId,
    keys: [
      { pubkey: authority.publicKey, isSigner: true, isWritable: false },
      { pubkey: x402Wallet, isSigner: false, isWritable: true },
      { pubkey: paymentVault, isSigner: false, isWritable: true },
      { pubkey: stakingPool, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData,
  });
  
  const transaction = new Transaction().add(instruction);
  
  // Send and confirm
  const signature = await connection.sendTransaction(transaction, [authority], {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });
  
  await connection.confirmTransaction(signature, 'confirmed');
  
  log(`✅ Distribution successful! Signature: ${signature}`);
  log(`├─ 90% to stakers: ${(amount * 0.9) / LAMPORTS_PER_SOL} SOL`);
  log(`└─ 10% to treasury: ${(amount * 0.1) / LAMPORTS_PER_SOL} SOL`);
  
  return signature;
}

// ============= MAIN CRON LOGIC =============

async function runDistributionCheck() {
  try {
    log('Checking X402 wallet balance...');
    
    // Check balance
    const balance = await checkX402Balance();
    log(`X402 Wallet: ${balance.address}`);
    log(`Current Balance: ${balance.sol} SOL (${balance.lamports} lamports)`);
    
    // Calculate distributable amount
    const reserveLamports = CONFIG.reserveBalance * LAMPORTS_PER_SOL;
    const distributableLamports = Math.max(0, balance.lamports - reserveLamports);
    const distributableSOL = distributableLamports / LAMPORTS_PER_SOL;
    
    log(`Distributable: ${distributableSOL} SOL (after ${CONFIG.reserveBalance} SOL reserve)`);
    
    // Check if threshold met
    if (distributableSOL < CONFIG.minBalanceThreshold) {
      log(`Below threshold (${CONFIG.minBalanceThreshold} SOL). Skipping distribution.`);
      return;
    }
    
    // Load authority keypair
    if (!fs.existsSync(CONFIG.authorityKeypairPath)) {
      error(`Authority keypair file not found: ${CONFIG.authorityKeypairPath}`);
      return;
    }
    
    const authorityData = JSON.parse(fs.readFileSync(CONFIG.authorityKeypairPath, 'utf-8'));
    const authority = Keypair.fromSecretKey(new Uint8Array(authorityData));
    
    // Verify authority matches expected address
    if (!authority.publicKey.equals(CONFIG.authorityAddress)) {
      error(`Authority mismatch! Expected ${CONFIG.authorityAddress.toBase58()}, got ${authority.publicKey.toBase58()}`);
      return;
    }
    
    log(`✅ Authority verified: ${authority.publicKey.toBase58()}`);
    log(`🚀 Triggering distribution of ${distributableSOL} SOL...`);
    
    // Process distribution
    const signature = await processX402Payment(authority, distributableLamports);
    
    // Send success alert
    await sendAlert(
      `✅ Distributed ${distributableSOL.toFixed(4)} SOL from X402 wallet\n` +
      `90% (${(distributableSOL * 0.9).toFixed(4)} SOL) → Stakers\n` +
      `10% (${(distributableSOL * 0.1).toFixed(4)} SOL) → Treasury\n` +
      `Signature: ${signature}`
    );
    
  } catch (err) {
    error('Distribution check failed', err);
    await sendAlert(`❌ X402 distribution failed: ${err.message}`);
  }
}

// ============= START CRON =============

async function main() {
  log('=== WHISTLE X402 Payment Distributor Started ===');
  log(`RPC: ${CONFIG.rpcEndpoint}`);
  log(`Program ID: ${CONFIG.programId.toBase58()}`);
  log(`Authority: ${CONFIG.authorityAddress.toBase58()}`);
  log(`Check Interval: ${CONFIG.checkInterval / 1000}s`);
  log(`Min Threshold: ${CONFIG.minBalanceThreshold} SOL`);
  log(`Reserve Balance: ${CONFIG.reserveBalance} SOL`);
  
  const { pda: x402Wallet } = getX402WalletPDA(CONFIG.programId);
  log(`X402 Wallet: ${x402Wallet.toBase58()}`);
  log('===========================================\n');
  
  // Initial check
  await runDistributionCheck();
  
  // Schedule periodic checks
  setInterval(async () => {
    log('\n--- Scheduled Check ---');
    await runDistributionCheck();
  }, CONFIG.checkInterval);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the cron job
main().catch(err => {
  error('Fatal error', err);
  process.exit(1);
});







