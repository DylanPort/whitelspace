#!/usr/bin/env node
/**
 * Distribute staker rewards - calculates each staker's share
 * This needs to be called AFTER ProcessX402Payment
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
const RPC_ENDPOINT = 'https://rpc.whistle.ninja';
const AUTHORITY_KEYPAIR_PATH = './authority.json'; // UPDATE THIS PATH

async function distributeRewards() {
  console.log('🎁 Distributing Staker Rewards\n');
  
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  
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
  
  // Check payment vault balance
  const vaultInfo = await connection.getAccountInfo(paymentVault);
  if (!vaultInfo) {
    console.log('❌ Payment vault not found');
    return;
  }
  
  const stakerRewardsPool = Number(vaultInfo.data.slice(32, 40).readBigUInt64LE(0)) / LAMPORTS_PER_SOL;
  console.log(`Staker Rewards Pool: ${stakerRewardsPool} SOL`);
  
  if (stakerRewardsPool === 0) {
    console.log('❌ No rewards to distribute');
    return;
  }
  
  // Build DistributeStakerRewards instruction
  // The instruction index might be different - check your contract enum
  const DISTRIBUTE_STAKER_REWARDS_INDEX = 14; // Adjust based on your contract
  
  const instructionData = Buffer.from([DISTRIBUTE_STAKER_REWARDS_INDEX]);
  
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority.publicKey, isSigner: true, isWritable: false },
      { pubkey: paymentVault, isSigner: false, isWritable: true },
      { pubkey: stakingPool, isSigner: false, isWritable: false },
    ],
    data: instructionData,
  });
  
  // Send transaction
  console.log('\nSending distribute transaction...');
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
    console.log('\nStakers\' individual rewards have been calculated!');
    console.log('They can now see and claim their rewards.\n');
    
  } catch (error) {
    console.error('\n❌ Distribution failed:', error);
    
    // If this fails, the contract might calculate rewards automatically
    // when users try to claim
    console.error('\nAlternative: The contract might calculate rewards');
    console.error('automatically when you try to claim. Try claiming anyway!');
  }
}

// Run
distributeRewards().catch(console.error);
