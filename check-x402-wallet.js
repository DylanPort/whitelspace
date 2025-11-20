/**
 * Check if X402 Wallet PDA is initialized
 * and provide instructions to initialize if not
 */

const { Connection, PublicKey } = require('@solana/web3.js');

// Configuration
const STAKING_PROGRAM_ID = '5cmaPy5i8efSWSwRVVuWr9VUx8sAMv6qMVSE1o82TRgc';
const RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba';

async function checkX402Wallet() {
  console.log('🔍 Checking X402 Wallet Status...\n');

  // Derive X402 wallet PDA
  const [x402WalletPDA, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('x402_payment_wallet')],
    new PublicKey(STAKING_PROGRAM_ID)
  );

  console.log('📍 X402 Wallet PDA:', x402WalletPDA.toBase58());
  console.log('📍 Bump:', bump);
  console.log('📍 Solscan:', `https://solscan.io/account/${x402WalletPDA.toBase58()}\n`);

  // Connect to Solana
  const connection = new Connection(RPC_URL, 'confirmed');

  try {
    // Check account info
    const accountInfo = await connection.getAccountInfo(x402WalletPDA);

    if (!accountInfo) {
      console.log('❌ X402 WALLET NOT INITIALIZED!\n');
      console.log('📋 TO INITIALIZE:\n');
      console.log('Option 1: Use Solana CLI:');
      console.log('----------------------------------------');
      console.log(`solana program invoke \\`);
      console.log(`  --program-id ${STAKING_PROGRAM_ID} \\`);
      console.log(`  --instruction InitializeX402Wallet \\`);
      console.log(`  --signer YOUR_AUTHORITY_KEYPAIR.json\n`);
      
      console.log('Option 2: Use Anchor CLI (if using Anchor):');
      console.log('----------------------------------------');
      console.log(`anchor run initialize-x402\n`);
      
      console.log('Option 3: Create initialization script (see initialize-x402.js)\n');
      
      return false;
    }

    // Wallet exists - check details
    console.log('✅ X402 WALLET INITIALIZED!\n');
    console.log('📊 Account Details:');
    console.log('   Owner:', accountInfo.owner.toBase58());
    console.log('   Balance:', accountInfo.lamports / 1e9, 'SOL');
    console.log('   Data Length:', accountInfo.data.length, 'bytes');
    console.log('   Executable:', accountInfo.executable);
    console.log('   Rent Epoch:', accountInfo.rentEpoch);

    if (accountInfo.owner.toBase58() !== STAKING_PROGRAM_ID) {
      console.log('\n⚠️  WARNING: Wallet owner is not the staking program!');
      console.log('   Expected:', STAKING_PROGRAM_ID);
      console.log('   Got:', accountInfo.owner.toBase58());
    }

    // Check if it has any balance
    if (accountInfo.lamports === 0) {
      console.log('\n💡 Wallet is initialized but has 0 SOL balance');
      console.log('   This is normal - it will receive SOL from RPC subscriptions');
    } else {
      console.log(`\n💰 Wallet has ${accountInfo.lamports / 1e9} SOL`);
      console.log('   Ready to distribute via ProcessX402Payment!');
    }

    return true;

  } catch (error) {
    console.error('❌ Error checking wallet:', error.message);
    return false;
  }
}

// Run check
checkX402Wallet().then(initialized => {
  console.log('\n' + '='.repeat(50));
  if (initialized) {
    console.log('✅ X402 Wallet is ready for RPC subscriptions!');
  } else {
    console.log('❌ X402 Wallet needs to be initialized first!');
  }
  console.log('='.repeat(50));
});

