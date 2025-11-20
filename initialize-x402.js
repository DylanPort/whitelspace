/**
 * Initialize X402 Wallet PDA
 * 
 * IMPORTANT: This requires the authority keypair!
 */

const { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  Keypair,
  SystemProgram
} = require('@solana/web3.js');
const fs = require('fs');

// Configuration
const STAKING_PROGRAM_ID = '5cmaPy5i8efSWSwRVVuWr9VUx8sAMv6qMVSE1o82TRgc';
const RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba';

// Instruction discriminator for InitializeX402Wallet (instruction index 29)
const INITIALIZE_X402_INSTRUCTION = 29;

async function initializeX402Wallet(authorityKeypairPath) {
  console.log('🚀 Initializing X402 Wallet...\n');

  // Load authority keypair
  console.log('📂 Loading authority keypair from:', authorityKeypairPath);
  const authorityKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(authorityKeypairPath, 'utf-8')))
  );
  console.log('👤 Authority:', authorityKeypair.publicKey.toBase58());

  // Derive X402 wallet PDA
  const [x402WalletPDA, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('x402_payment_wallet')],
    new PublicKey(STAKING_PROGRAM_ID)
  );

  console.log('\n📍 X402 Wallet PDA:', x402WalletPDA.toBase58());
  console.log('📍 Bump:', bump);

  // Connect to Solana
  const connection = new Connection(RPC_URL, 'confirmed');

  // Check if already initialized
  const accountInfo = await connection.getAccountInfo(x402WalletPDA);
  if (accountInfo && !accountInfo.data.every(byte => byte === 0)) {
    console.log('\n✅ X402 Wallet already initialized!');
    console.log('   Balance:', accountInfo.lamports / 1e9, 'SOL');
    console.log('   View on Solscan:', `https://solscan.io/account/${x402WalletPDA.toBase58()}`);
    return;
  }

  console.log('\n📝 Creating initialization instruction...');

  // Create instruction
  const instruction = new TransactionInstruction({
    programId: new PublicKey(STAKING_PROGRAM_ID),
    keys: [
      { pubkey: authorityKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: x402WalletPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([INITIALIZE_X402_INSTRUCTION]) // Instruction discriminator
  });

  // Create transaction
  const transaction = new Transaction().add(instruction);

  console.log('📤 Sending transaction...');

  try {
    // Send transaction
    const signature = await connection.sendTransaction(
      transaction,
      [authorityKeypair],
      { skipPreflight: false }
    );

    console.log('✅ Transaction sent:', signature);
    console.log('⏳ Waiting for confirmation...');

    // Wait for confirmation
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    }, 'confirmed');

    console.log('✅ X402 WALLET INITIALIZED SUCCESSFULLY!\n');
    console.log('📍 Wallet Address:', x402WalletPDA.toBase58());
    console.log('📍 Transaction:', `https://solscan.io/tx/${signature}`);
    console.log('📍 View Wallet:', `https://solscan.io/account/${x402WalletPDA.toBase58()}`);

    // Check final balance
    const finalInfo = await connection.getAccountInfo(x402WalletPDA);
    if (finalInfo) {
      console.log('\n💰 Initial Balance:', finalInfo.lamports / 1e9, 'SOL (rent-exempt)');
    }

  } catch (error) {
    console.error('\n❌ Error initializing X402 wallet:', error);
    
    if (error.logs) {
      console.error('\n📜 Program Logs:');
      error.logs.forEach(log => console.error('   ', log));
    }
    
    throw error;
  }
}

// Usage
if (process.argv.length < 3) {
  console.log('Usage: node initialize-x402.js <authority-keypair.json>');
  console.log('');
  console.log('Example:');
  console.log('  node initialize-x402.js ~/.config/solana/id.json');
  console.log('  node initialize-x402.js ./authority-keypair.json');
  console.log('');
  console.log('⚠️  IMPORTANT: Authority keypair must match the one used when deploying the contract!');
  process.exit(1);
}

const keypairPath = process.argv[2];

if (!fs.existsSync(keypairPath)) {
  console.error('❌ Keypair file not found:', keypairPath);
  process.exit(1);
}

initializeX402Wallet(keypairPath)
  .then(() => {
    console.log('\n🎉 Setup complete! Your X402 wallet is ready to receive SOL from RPC subscriptions.');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Initialization failed:', err.message);
    process.exit(1);
  });

