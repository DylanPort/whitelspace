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
  SystemProgram,
  LAMPORTS_PER_SOL
} = require('@solana/web3.js');
const crypto = require('crypto');
const fs = require('fs');

// Configuration
const PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr');
const AUTHORITY_ADDRESS = new PublicKey('6BNdVMgx2JZJPvkRCLyV2LLxft4S1cwuqoX2BS9eFyvh');
const RPC_ENDPOINT = 'https://rpc.whistle.ninja';

// Derive X402 wallet PDA (seeds: ["x402_payment_wallet"] only, no authority)
function deriveX402WalletPDA() {
  const seeds = [
    Buffer.from('x402_payment_wallet')
  ];
  const [pda] = PublicKey.findProgramAddressSync(seeds, PROGRAM_ID);
  return pda;
}

const X402_WALLET = deriveX402WalletPDA();

// Load authority keypair (you need the authority that deployed the contract)
// Authority address: 6BNdVMgx2JZJPvkRCLyV2LLxft4S1cwuqoX2BS9eFyvh
const AUTHORITY_KEYPAIR_PATH = process.env.AUTHORITY_KEYPAIR || './authority.json';

async function triggerDistribution() {
  console.log('🚀 Triggering X402 Distribution\n');
  console.log(`Program ID: ${PROGRAM_ID.toBase58()}`);
  console.log(`Authority Address: ${AUTHORITY_ADDRESS.toBase58()}`);
  console.log(`X402 Wallet: ${X402_WALLET.toBase58()}\n`);
  
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  
  // Check X402 wallet balance
  console.log('Checking X402 wallet balance...');
  const balance = await connection.getBalance(X402_WALLET);
  const solBalance = balance / LAMPORTS_PER_SOL;
  
  console.log(`X402 Wallet Balance: ${solBalance} SOL\n`);
  
  if (balance < 0.001 * LAMPORTS_PER_SOL) {
    console.log('❌ Balance too low to distribute (min: 0.001 SOL)');
    return;
  }
  
  // Calculate distributable amount (keep 0.001 SOL for rent)
  const rentReserve = 0.001 * LAMPORTS_PER_SOL;
  const distributableAmount = balance - rentReserve;
  const distributableSol = distributableAmount / LAMPORTS_PER_SOL;
  
  console.log(`Distributable: ${distributableSol} SOL`);
  console.log(`├─ 90% to stakers: ${(distributableSol * 0.9).toFixed(6)} SOL`);
  console.log(`└─ 10% to treasury: ${(distributableSol * 0.1).toFixed(6)} SOL\n`);
  
  // Load authority
  console.log(`Loading authority keypair from: ${AUTHORITY_KEYPAIR_PATH}`);
  if (!fs.existsSync(AUTHORITY_KEYPAIR_PATH)) {
    console.error(`❌ Authority keypair file not found: ${AUTHORITY_KEYPAIR_PATH}`);
    console.error('\nPlease provide the authority keypair file.');
    console.error('Expected authority address:', AUTHORITY_ADDRESS.toBase58());
    console.error('\nYou can set the path via: AUTHORITY_KEYPAIR=./path/to/keypair.json node trigger-x402-distribution.js');
    process.exit(1);
  }
  
  const authorityData = JSON.parse(fs.readFileSync(AUTHORITY_KEYPAIR_PATH, 'utf-8'));
  const authority = Keypair.fromSecretKey(new Uint8Array(authorityData));
  
  if (!authority.publicKey.equals(AUTHORITY_ADDRESS)) {
    console.error(`❌ Authority mismatch!`);
    console.error(`Expected: ${AUTHORITY_ADDRESS.toBase58()}`);
    console.error(`Got: ${authority.publicKey.toBase58()}`);
    process.exit(1);
  }
  
  console.log(`✅ Authority verified: ${authority.publicKey.toBase58()}\n`);
  
  // Get PDAs (use AUTHORITY_ADDRESS, not the loaded keypair's address)
  const [paymentVault] = PublicKey.findProgramAddressSync(
    [Buffer.from('payment_vault'), AUTHORITY_ADDRESS.toBuffer()],
    PROGRAM_ID
  );
  
  const [stakingPool] = PublicKey.findProgramAddressSync(
    [Buffer.from('staking_pool'), AUTHORITY_ADDRESS.toBuffer()],
    PROGRAM_ID
  );
  
  const [rewardsAccumulator] = PublicKey.findProgramAddressSync(
    [Buffer.from('rewards_accumulator')],
    PROGRAM_ID
  );
  
  console.log('PDAs:');
  console.log(`X402 Wallet: ${X402_WALLET.toBase58()}`);
  console.log(`Payment Vault: ${paymentVault.toBase58()}`);
  console.log(`Staking Pool: ${stakingPool.toBase58()}`);
  console.log(`Rewards Accumulator: ${rewardsAccumulator.toBase58()}\n`);
  
  // Calculate Anchor discriminator for ProcessX402Payment
  // Anchor uses: sha256("global:process_x402_payment")[0..8]
  function getAnchorDiscriminator(instructionName) {
    const preimage = `global:${instructionName}`;
    const hash = crypto.createHash('sha256').update(preimage).digest();
    return hash.slice(0, 8);
  }
  
  const discriminator = getAnchorDiscriminator('process_x402_payment');
  
  // Build instruction data: [discriminator: 8 bytes][amount: u64]
  const instructionData = Buffer.alloc(16);
  discriminator.copy(instructionData, 0);
  instructionData.writeBigUInt64LE(BigInt(distributableAmount), 8);
  
  console.log('Instruction Data:', instructionData.toString('hex'));
  console.log('Discriminator:', discriminator.toString('hex'), '\n');
  
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority.publicKey, isSigner: true, isWritable: false },
      { pubkey: X402_WALLET, isSigner: false, isWritable: true },
      { pubkey: paymentVault, isSigner: false, isWritable: true },
      { pubkey: stakingPool, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: rewardsAccumulator, isSigner: false, isWritable: true }, // REQUIRED: Update accumulator
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
