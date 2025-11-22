#!/usr/bin/env node
/**
 * Check X402 system status and calculate your rewards
 */

const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

const RPC = 'https://rpc.whistle.ninja';
const connection = new Connection(RPC, 'confirmed');

// Addresses
const X402_WALLET = new PublicKey('BMiSBoT5aPCrFcxaTrHuzXMkfrtzCLMcDYqrPTVymNbU');
const PAYMENT_VAULT = new PublicKey('CU1ZcHccCbQT8iA6pcb3ZyTjog8ckmDHH8gaAmKfC73G');
const STAKING_POOL = new PublicKey('jVaoYCKUFjHkYw975R7tVvRgns5VdfnnquSp2gzwPXB');

async function checkStatus() {
  console.log('🔍 Checking X402 System Status\n');
  console.log('='.repeat(60));
  
  // 1. Check X402 wallet
  const x402Balance = await connection.getBalance(X402_WALLET);
  console.log(`\n💰 X402 Wallet (BMiSBoT5...ymNbU)`);
  console.log(`   Balance: ${x402Balance / LAMPORTS_PER_SOL} SOL`);
  console.log(`   Status: ${x402Balance > 0 ? '✅ Has funds - needs distribution!' : '❌ Empty'}`);
  
  // 2. Check Payment Vault
  const vaultInfo = await connection.getAccountInfo(PAYMENT_VAULT);
  console.log(`\n🏦 Payment Vault (CU1ZcH...C73G)`);
  
  if (vaultInfo) {
    console.log(`   Balance: ${vaultInfo.lamports / LAMPORTS_PER_SOL} SOL`);
    console.log(`   Data size: ${vaultInfo.data.length} bytes`);
    
    // Try to parse vault data
    if (vaultInfo.data.length >= 64) {
      const data = vaultInfo.data;
      
      // Parse PaymentVault struct (assuming layout)
      const stakerRewardsPool = Number(data.slice(32, 40).readBigUInt64LE(0)) / LAMPORTS_PER_SOL;
      const bonusPool = Number(data.slice(40, 48).readBigUInt64LE(0)) / LAMPORTS_PER_SOL;
      const treasury = Number(data.slice(48, 56).readBigUInt64LE(0)) / LAMPORTS_PER_SOL;
      const totalCollected = Number(data.slice(56, 64).readBigUInt64LE(0)) / LAMPORTS_PER_SOL;
      
      console.log(`\n   📊 Vault Distribution:`);
      console.log(`      Staker Rewards Pool: ${stakerRewardsPool} SOL`);
      console.log(`      Bonus Pool: ${bonusPool} SOL`);
      console.log(`      Treasury: ${treasury} SOL`);
      console.log(`      Total Collected: ${totalCollected} SOL`);
    }
  } else {
    console.log(`   Status: ❌ Not initialized or error reading`);
  }
  
  // 3. Check Staking Pool
  const poolInfo = await connection.getAccountInfo(STAKING_POOL);
  console.log(`\n🎯 Staking Pool (jVaoYC...gwPXB)`);
  
  if (poolInfo && poolInfo.data.length >= 56) {
    const totalStaked = Number(poolInfo.data.slice(48, 56).readBigUInt64LE(0));
    console.log(`   Total Staked: ${totalStaked / 1e6} WHISTLE`);
    
    // Calculate your potential rewards
    const yourStake = 20300; // From screenshot
    const yourPercentage = (yourStake / (totalStaked / 1e6)) * 100;
    
    console.log(`\n📈 Your Position:`);
    console.log(`   Your Stake: ${yourStake} WHISTLE`);
    console.log(`   Your Share: ${yourPercentage.toFixed(4)}%`);
    
    if (x402Balance > 0) {
      const distributableAmount = (x402Balance - 0.001 * LAMPORTS_PER_SOL) / LAMPORTS_PER_SOL;
      const stakerShare = distributableAmount * 0.9;
      const yourReward = stakerShare * (yourPercentage / 100);
      
      console.log(`\n💡 If distribution happens now:`);
      console.log(`   Distributable: ${distributableAmount} SOL`);
      console.log(`   90% to stakers: ${stakerShare} SOL`);
      console.log(`   Your reward: ${yourReward.toFixed(8)} SOL`);
      console.log(`   USD value: $${(yourReward * 200).toFixed(2)} (at $200/SOL)`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📝 DIAGNOSIS:\n');
  
  if (x402Balance > 0) {
    console.log('⚠️  X402 wallet has funds but distribution hasn\'t been triggered!');
    console.log('\nTO FIX:');
    console.log('1. Run the distributor cron job, OR');
    console.log('2. Manually trigger with: node trigger-x402-distribution.js');
    console.log('\nThe funds are there, they just need to be moved to the vault!');
  } else {
    console.log('✅ X402 wallet is empty - waiting for new payments');
  }
}

checkStatus().catch(console.error);
