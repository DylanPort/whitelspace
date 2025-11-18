/**
 * X402 Payment Integration Helper Functions
 * 
 * Use these functions to interact with the X402 payment system
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  Keypair,
  SystemProgram,
  TransactionInstruction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import * as borsh from 'borsh';

// ============= CONFIGURATION =============

export const PROGRAM_ID = new PublicKey('5cmaPy5i8efSWSwRVVuWr9VUx8sAMv6qMVSE1o82TRgc');

// Instruction indices (must match your contract's enum order)
export const INSTRUCTION_INDICES = {
  InitializeX402Wallet: 24,  // Adjust based on your enum
  ProcessX402Payment: 25,     // Adjust based on your enum
};

// ============= PDA DERIVATION =============

/**
 * Get the X402 payment collection wallet PDA
 */
export function getX402WalletPDA(programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('x402_payment_wallet')],
    programId
  );
}

/**
 * Get the payment vault PDA
 */
export function getPaymentVaultPDA(
  authority: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('payment_vault'), authority.toBuffer()],
    programId
  );
}

/**
 * Get the staking pool PDA
 */
export function getStakingPoolPDA(
  authority: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('staking_pool'), authority.toBuffer()],
    programId
  );
}

// ============= INSTRUCTION BUILDERS =============

/**
 * Create instruction to initialize X402 wallet (one-time)
 */
export function createInitializeX402WalletInstruction(
  authority: PublicKey,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const [x402Wallet] = getX402WalletPDA(programId);
  
  const instructionData = Buffer.from([INSTRUCTION_INDICES.InitializeX402Wallet]);
  
  return new TransactionInstruction({
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: x402Wallet, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data: instructionData,
  });
}

/**
 * Create instruction to process X402 payment distribution
 */
export function createProcessX402PaymentInstruction(
  authority: PublicKey,
  amount: number, // in lamports
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const [x402Wallet] = getX402WalletPDA(programId);
  const [paymentVault] = getPaymentVaultPDA(authority, programId);
  const [stakingPool] = getStakingPoolPDA(authority, programId);
  
  // Serialize instruction data: [instruction_index: u8, amount: u64]
  const instructionData = Buffer.alloc(9);
  instructionData.writeUInt8(INSTRUCTION_INDICES.ProcessX402Payment, 0);
  instructionData.writeBigUInt64LE(BigInt(amount), 1);
  
  return new TransactionInstruction({
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: x402Wallet, isSigner: false, isWritable: true },
      { pubkey: paymentVault, isSigner: false, isWritable: true },
      { pubkey: stakingPool, isSigner: false, isWritable: false },
    ],
    programId,
    data: instructionData,
  });
}

// ============= HIGH-LEVEL FUNCTIONS =============

/**
 * Initialize X402 wallet (one-time setup)
 */
export async function initializeX402Wallet(
  connection: Connection,
  authority: Keypair,
  programId: PublicKey = PROGRAM_ID
): Promise<string> {
  const instruction = createInitializeX402WalletInstruction(authority.publicKey, programId);
  
  const transaction = new Transaction().add(instruction);
  
  const signature = await connection.sendTransaction(transaction, [authority], {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });
  
  await connection.confirmTransaction(signature, 'confirmed');
  
  const [x402Wallet] = getX402WalletPDA(programId);
  console.log('✅ X402 wallet initialized!');
  console.log('X402 Wallet Address:', x402Wallet.toBase58());
  console.log('Transaction:', signature);
  
  return signature;
}

/**
 * Process X402 payment distribution
 */
export async function processX402Payment(
  connection: Connection,
  authority: Keypair,
  amount: number, // in lamports
  programId: PublicKey = PROGRAM_ID
): Promise<string> {
  const instruction = createProcessX402PaymentInstruction(authority.publicKey, amount, programId);
  
  const transaction = new Transaction().add(instruction);
  
  const signature = await connection.sendTransaction(transaction, [authority], {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });
  
  await connection.confirmTransaction(signature, 'confirmed');
  
  const stakerShare = Math.floor(amount * 0.9);
  const treasuryShare = amount - stakerShare;
  
  console.log('✅ X402 payment distributed!');
  console.log('Amount:', amount / LAMPORTS_PER_SOL, 'SOL');
  console.log('├─ Stakers (90%):', stakerShare / LAMPORTS_PER_SOL, 'SOL');
  console.log('└─ Treasury (10%):', treasuryShare / LAMPORTS_PER_SOL, 'SOL');
  console.log('Transaction:', signature);
  
  return signature;
}

/**
 * Check X402 wallet balance
 */
export async function getX402WalletBalance(
  connection: Connection,
  programId: PublicKey = PROGRAM_ID
): Promise<{ address: string; lamports: number; sol: number }> {
  const [x402Wallet] = getX402WalletPDA(programId);
  const balance = await connection.getBalance(x402Wallet);
  
  return {
    address: x402Wallet.toBase58(),
    lamports: balance,
    sol: balance / LAMPORTS_PER_SOL,
  };
}

/**
 * Get payment vault info (for monitoring)
 */
export async function getPaymentVaultInfo(
  connection: Connection,
  authority: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<{
  address: string;
  balance: number;
  // Add more fields if you deserialize the account data
}> {
  const [vaultPDA] = getPaymentVaultPDA(authority, programId);
  const accountInfo = await connection.getAccountInfo(vaultPDA);
  
  if (!accountInfo) {
    throw new Error('Payment vault not found');
  }
  
  return {
    address: vaultPDA.toBase58(),
    balance: accountInfo.lamports,
    // You can deserialize accountInfo.data here to get vault fields
  };
}

// ============= UTILITY FUNCTIONS =============

/**
 * Calculate distribution amounts
 */
export function calculateDistribution(totalAmount: number): {
  stakerShare: number;
  treasuryShare: number;
} {
  const stakerShare = Math.floor(totalAmount * 0.9);
  const treasuryShare = totalAmount - stakerShare;
  
  return { stakerShare, treasuryShare };
}

/**
 * Format lamports to SOL string
 */
export function lamportsToSOL(lamports: number, decimals: number = 4): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(decimals);
}

/**
 * Parse SOL string to lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

// ============= EXAMPLE USAGE =============

async function example() {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const authority = Keypair.fromSecretKey(/* your keypair */);
  
  // 1. Initialize X402 wallet (one-time)
  await initializeX402Wallet(connection, authority);
  
  // 2. Get X402 wallet address to configure in X402 gateway
  const [x402Address] = getX402WalletPDA();
  console.log('Configure X402 to send to:', x402Address.toBase58());
  
  // 3. Check balance
  const balance = await getX402WalletBalance(connection);
  console.log('X402 Wallet Balance:', balance.sol, 'SOL');
  
  // 4. Distribute accumulated payments
  if (balance.lamports > solToLamports(0.01)) {
    const distributableAmount = balance.lamports - solToLamports(0.001); // Keep reserve
    await processX402Payment(connection, authority, distributableAmount);
  }
  
  // 5. Monitor vault
  const vaultInfo = await getPaymentVaultInfo(connection, authority.publicKey);
  console.log('Payment Vault Balance:', vaultInfo.balance / LAMPORTS_PER_SOL, 'SOL');
}

// Export all functions
export default {
  // PDAs
  getX402WalletPDA,
  getPaymentVaultPDA,
  getStakingPoolPDA,
  
  // Instructions
  createInitializeX402WalletInstruction,
  createProcessX402PaymentInstruction,
  
  // High-level
  initializeX402Wallet,
  processX402Payment,
  getX402WalletBalance,
  getPaymentVaultInfo,
  
  // Utilities
  calculateDistribution,
  lamportsToSOL,
  solToLamports,
};







