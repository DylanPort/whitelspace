#!/usr/bin/env node
/**
 * Check your exact claimable rewards (including tiny amounts)
 */

const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

const RPC = 'https://rpc.whistle.ninja';
const connection = new Connection(RPC, 'confirmed');

// Contract addresses
const PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr');
const PAYMENT_VAULT = new PublicKey('CU1ZcHccCbQT8iA6pcb3ZyTjog8ckmDHH8gaAmKfC73G');
const STAKING_POOL = new PublicKey('jVaoYCKUFjHkYw975R7tVvRgns5VdfnnquSp2gzwPXB');
const AUTHORITY = new PublicKey('6BNdVMgx2JZJPvkRCLyV2LLxft4S1cwuqoX2BS9eFyvh');

// YOUR WALLET - Update this!
const YOUR_WALLET = new PublicKey('7BZQ3XchGEKHRu45LqVPRPCb6diLRE5BRXtPJHMEKHRR'); // From screenshot

async function checkMyRewards() {
  console.log('\n🔍 Checking Your Exact Rewards\n');
  console.log('='.repeat(60));
  
  try {
    // 1. Get your staker account PDA
    const [stakerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('staker'), YOUR_WALLET.toBuffer()],
      PROGRAM_ID
    );
    
    console.log(`Your Wallet: ${YOUR_WALLET.toBase58()}`);
    console.log(`Staker PDA: ${stakerPDA.toBase58()}\n`);
    
    // 2. Get staker account info
    const stakerInfo = await connection.getAccountInfo(stakerPDA);
    
    if (!stakerInfo) {
      console.log('❌ No staker account found. Have you staked WHISTLE?');
      return;
    }
    
    console.log('✅ Staker Account Found!');
    console.log(`   Data size: ${stakerInfo.data.length} bytes`);
    
    // Parse StakerAccount struct
    // Layout: staker(32), staked_amount(8), access_tokens(8), last_stake_time(8), pending_rewards(8), ...
    if (stakerInfo.data.length >= 64) {
      const data = stakerInfo.data;
      
      const stakedAmount = Number(data.slice(32, 40).readBigUInt64LE(0)) / 1e6; // WHISTLE decimals
      const accessTokens = Number(data.slice(40, 48).readBigUInt64LE(0));
      const pendingRewards = Number(data.slice(56, 64).readBigUInt64LE(0)); // At offset 56
      
      console.log('\n📊 Your Staking Status:');
      console.log(`   Staked Amount: ${stakedAmount.toLocaleString()} WHISTLE`);
      console.log(`   Access Tokens: ${accessTokens}`);
      console.log(`   Pending Rewards: ${pendingRewards} lamports`);
      console.log(`   Pending Rewards: ${pendingRewards / LAMPORTS_PER_SOL} SOL`);
      console.log(`   USD Value: $${(pendingRewards / LAMPORTS_PER_SOL * 200).toFixed(6)}\n`);
    }
    
    // 3. Get Payment Vault info for context
    const vaultInfo = await connection.getAccountInfo(PAYMENT_VAULT);
    
    if (vaultInfo && vaultInfo.data.length >= 64) {
      const data = vaultInfo.data;
      
      const stakerRewardsPool = Number(data.slice(32, 40).readBigUInt64LE(0));
      const bonusPool = Number(data.slice(40, 48).readBigUInt64LE(0));
      const treasury = Number(data.slice(48, 56).readBigUInt64LE(0));
      const totalCollected = Number(data.slice(56, 64).readBigUInt64LE(0));
      
      console.log('💰 Payment Vault Status:');
      console.log(`   Staker Rewards Pool: ${stakerRewardsPool / LAMPORTS_PER_SOL} SOL`);
      console.log(`   Bonus Pool: ${bonusPool / LAMPORTS_PER_SOL} SOL`);
      console.log(`   Treasury: ${treasury / LAMPORTS_PER_SOL} SOL`);
      console.log(`   Total Collected: ${totalCollected / LAMPORTS_PER_SOL} SOL\n`);
      
      // 4. Get staking pool for total staked
      const poolInfo = await connection.getAccountInfo(STAKING_POOL);
      
      if (poolInfo && poolInfo.data.length >= 56) {
        const totalStaked = Number(poolInfo.data.slice(48, 56).readBigUInt64LE(0)) / 1e6;
        const yourPercentage = (stakedAmount / totalStaked) * 100;
        
        console.log('📈 Your Position in Pool:');
        console.log(`   Total Network Staked: ${totalStaked.toLocaleString()} WHISTLE`);
        console.log(`   Your Percentage: ${yourPercentage.toFixed(6)}%`);
        
        // Calculate your share of the pool
        const yourShare = (stakerRewardsPool * yourPercentage) / 100;
        console.log(`   Your Calculated Share: ${yourShare} lamports`);
        console.log(`   Your Calculated Share: ${yourShare / LAMPORTS_PER_SOL} SOL`);
        console.log(`   Your Calculated Share: $${(yourShare / LAMPORTS_PER_SOL * 200).toFixed(6)}\n`);
      }
    }
    
    // 5. Check if amount is claimable
    console.log('='.repeat(60));
    console.log('\n📝 DIAGNOSIS:\n');
    
    const stakerData = stakerInfo.data;
    const pendingRewards = Number(stakerData.slice(56, 64).readBigUInt64LE(0));
    
    if (pendingRewards === 0) {
      console.log('⚠️  No pending rewards set in your account.');
      console.log('\nPossible reasons:');
      console.log('1. Rewards need to be calculated first (call distribute_staker_rewards)');
      console.log('2. Your share is below minimum threshold');
      console.log('3. You already claimed');
      console.log('\nThe distribution DID happen (verified on-chain), but your');
      console.log('individual rewards haven\'t been calculated yet.\n');
      
      console.log('TO FIX:');
      console.log('1. The contract needs to call distribute_staker_rewards to calculate');
      console.log('   each staker\'s proportional share');
      console.log('2. Then you can claim your rewards\n');
    } else {
      console.log(`✅ You have ${pendingRewards / LAMPORTS_PER_SOL} SOL ready to claim!`);
      console.log('\nNote: The dashboard might be rounding small amounts to 0.00');
      console.log('but you can still claim them!\n');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkMyRewards().catch(console.error);
