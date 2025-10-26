/**
 * LOCAL DISTRIBUTION SCRIPT (MOST SECURE)
 * 
 * Run this on your LOCAL machine ONLY
 * Usage: node distribute-rewards-local.js
 * 
 * Put your private key in a .env file (NEVER commit to git!)
 * Add .env to .gitignore
 */

require('dotenv').config();
const { Connection, PublicKey, Keypair, Transaction, SystemProgram } = require('@solana/web3.js');
const { getAssociatedTokenAddressSync, createTransferInstruction } = require('@solana/spl-token');
const bs58 = require('bs58');

// Configuration
const PROGRAM_ID = '2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq';
const WHISTLE_MINT = '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump';
const FEE_COLLECTOR_WALLET = 'G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg';
const RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba';
const EXCLUDED_WALLET = '7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF';

// Load private key from .env (KEEP THIS SECRET!)
const PRIVATE_KEY = process.env.FEE_COLLECTOR_PRIVATE_KEY; // Base58 encoded

if (!PRIVATE_KEY) {
  console.error('❌ ERROR: FEE_COLLECTOR_PRIVATE_KEY not found in .env file!');
  console.log('Create a .env file with: FEE_COLLECTOR_PRIVATE_KEY=your_base58_private_key');
  process.exit(1);
}

async function distributeRewards() {
  try {
    console.log('🚀 Starting reward distribution...\n');
    
    const connection = new Connection(RPC_URL, 'confirmed');
    const programId = new PublicKey(PROGRAM_ID);
    const whistleMint = new PublicKey(WHISTLE_MINT);
    const feeCollectorWallet = new PublicKey(FEE_COLLECTOR_WALLET);
    
    // Load keypair from private key
    const keypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
    console.log('✅ Loaded fee collector wallet:', keypair.publicKey.toBase58());
    
    if (keypair.publicKey.toBase58() !== FEE_COLLECTOR_WALLET) {
      console.error('❌ ERROR: Private key does not match fee collector wallet!');
      process.exit(1);
    }
    
    // Get pool data
    const [poolPda] = await PublicKey.findProgramAddress(
      [Buffer.from('staking_pool')],
      programId
    );
    
    const poolAccountInfo = await connection.getAccountInfo(poolPda);
    if (!poolAccountInfo) {
      console.error('❌ Pool account not found');
      return;
    }
    
    const poolData = poolAccountInfo.data;
    const totalStaked = Number(new DataView(poolData.buffer, poolData.byteOffset + 72, 8).getBigUint64(0, true));
    
    // Fetch $WHISTLE token decimals
    const mintInfo = await connection.getParsedAccountInfo(whistleMint);
    const decimals = mintInfo.value?.data?.parsed?.info?.decimals || 6;
    const divisor = Math.pow(10, decimals);
    
    console.log(`💰 Token decimals: ${decimals}`);
    console.log(`📊 Total staked in pool: ${(totalStaked / divisor).toLocaleString()} $WHISTLE\n`);
    
    // Get fee collector balance
    const feeCollectorAta = getAssociatedTokenAddressSync(whistleMint, feeCollectorWallet);
    const feeBalance = await connection.getTokenAccountBalance(feeCollectorAta);
    const totalFees = Number(feeBalance.value.amount);
    const distributionAmount = totalFees * 0.9; // 90% to stakers, 10% protocol fee
    
    console.log(`💎 Total fees collected: ${(totalFees / divisor).toLocaleString()} $WHISTLE`);
    console.log(`📤 Amount to distribute (90%): ${(distributionAmount / divisor).toLocaleString()} $WHISTLE\n`);
    
    if (distributionAmount === 0) {
      console.log('⚠️  No fees to distribute. Exiting.');
      return;
    }
    
    // Fetch all stakers
    console.log('🔍 Fetching all stakers...');
    const accounts = await connection.getProgramAccounts(programId, {
      filters: [{ dataSize: 128 }] // NodeAccount size
    });
    
    console.log(`Found ${accounts.length} node accounts\n`);
    
    const stakers = [];
    const currentTime = Date.now() / 1000;
    let totalWeight = 0;
    
    for (const account of accounts) {
      const buffer = account.account.data;
      
      // Decode NodeAccount (same structure as frontend)
      const owner = new PublicKey(buffer.slice(8, 40)).toBase58();
      const stakedAmount = Number(new DataView(buffer.buffer, buffer.byteOffset + 40, 8).getBigUint64(0, true)) / divisor;
      const reputationScore = Number(new DataView(buffer.buffer, buffer.byteOffset + 48, 8).getBigUint64(0, true));
      const createdAt = Number(new DataView(buffer.buffer, buffer.byteOffset + 96, 8).getBigInt64(0, true));
      
      // Filter out excluded wallet and zero stakes
      if (owner === EXCLUDED_WALLET || stakedAmount === 0) continue;
      
      // Calculate weights (60% stake, 20% time, 20% reputation)
      const stakeWeight = stakedAmount / (totalStaked / divisor);
      const stakeDays = createdAt > 0 ? (currentTime - createdAt) / 86400 : 0;
      const timeWeight = Math.min(stakeDays / 30, 1);
      const repWeight = reputationScore / 100000;
      const weight = (stakeWeight * 0.6) + (timeWeight * 0.2) + (repWeight * 0.2);
      
      totalWeight += weight;
      
      stakers.push({
        owner,
        stakedAmount,
        reputationScore,
        stakeDays,
        weight,
        share: 0 // Calculate in next pass
      });
    }
    
    console.log(`✅ Found ${stakers.length} eligible stakers\n`);
    
    if (stakers.length === 0) {
      console.log('⚠️  No eligible stakers. Exiting.');
      return;
    }
    
    // Calculate shares
    for (const staker of stakers) {
      staker.share = (staker.weight / totalWeight) * distributionAmount;
    }
    
    // Sort by share (largest first)
    stakers.sort((a, b) => b.share - a.share);
    
    // Display distribution plan
    console.log('📋 DISTRIBUTION PLAN:');
    console.log('═'.repeat(100));
    console.log(`${'#'.padEnd(5)} ${'Wallet'.padEnd(45)} ${'Staked'.padEnd(15)} ${'Rep'.padEnd(10)} ${'Share'.padEnd(15)}`);
    console.log('─'.repeat(100));
    
    stakers.forEach((staker, idx) => {
      console.log(
        `${(idx + 1).toString().padEnd(5)} ` +
        `${staker.owner.padEnd(45)} ` +
        `${staker.stakedAmount.toLocaleString(undefined, {maximumFractionDigits: 2}).padEnd(15)} ` +
        `${staker.reputationScore.toString().padEnd(10)} ` +
        `${(staker.share / divisor).toLocaleString(undefined, {maximumFractionDigits: 4}).padEnd(15)}`
      );
    });
    
    console.log('═'.repeat(100));
    console.log(`Total to distribute: ${(distributionAmount / divisor).toLocaleString()} $WHISTLE\n`);
    
    // Ask for confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const confirmed = await new Promise(resolve => {
      rl.question('⚠️  Proceed with distribution? (yes/no): ', answer => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes');
      });
    });
    
    if (!confirmed) {
      console.log('❌ Distribution cancelled.');
      return;
    }
    
    console.log('\n🚀 Starting transfers...\n');
    
    // Get fee payer ATA
    const fromAta = getAssociatedTokenAddressSync(whistleMint, keypair.publicKey);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < stakers.length; i++) {
      const staker = stakers[i];
      const amountRaw = Math.floor(staker.share);
      
      if (amountRaw === 0) {
        console.log(`⏭️  [${i + 1}/${stakers.length}] Skipping ${staker.owner.slice(0, 8)}... (amount too small)`);
        continue;
      }
      
      try {
        const toWallet = new PublicKey(staker.owner);
        const toAta = getAssociatedTokenAddressSync(whistleMint, toWallet);
        
        // Check if destination ATA exists
        const toAtaInfo = await connection.getAccountInfo(toAta);
        if (!toAtaInfo) {
          console.log(`⚠️  [${i + 1}/${stakers.length}] ${staker.owner.slice(0, 8)}... - No token account, skipping`);
          failCount++;
          continue;
        }
        
        const tx = new Transaction().add(
          createTransferInstruction(
            fromAta,
            toAta,
            keypair.publicKey,
            amountRaw
          )
        );
        
        const signature = await connection.sendTransaction(tx, [keypair]);
        await connection.confirmTransaction(signature, 'confirmed');
        
        console.log(`✅ [${i + 1}/${stakers.length}] Sent ${(amountRaw / divisor).toFixed(4)} $WHISTLE to ${staker.owner.slice(0, 8)}...`);
        console.log(`   Tx: https://solscan.io/tx/${signature}`);
        successCount++;
        
        // Rate limiting (avoid RPC throttling)
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ [${i + 1}/${stakers.length}] Failed for ${staker.owner.slice(0, 8)}...:`, error.message);
        failCount++;
      }
    }
    
    console.log('\n' + '═'.repeat(100));
    console.log('✅ DISTRIBUTION COMPLETE!');
    console.log(`   Successful: ${successCount}`);
    console.log(`   Failed: ${failCount}`);
    console.log(`   Total processed: ${successCount + failCount}/${stakers.length}`);
    console.log('═'.repeat(100));
    
  } catch (error) {
    console.error('❌ Distribution failed:', error);
    process.exit(1);
  }
}

// Run
distributeRewards().then(() => {
  console.log('\n✅ Script completed.');
  process.exit(0);
}).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

