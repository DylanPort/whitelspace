#!/usr/bin/env node
/**
 * Manually trigger X402 distribution
 * Run this to process the 0.1 SOL sitting in the X402 wallet
 */

const { 
  Connection, 
  PublicKey, 
  Keypair,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL
} = require('@solana/web3.js');
const fs = require('fs');

// Configuration
const PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr');
const X402_WALLET = new PublicKey('BMiSBoT5aPCrFcxaTrHuzXMkfrtzCLMcDYqrPTVymNbU');
const RPC_ENDPOINT = 'https://rpc.whistle.ninja';

// Load authority keypair (you need the authority that deployed the contract)
const AUTHORITY_KEYPAIR_PATH = './authority.json'; // UPDATE THIS PATH

async function triggerDistribution() {
  console.log('🚀 Triggering X402 Distribution\n');
  
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  
  // Check X402 wallet balance
  const balance = await connection.getBalance(X402_WALLET);
  const solBalance = balance / LAMPORTS_PER_SOL;
  
  console.log(`X402 Wallet Balance: ${solBalance} SOL`);
  
  if (balance < 0.001 * LAMPORTS_PER_SOL) {
    console.log('❌ Balance too low to distribute (min: 0.001 SOL)');
    return;
  }
  
  // Calculate distributable amount (keep 0.001 SOL for rent)
  const rentReserve = 0.001 * LAMPORTS_PER_SOL;
  const distributableAmount = balance - rentReserve;
  const distributableSol = distributableAmount / LAMPORTS_PER_SOL;
  
  console.log(`Distributable: ${distributableSol} SOL`);
  console.log(`├─ 90% to stakers: ${distributableSol * 0.9} SOL`);
  console.log(`└─ 10% to treasury: ${distributableSol * 0.1} SOL\n`);
  
  // Load authority
  console.log('Loading authority keypair...');
  const authorityData = JSON.parse(fs.readFileSync(AUTHORITY_KEYPAIR_PATH, 'utf-8'));
  const authority = Keypair.fromSecretKey(new Uint8Array(authorityData));
  console.log(`Authority: ${authority.publicKey.toBase58()}\n`);
  
  // Get PDAs
  const [paymentVault] = PublicKey.findProgramAddressSync(
    [Buffer.from('payment_vault'), authority.publicKey.toBuffer()],
    PROGRAM_ID
  );
  
  const [stakingPool] = PublicKey.findProgramAddressSync(
    [Buffer.from('staking_pool'), authority.publicKey.toBuffer()],
    PROGRAM_ID
  );
  
  console.log('PDAs:');
  console.log(`Payment Vault: ${paymentVault.toBase58()}`);
  console.log(`Staking Pool: ${stakingPool.toBase58()}\n`);
  
  // Build ProcessX402Payment instruction
  const PROCESS_X402_INSTRUCTION = 25; // Adjust if different in your contract
  
  const instructionData = Buffer.alloc(9);
  instructionData.writeUInt8(PROCESS_X402_INSTRUCTION, 0);
  instructionData.writeBigUInt64LE(BigInt(distributableAmount), 1);
  
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: X402_WALLET, isSigner: false, isWritable: true },
      { pubkey: paymentVault, isSigner: false, isWritable: true },
      { pubkey: stakingPool, isSigner: false, isWritable: false },
    ],
    data: instructionData,
  });
  
  // Send transaction
  console.log('Sending transaction...');
  const transaction = new Transaction().add(instruction);
  
  try {
    const signature = await connection.sendTransaction(transaction, [authority], {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    
    console.log('Transaction sent:', signature);
    console.log('Waiting for confirmation...');
    
    await connection.confirmTransaction(signature, 'confirmed');
    
    console.log('\n✅ Distribution successful!');
    console.log(`Transaction: https://solscan.io/tx/${signature}`);
    console.log('\nStakers can now claim their rewards!');
    
  } catch (error) {
    console.error('\n❌ Distribution failed:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure authority.json is the correct keypair');
    console.error('2. Verify the authority has permission to distribute');
    console.error('3. Check if the program ID is correct');
  }
}

// Run
triggerDistribution().catch(console.error);
