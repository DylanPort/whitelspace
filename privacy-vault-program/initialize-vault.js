/**
 * Initialize Privacy Vault
 * Run this after deploying the program
 */

const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} = require('@solana/web3.js');
const {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} = require('@solana/spl-token');
const borsh = require('borsh');
const fs = require('fs');
const path = require('path');

// Load program ID
const programData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'program-id.json'), 'utf-8')
);
const PROGRAM_ID = new PublicKey(programData.programId);
const NETWORK = programData.network;

// WHISTLE token mint (replace with your actual token)
const WHISTLE_MINT = new PublicKey('6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump');

const RPC_URL = NETWORK === 'mainnet-beta'
  ? 'https://api.mainnet-beta.solana.com'
  : 'https://api.devnet.solana.com';

// Instruction schema
class InitializeVaultInstruction {
  constructor(fields) {
    this.weekly_performance_target = fields.weekly_performance_target;
    this.max_loss_cap = fields.max_loss_cap;
  }
}

const schema = new Map([
  [
    InitializeVaultInstruction,
    {
      kind: 'struct',
      fields: [
        ['weekly_performance_target', 'i16'],
        ['max_loss_cap', 'u16'],
      ],
    },
  ],
]);

async function initializeVault() {
  console.log('\n🔧 Initializing Privacy Vault...\n');

  // Load authority keypair
  const authorityPath = path.join(
    process.env.HOME || process.env.USERPROFILE,
    '.config/solana/id.json'
  );
  const authorityKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(authorityPath, 'utf-8')))
  );

  console.log(`📍 Authority: ${authorityKeypair.publicKey.toString()}`);
  console.log(`📍 Program ID: ${PROGRAM_ID.toString()}`);
  console.log(`📍 WHISTLE Mint: ${WHISTLE_MINT.toString()}`);

  const connection = new Connection(RPC_URL, 'confirmed');

  // Create vault state account
  const vaultStateKeypair = Keypair.generate();
  console.log(`📍 Vault State: ${vaultStateKeypair.publicKey.toString()}`);

  // Create vault token account (PDA)
  const [vaultAuthority] = await PublicKey.findProgramAddress(
    [Buffer.from('vault-authority'), vaultStateKeypair.publicKey.toBuffer()],
    PROGRAM_ID
  );
  console.log(`📍 Vault Authority (PDA): ${vaultAuthority.toString()}`);

  const vaultTokenAccount = await getAssociatedTokenAddress(
    WHISTLE_MINT,
    vaultAuthority,
    true
  );
  console.log(`📍 Vault Token Account: ${vaultTokenAccount.toString()}`);

  // Create vault state account
  const rentExemption = await connection.getMinimumBalanceForRentExemption(1000);

  const createAccountIx = SystemProgram.createAccount({
    fromPubkey: authorityKeypair.publicKey,
    newAccountPubkey: vaultStateKeypair.publicKey,
    lamports: rentExemption,
    space: 1000,
    programId: PROGRAM_ID,
  });

  // Create vault token account
  const createTokenAccountIx = createAssociatedTokenAccountInstruction(
    authorityKeypair.publicKey,
    vaultTokenAccount,
    vaultAuthority,
    WHISTLE_MINT
  );

  // Create initialize instruction
  const initData = new InitializeVaultInstruction({
    weekly_performance_target: 4500, // 45% target
    max_loss_cap: 2500, // 25% max loss
  });

  const serialized = borsh.serialize(schema, initData);
  const instructionData = Buffer.concat([Buffer.from([0]), Buffer.from(serialized)]);

  const initializeIx = new TransactionInstruction({
    keys: [
      { pubkey: authorityKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: vaultStateKeypair.publicKey, isSigner: false, isWritable: true },
      { pubkey: vaultTokenAccount, isSigner: false, isWritable: true },
      { pubkey: WHISTLE_MINT, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  });

  // Send transaction
  const transaction = new Transaction().add(
    createAccountIx,
    createTokenAccountIx,
    initializeIx
  );

  console.log('\n⏳ Sending transaction...');

  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [authorityKeypair, vaultStateKeypair],
      { commitment: 'confirmed' }
    );

    console.log('\n✅ VAULT INITIALIZED!');
    console.log(`📝 Transaction: ${signature}`);
    console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}?cluster=${NETWORK}`);

    // Save vault info
    const vaultInfo = {
      programId: PROGRAM_ID.toString(),
      vaultState: vaultStateKeypair.publicKey.toString(),
      vaultAuthority: vaultAuthority.toString(),
      vaultTokenAccount: vaultTokenAccount.toString(),
      whistleMint: WHISTLE_MINT.toString(),
      network: NETWORK,
      initialized: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(__dirname, 'vault-info.json'),
      JSON.stringify(vaultInfo, null, 2)
    );

    console.log('\n💾 Vault info saved to vault-info.json');
    console.log('\n🎉 Ready for deposits!');
    
  } catch (error) {
    console.error('\n❌ Initialization failed:', error);
    throw error;
  }
}

deploy().catch(console.error);

