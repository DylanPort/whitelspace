#!/usr/bin/env node
/**
 * Initialize X402 Wallet (One-Time Setup)
 * 
 * This script initializes the X402 payment collection wallet on-chain.
 * Run this ONCE before deploying the distributor cron job.
 */

import { 
  Connection, 
  PublicKey, 
  Keypair,
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import * as fs from 'fs';

// Configuration
const PROGRAM_ID = new PublicKey('5cmaPy5i8efSWSwRVVuWr9VUx8sAMv6qMVSE1o82TRgc');
const RPC_ENDPOINT = process.env.SOLANA_RPC || 'https://rpc.whistle.ninja';
const AUTHORITY_KEYPAIR_PATH = process.env.AUTHORITY_KEYPAIR || './authority.json';

// Helper functions
function getX402WalletPDA(programId) {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('x402_payment_wallet')],
    programId
  );
  return { pda, bump };
}

async function checkX402WalletStatus(connection, x402WalletPDA) {
  try {
    const accountInfo = await connection.getAccountInfo(x402WalletPDA);
    return accountInfo !== null;
  } catch (err) {
    return false;
  }
}

async function main() {
  console.log('\n=== WHISTLE X402 Wallet Initialization ===\n');
  
  // Connect to Solana
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  console.log(`🔗 Connected to: ${RPC_ENDPOINT}`);
  
  // Load authority keypair
  console.log(`🔑 Loading authority from: ${AUTHORITY_KEYPAIR_PATH}`);
  const authorityData = JSON.parse(fs.readFileSync(AUTHORITY_KEYPAIR_PATH, 'utf-8'));
  const authority = Keypair.fromSecretKey(new Uint8Array(authorityData));
  console.log(`   Authority: ${authority.publicKey.toBase58()}\n`);
  
  // Get X402 wallet PDA
  const { pda: x402Wallet, bump } = getX402WalletPDA(PROGRAM_ID);
  console.log(`📦 Program ID: ${PROGRAM_ID.toBase58()}`);
  console.log(`💰 X402 Wallet PDA: ${x402Wallet.toBase58()}`);
  console.log(`   Bump: ${bump}\n`);
  
  // Check if already initialized
  console.log('🔍 Checking X402 wallet status...');
  const isInitialized = await checkX402WalletStatus(connection, x402Wallet);
  
  if (isInitialized) {
    console.log('✅ X402 wallet is ALREADY INITIALIZED!\n');
    
    // Get balance
    const balance = await connection.getBalance(x402Wallet);
    console.log(`💵 Current Balance: ${balance / LAMPORTS_PER_SOL} SOL (${balance} lamports)\n`);
    
    console.log('📝 Next Steps:');
    console.log('   1. Update all x402-client.js files to use this PDA:');
    console.log(`      const FEE_COLLECTOR_WALLET = '${x402Wallet.toBase58()}';`);
    console.log('   2. Deploy the x402-distributor-cron.js');
    console.log('   3. Monitor distributions\n');
    
    return;
  }
  
  console.log('❌ X402 wallet NOT initialized.\n');
  console.log('🚀 Initializing X402 wallet...\n');
  
  // Import helper functions
  const { initializeX402Wallet } = await import('./x402-helpers.ts');
  
  try {
    const signature = await initializeX402Wallet(connection, authority, PROGRAM_ID);
    
    console.log('\n✅ X402 Wallet Successfully Initialized!');
    console.log(`   Transaction: https://solscan.io/tx/${signature}\n`);
    
    console.log('📝 Next Steps:');
    console.log('   1. Update all x402-client.js files to use this PDA:');
    console.log(`      const FEE_COLLECTOR_WALLET = '${x402Wallet.toBase58()}';`);
    console.log('   2. Deploy the x402-distributor-cron.js:');
    console.log('      docker-compose up -d x402-distributor');
    console.log('   3. Monitor distributions with:');
    console.log(`      solana balance ${x402Wallet.toBase58()}\n`);
    
  } catch (err) {
    console.error('\n❌ Initialization Failed:');
    console.error(err);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

