#!/usr/bin/env node
/**
 * Query all accounts owned by the Whistle program
 * This will show us what's actually on-chain
 */

const { Connection, PublicKey } = require('@solana/web3.js');

const RPC = 'https://rpc.whistle.ninja';
const connection = new Connection(RPC, 'confirmed');

const PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr');
const YOUR_WALLET = new PublicKey('7BZQ3XchGEKHRu45LqVPRPCb6diLRE5BRXtPJHMEKHRR');

async function queryProgramAccounts() {
  console.log('\n🔍 Querying All Program Accounts\n');
  console.log('Program ID:', PROGRAM_ID.toBase58());
  console.log('='.repeat(70));
  
  try {
    // Get all accounts owned by this program
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      encoding: 'base64',
      commitment: 'confirmed'
    });
    
    console.log(`\n✅ Found ${accounts.length} accounts owned by this program\n`);
    
    if (accounts.length === 0) {
      console.log('❌ NO ACCOUNTS FOUND!');
      console.log('\nThis means:');
      console.log('1. The program has never been used');
      console.log('2. OR the program ID is wrong');
      console.log('3. OR there\'s a connection issue\n');
      return;
    }
    
    // Categorize accounts by size (helps identify type)
    const accountsBySize = {};
    
    for (const { pubkey, account } of accounts) {
      const size = account.data.length;
      if (!accountsBySize[size]) {
        accountsBySize[size] = [];
      }
      accountsBySize[size].push({ pubkey: pubkey.toBase58(), account });
    }
    
    console.log('📊 Accounts by Size:\n');
    
    for (const [size, accts] of Object.entries(accountsBySize)) {
      console.log(`   ${size} bytes: ${accts.length} account(s)`);
      
      // Guess the account type based on size
      let guessedType = 'Unknown';
      if (size === '155') guessedType = 'StakingPool';
      else if (size === '128' || size === '120') guessedType = 'StakerAccount';
      else if (size === '88' || size === '96') guessedType = 'PaymentVault';
      else if (size === '200') guessedType = 'ProviderAccount';
      
      console.log(`   Likely: ${guessedType}`);
      
      // Show first few accounts
      for (let i = 0; i < Math.min(3, accts.length); i++) {
        console.log(`      ${i + 1}. ${accts[i].pubkey}`);
      }
      if (accts.length > 3) {
        console.log(`      ... and ${accts.length - 3} more`);
      }
      console.log('');
    }
    
    // Check for known PDAs
    console.log('\n📍 Checking Known PDAs:\n');
    
    const AUTHORITY = new PublicKey('6BNdVMgx2JZJPvkRCLyV2LLxft4S1cwuqoX2BS9eFyvh');
    
    const [stakingPool] = PublicKey.findProgramAddressSync(
      [Buffer.from('staking_pool'), AUTHORITY.toBuffer()],
      PROGRAM_ID
    );
    
    const [paymentVault] = PublicKey.findProgramAddressSync(
      [Buffer.from('payment_vault'), AUTHORITY.toBuffer()],
      PROGRAM_ID
    );
    
    const [stakerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('staker'), YOUR_WALLET.toBuffer()],
      PROGRAM_ID
    );
    
    console.log('Expected Staking Pool:', stakingPool.toBase58());
    const poolExists = accounts.find(a => a.pubkey.toBase58() === stakingPool.toBase58());
    console.log('   Status:', poolExists ? '✅ EXISTS' : '❌ NOT FOUND');
    
    if (poolExists) {
      const data = Buffer.from(poolExists.account.data, 'base64');
      if (data.length >= 56) {
        const totalStaked = Number(data.readBigUInt64LE(48)) / 1e6;
        console.log('   Total Staked:', totalStaked.toLocaleString(), 'WHISTLE');
      }
    }
    
    console.log('\nExpected Payment Vault:', paymentVault.toBase58());
    const vaultExists = accounts.find(a => a.pubkey.toBase58() === paymentVault.toBase58());
    console.log('   Status:', vaultExists ? '✅ EXISTS' : '❌ NOT FOUND');
    
    if (vaultExists) {
      const data = Buffer.from(vaultExists.account.data, 'base64');
      if (data.length >= 64) {
        const stakerPool = Number(data.readBigUInt64LE(32)) / 1e9;
        const treasury = Number(data.readBigUInt64LE(48)) / 1e9;
        console.log('   Staker Pool:', stakerPool, 'SOL');
        console.log('   Treasury:', treasury, 'SOL');
      }
    }
    
    console.log('\nYour Expected Staker Account:', stakerPDA.toBase58());
    const yourStaker = accounts.find(a => a.pubkey.toBase58() === stakerPDA.toBase58());
    console.log('   Status:', yourStaker ? '✅ EXISTS - YOU ARE STAKED!' : '❌ NOT FOUND - YOU NEED TO STAKE');
    
    if (yourStaker) {
      const data = Buffer.from(yourStaker.account.data, 'base64');
      if (data.length >= 40) {
        const stakedAmount = Number(data.readBigUInt64LE(32)) / 1e6;
        console.log('   Your Staked Amount:', stakedAmount.toLocaleString(), 'WHISTLE');
      }
      if (data.length >= 64) {
        const pendingRewards = Number(data.readBigUInt64LE(56));
        console.log('   Your Pending Rewards:', pendingRewards, 'lamports');
        console.log('   Your Pending Rewards:', pendingRewards / 1e9, 'SOL');
      }
    }
    
    console.log('\n' + '='.repeat(70));
    
    if (!yourStaker) {
      console.log('\n🎯 ACTION NEEDED:');
      console.log('\nYou need to STAKE WHISTLE tokens to earn rewards!');
      console.log('\nSteps:');
      console.log('1. Go to dashboard: http://localhost:3000');
      console.log('2. Connect your wallet');
      console.log('3. Click STAKE button');
      console.log('4. Enter amount (min 100 WHISTLE)');
      console.log('5. Confirm transaction\n');
      
      if (vaultExists) {
        const data = Buffer.from(vaultExists.account.data, 'base64');
        const stakerPool = Number(data.readBigUInt64LE(32)) / 1e9;
        console.log(`💰 There's ${stakerPool} SOL waiting for stakers!`);
        console.log('Stake now to get your share!\n');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error querying accounts:', error.message);
  }
}

queryProgramAccounts().catch(console.error);
