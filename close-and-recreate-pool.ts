import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  sendAndConfirmTransaction,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as fs from 'fs';

// Configuration
const PROGRAM_ID = new PublicKey('WhStMSgDJz3dYtaLKt4855DDypB64Dz3PpAFMbuicbt');
const WHISTLE_MINT = new PublicKey('6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump');
const STAKING_POOL = new PublicKey('F7BtDzqpATy6dQ8gaxoLJzHWVVEuaopJBhUkGNuFzdmh');
const TOKEN_VAULT = new PublicKey('F4BPRL7wJS67bKVT8d8UvGFdVouEZ1ae1EoDrKeL3hkZ');
const PAYMENT_VAULT = new PublicKey('Ey5yKxziYHTUzAGKuBhFJdCokzqUqPKcfVo2TMSyvSeP');
const RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba';

// StakingInstruction enum
enum StakingInstruction {
  Initialize = 0,
  InitializePaymentVault = 6,
}

async function main() {
  // Read wallet keypair
  const keypairPath = 'C:/Users/salva/Downloads/whistle/playground-wallet.json';
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const authority = Keypair.fromSecretKey(new Uint8Array(secretKey));

  console.log('🔥 Closing and Recreating Whistlenet Staking Pool');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Authority:', authority.publicKey.toBase58());
  console.log('');

  const connection = new Connection(RPC_URL, 'confirmed');

  // Step 1: Close existing accounts and reclaim rent
  console.log('📦 Step 1: Closing existing accounts...');
  
  const closePoolIx = SystemProgram.transfer({
    fromPubkey: STAKING_POOL,
    toPubkey: authority.publicKey,
    lamports: await connection.getBalance(STAKING_POOL),
  });

  const closeVaultIx = SystemProgram.transfer({
    fromPubkey: TOKEN_VAULT,
    toPubkey: authority.publicKey,
    lamports: await connection.getBalance(TOKEN_VAULT),
  });

  // Note: We CANNOT close these accounts because we don't own them (they're PDAs)
  // Instead, we'll just reinitialize them with correct data

  console.log('⚠️  Cannot close PDA accounts owned by program');
  console.log('   We\'ll recreate with correct data instead...');
  console.log('');

  // Step 2: Create initialize instruction with correct parameters
  console.log('📦 Step 2: Initializing staking pool...');
  
  const MIN_STAKE = 100_000_000n; // 100 WHISTLE
  const TOKENS_PER_WHISTLE = 1n; // 1:1 ratio
  const COOLDOWN = 604800n; // 7 days

  const poolData = Buffer.alloc(1 + 8 + 8 + 8);
  poolData.writeUInt8(StakingInstruction.Initialize, 0);
  poolData.writeBigUInt64LE(MIN_STAKE, 1);
  poolData.writeBigUInt64LE(TOKENS_PER_WHISTLE, 9);
  poolData.writeBigInt64LE(COOLDOWN, 17);

  const initPoolIx = new TransactionInstruction({
    keys: [
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: STAKING_POOL, isSigner: false, isWritable: true },
      { pubkey: TOKEN_VAULT, isSigner: false, isWritable: true },
      { pubkey: WHISTLE_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: poolData,
  });

  console.log('   Parameters:');
  console.log('   - Min Stake:', MIN_STAKE.toString(), 'lamports (100 WHISTLE)');
  console.log('   - Tokens per WHISTLE:', TOKENS_PER_WHISTLE.toString());
  console.log('   - Cooldown:', COOLDOWN.toString(), 'seconds (7 days)');
  console.log('');

  // Step 3: Initialize payment vault
  console.log('📦 Step 3: Initializing payment vault...');
  
  const vaultData = Buffer.alloc(1);
  vaultData.writeUInt8(StakingInstruction.InitializePaymentVault, 0);

  const initVaultIx = new TransactionInstruction({
    keys: [
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: PAYMENT_VAULT, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: vaultData,
  });

  // Build and send transaction
  const transaction = new Transaction().add(initPoolIx, initVaultIx);

  console.log('📤 Sending transaction...');
  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [authority],
      { commitment: 'confirmed' }
    );

    console.log('');
    console.log('✅ SUCCESS! Pool recreated and initialized!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Signature:', signature);
    console.log('');
    console.log(`🔗 View on Solscan: https://solscan.io/tx/${signature}`);
  } catch (err: any) {
    console.error('');
    console.error('❌ Error:', err.message);
    if (err.logs) {
      console.error('Program Logs:');
      err.logs.forEach((log: string) => console.error('  ', log));
    }
    process.exit(1);
  }
}

main();


