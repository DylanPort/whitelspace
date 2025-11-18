import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as bs58 from 'bs58';
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
}

async function main() {
  // Read wallet keypair
  const keypairPath = 'C:/Users/salva/Downloads/whistle/playground-wallet.json';
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const authority = Keypair.fromSecretKey(new Uint8Array(secretKey));

  console.log('🔧 Re-initializing Whistlenet Staking Pool');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Authority:', authority.publicKey.toBase58());
  console.log('Program:', PROGRAM_ID.toBase58());
  console.log('Staking Pool:', STAKING_POOL.toBase58());
  console.log('Token Vault:', TOKEN_VAULT.toBase58());
  console.log('Payment Vault:', PAYMENT_VAULT.toBase58());
  console.log('');

  const connection = new Connection(RPC_URL, 'confirmed');

  // Create instruction data
  const instructionData = Buffer.alloc(1);
  instructionData.writeUInt8(StakingInstruction.Initialize, 0);

  // Build initialize instruction
  const initializeIx = new TransactionInstruction({
    keys: [
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: STAKING_POOL, isSigner: false, isWritable: true },
      { pubkey: TOKEN_VAULT, isSigner: false, isWritable: true },
      { pubkey: PAYMENT_VAULT, isSigner: false, isWritable: true },
      { pubkey: WHISTLE_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  });

  // Send transaction
  const transaction = new Transaction().add(initializeIx);

  console.log('📤 Sending initialize transaction...');
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [authority],
    { commitment: 'confirmed' }
  );

  console.log('✅ Staking pool initialized!');
  console.log('Signature:', signature);
  console.log('');
  console.log(`🔗 View on Solscan: https://solscan.io/tx/${signature}`);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});

