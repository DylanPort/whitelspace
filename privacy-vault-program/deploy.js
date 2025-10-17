/**
 * Privacy Vault Deployment Script
 * Deploys the smart contract to Solana
 */

const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} = require('@solana/web3.js');
const {
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
} = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

// Configuration
const NETWORK = process.env.SOLANA_NETWORK || 'devnet'; // Change to 'mainnet-beta' for production
const RPC_URL = NETWORK === 'mainnet-beta' 
  ? 'https://api.mainnet-beta.solana.com'
  : 'https://api.devnet.solana.com';

console.log(`\n🚀 Deploying Privacy Vault to ${NETWORK}...\n`);

async function deploy() {
  // Load deployer keypair
  const deployerPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config/solana/id.json');
  
  if (!fs.existsSync(deployerPath)) {
    console.error('❌ Deployer keypair not found. Run: solana-keygen new');
    process.exit(1);
  }

  const deployerKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(deployerPath, 'utf-8')))
  );

  console.log(`📍 Deployer: ${deployerKeypair.publicKey.toString()}`);

  const connection = new Connection(RPC_URL, 'confirmed');

  // Check balance
  const balance = await connection.getBalance(deployerKeypair.publicKey);
  console.log(`💰 Balance: ${balance / 1e9} SOL`);

  if (NETWORK === 'mainnet-beta' && balance < 10e9) {
    console.error('❌ Insufficient SOL for mainnet deployment (need ~10 SOL)');
    process.exit(1);
  }

  if (NETWORK === 'devnet' && balance < 2e9) {
    console.log('⏳ Requesting devnet airdrop...');
    const signature = await connection.requestAirdrop(
      deployerKeypair.publicKey,
      2e9
    );
    await connection.confirmTransaction(signature);
    console.log('✅ Airdrop received');
  }

  // Deploy program using solana CLI
  console.log('\n📦 Building program...');
  const { execSync } = require('child_process');
  
  try {
    execSync('cargo build-bpf', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ Program built successfully');
  } catch (error) {
    console.error('❌ Build failed');
    process.exit(1);
  }

  // Deploy
  console.log(`\n🚀 Deploying to ${NETWORK}...`);
  console.log('⚠️  This may take 2-5 minutes...');
  
  try {
    const deployOutput = execSync(
      `solana program deploy target/deploy/privacy_vault.so --url ${RPC_URL}`,
      { cwd: __dirname, encoding: 'utf-8' }
    );
    
    console.log('\n' + deployOutput);
    
    // Extract program ID from output
    const match = deployOutput.match(/Program Id: ([A-Za-z0-9]+)/);
    if (match) {
      const programId = match[1];
      
      // Save program ID
      fs.writeFileSync(
        path.join(__dirname, 'program-id.json'),
        JSON.stringify({ programId, network: NETWORK }, null, 2)
      );
      
      console.log('\n✅ DEPLOYMENT SUCCESSFUL!');
      console.log(`\n📝 Program ID: ${programId}`);
      console.log(`📍 Network: ${NETWORK}`);
      console.log(`💾 Saved to: program-id.json`);
      
      if (NETWORK === 'mainnet-beta') {
        console.log('\n⚠️  IMPORTANT:');
        console.log('1. Get your contract audited before allowing real deposits');
        console.log('2. Test thoroughly on devnet first');
        console.log('3. Start with small deposits');
        console.log('4. Monitor for at least 1 week before scaling');
      }
      
      return programId;
    }
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run deployment
deploy().then((programId) => {
  console.log('\n🎉 Next steps:');
  console.log('1. Update index.html with program ID');
  console.log('2. Initialize the vault (run: node initialize-vault.js)');
  console.log('3. Test deposits/withdrawals');
  console.log('4. Monitor performance\n');
}).catch(console.error);

