/**
 * Initialize Ghost Whistle Staking Pool - RUN ONCE
 * 
 * This script initializes your deployed smart contract with a staking pool.
 * You only need to run this ONCE after deploying to mainnet.
 */

const anchor = require('@coral-xyz/anchor');
const { PublicKey, Keypair } = require('@solana/web3.js');
const fs = require('fs');

const PROGRAM_ID = 'Hf38P6icw2npaFneCJp4LbcPxJqmnD957FXjPCb9nCHs';
const WHISTLE_MINT = '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump';
const RPC_URL = 'https://rpc-mainnet.solanatracker.io/?api_key=25ef537d-3249-479c-96cb-40efc0ce3e09';

async function initializePool() {
  console.log('🚀 Initializing Ghost Whistle Staking Pool...\n');
  
  // Load wallet (you need to provide your keypair file)
  const walletPath = process.env.HOME + '/.config/solana/id.json';
  
  if (!fs.existsSync(walletPath)) {
    console.error('❌ Wallet not found at:', walletPath);
    console.log('💡 Set your wallet path or use: export HOME=/path/to/.config');
    return;
  }
  
  const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  
  console.log('👛 Wallet:', keypair.publicKey.toString());
  
  // Setup connection & provider
  const connection = new anchor.web3.Connection(RPC_URL, 'confirmed');
  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {});
  
  // Load IDL
  const idl = JSON.parse(fs.readFileSync('./ghost-whistle-idl.json', 'utf8'));
  const program = new anchor.Program(idl, new PublicKey(PROGRAM_ID), provider);
  
  // Derive PDAs
  const [poolPDA, poolBump] = await PublicKey.findProgramAddress(
    [Buffer.from('pool')],
    program.programId
  );
  
  console.log('📍 Pool PDA:', poolPDA.toString());
  console.log('📍 Program ID:', PROGRAM_ID);
  console.log('🪙 Whistle Mint:', WHISTLE_MINT);
  
  // Check if already initialized
  try {
    const poolAccount = await program.account.stakingPool.fetch(poolPDA);
    console.log('\n✅ Pool already initialized!');
    console.log('📊 Total Staked:', poolAccount.totalStaked.toString());
    console.log('👥 Total Nodes:', poolAccount.totalNodes.toString());
    console.log('💰 Fee Pool:', poolAccount.feePool.toString());
    return;
  } catch (e) {
    if (!e.message.includes('Account does not exist')) {
      throw e;
    }
    console.log('\n📝 Pool not initialized yet, proceeding...\n');
  }
  
  // Initialize pool
  try {
    const tx = await program.methods
      .initialize()
      .accounts({
        pool: poolPDA,
        whistleMint: new PublicKey(WHISTLE_MINT),
        authority: keypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    
    console.log('✅ Pool initialized successfully!');
    console.log('🔗 Transaction:', tx);
    console.log('📍 Pool address:', poolPDA.toString());
    
    // Wait for confirmation
    await connection.confirmTransaction(tx, 'confirmed');
    
    // Fetch and display pool data
    const poolAccount = await program.account.stakingPool.fetch(poolPDA);
    console.log('\n📊 Pool Configuration:');
    console.log('  Authority:', poolAccount.authority.toString());
    console.log('  Whistle Mint:', poolAccount.whistleMint.toString());
    console.log('  Base Reward:', poolAccount.baseReward.toString(), '(5 $WHISTLE)');
    console.log('  Bonus Per Point:', poolAccount.bonusPerPoint.toString(), '(1 $WHISTLE)');
    
    console.log('\n✨ Initialization complete!');
    console.log('📝 Next step: Fund the pool vault with $WHISTLE tokens for rewards');
    
  } catch (err) {
    console.error('\n❌ Initialization failed:', err);
    throw err;
  }
}

// Run initialization
initializePool()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Error:', err);
    process.exit(1);
  });

