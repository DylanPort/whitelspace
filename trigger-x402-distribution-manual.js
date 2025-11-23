const { Connection, PublicKey, Transaction, TransactionInstruction, Keypair, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const crypto = require('crypto');
require('dotenv').config();

// Configuration
const PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr');
const AUTHORITY_ADDRESS = new PublicKey('6BNdVMgx2JZJPvkRCLyV2LLxft4S1cwuqoX2BS9eFyvh');
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://rpc.whistle.ninja';
const MIN_THRESHOLD_SOL = 0.01;
const RESERVE_SOL = 0.001;

// Derive PDAs
function deriveX402WalletPDA() {
  const seeds = [Buffer.from('x402_payment_wallet')];
  const [pda] = PublicKey.findProgramAddressSync(seeds, PROGRAM_ID);
  return pda;
}

function derivePaymentVaultPDA() {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('payment_vault'), AUTHORITY_ADDRESS.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

function deriveStakingPoolPDA() {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('staking_pool'), AUTHORITY_ADDRESS.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

function deriveRewardsAccumulatorPDA() {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('rewards_accumulator')],
    PROGRAM_ID
  );
  return pda;
}

// Calculate Anchor discriminator
function getAnchorDiscriminator(instructionName) {
  const preimage = `global:${instructionName}`;
  const hash = crypto.createHash('sha256').update(preimage).digest();
  return hash.slice(0, 8);
}

async function main() {
  try {
    console.log('🔍 Checking X402 wallet balance...');
    
    const connection = new Connection(RPC_URL, 'confirmed');
    const x402Wallet = deriveX402WalletPDA();
    const balance = await connection.getBalance(x402Wallet);
    const solBalance = balance / LAMPORTS_PER_SOL;
    
    console.log(`X402 Wallet: ${x402Wallet.toBase58()}`);
    console.log(`Balance: ${solBalance} SOL (${balance} lamports)`);
    console.log(`Threshold: ${MIN_THRESHOLD_SOL} SOL`);
    
    // Check if threshold met
    const reserveLamports = RESERVE_SOL * LAMPORTS_PER_SOL;
    const distributableLamports = Math.max(0, balance - reserveLamports);
    const distributableSol = distributableLamports / LAMPORTS_PER_SOL;
    
    if (distributableSol < MIN_THRESHOLD_SOL) {
      console.log(`❌ Balance below threshold (${distributableSol} < ${MIN_THRESHOLD_SOL}), nothing to distribute`);
      return;
    }
    
    console.log(`✅ Balance above threshold! Distributing ${distributableSol.toFixed(6)} SOL...`);
    
    // Load authority keypair
    const authorityKeypairBase64 = process.env.AUTHORITY_KEYPAIR_BASE64;
    if (!authorityKeypairBase64) {
      throw new Error('AUTHORITY_KEYPAIR_BASE64 not set in environment');
    }
    
    const authorityKeypairArray = JSON.parse(Buffer.from(authorityKeypairBase64, 'base64').toString());
    const authority = Keypair.fromSecretKey(new Uint8Array(authorityKeypairArray));
    
    if (!authority.publicKey.equals(AUTHORITY_ADDRESS)) {
      throw new Error(`Authority mismatch! Expected ${AUTHORITY_ADDRESS.toBase58()}, got ${authority.publicKey.toBase58()}`);
    }
    
    console.log(`✅ Authority verified: ${authority.publicKey.toBase58()}`);
    
    // Get PDAs
    const paymentVault = derivePaymentVaultPDA();
    const stakingPool = deriveStakingPoolPDA();
    const rewardsAccumulator = deriveRewardsAccumulatorPDA();
    
    console.log(`Payment Vault: ${paymentVault.toBase58()}`);
    console.log(`Staking Pool: ${stakingPool.toBase58()}`);
    console.log(`Rewards Accumulator: ${rewardsAccumulator.toBase58()}`);
    
    // Build distribution instruction
    const discriminator = getAnchorDiscriminator('process_x402_payment');
    const instructionData = Buffer.alloc(16);
    discriminator.copy(instructionData, 0);
    instructionData.writeBigUInt64LE(BigInt(distributableLamports), 8);
    
    const instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: authority.publicKey, isSigner: true, isWritable: false },
        { pubkey: x402Wallet, isSigner: false, isWritable: true },
        { pubkey: paymentVault, isSigner: false, isWritable: true },
        { pubkey: stakingPool, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: rewardsAccumulator, isSigner: false, isWritable: true }, // REQUIRED: Update accumulator
      ],
      data: instructionData,
    });
    
    const transaction = new Transaction().add(instruction);
    
    // Get latest blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = authority.publicKey;
    
    // Sign and send
    console.log('📤 Signing transaction...');
    transaction.sign(authority);
    
    console.log('📡 Sending transaction...');
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3
    });
    
    console.log(`✅ Transaction sent: ${signature}`);
    console.log(`🔗 View on Solscan: https://solscan.io/tx/${signature}`);
    
    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    }, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }
    
    console.log('✅ Distribution confirmed!');
    console.log(`💰 Distributed: ${distributableSol.toFixed(6)} SOL`);
    console.log(`   ├─ 90% to stakers: ${(distributableSol * 0.9).toFixed(6)} SOL`);
    console.log(`   └─ 10% to treasury: ${(distributableSol * 0.1).toFixed(6)} SOL`);
    console.log(`📊 Accumulator updated with new rewards!`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

