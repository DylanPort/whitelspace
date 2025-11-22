#!/usr/bin/env node
/**
 * Check which program your stake is actually on
 */

const { Connection, PublicKey } = require('@solana/web3.js');

const RPC = 'https://rpc.whistle.ninja';
const connection = new Connection(RPC, 'confirmed');

// Your wallet - get from command line or use default
const walletArg = process.argv[2];
const YOUR_WALLET = new PublicKey(walletArg || '7BZQ3XchWMwvPuPR4zjYrbmWy8b5koVrdiayJWRApumG');

// Different program IDs to check
const PROGRAMS = {
  'REAL ENAT Program': new PublicKey('EnaT3YSbzfgYb3vb9zjK2jCRvQt1c5btqm8tKkX9sDy'),
  'Dashboard Program': new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr'),
  'Old ENAT Program': new PublicKey('5cmaPy5i8efSWSwRVVuWr9VUx8sAMv6qMVSE1o82TRgc'),
  'Another Program': new PublicKey('2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq'),
};

async function findStakerAccount() {
  console.log('\n🔍 Searching for Your Staker Account\n');
  console.log('Your Wallet:', YOUR_WALLET.toBase58());
  console.log('='.repeat(60));
  
  for (const [name, programId] of Object.entries(PROGRAMS)) {
    console.log(`\n📦 Checking ${name}:`);
    console.log(`   Program ID: ${programId.toBase58()}`);
    
    try {
      // Derive staker PDA
      const [stakerPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('staker'), YOUR_WALLET.toBuffer()],
        programId
      );
      
      console.log(`   Staker PDA: ${stakerPDA.toBase58()}`);
      
      // Check if account exists
      const accountInfo = await connection.getAccountInfo(stakerPDA);
      
      if (accountInfo) {
        console.log(`   ✅ FOUND! Account exists!`);
        console.log(`   Data size: ${accountInfo.data.length} bytes`);
        console.log(`   Owner: ${accountInfo.owner.toBase58()}`);
        
        // Try to parse staked amount
        if (accountInfo.data.length >= 40) {
          const stakedAmount = Number(accountInfo.data.slice(32, 40).readBigUInt64LE(0)) / 1e6;
          console.log(`   Staked Amount: ${stakedAmount.toLocaleString()} WHISTLE`);
        }
        
        if (accountInfo.data.length >= 64) {
          const pendingRewards = Number(accountInfo.data.slice(56, 64).readBigUInt64LE(0));
          console.log(`   Pending Rewards: ${pendingRewards} lamports`);
          console.log(`   Pending Rewards: ${pendingRewards / 1e9} SOL`);
        }
        
        console.log('\n   🎯 THIS IS YOUR ACTIVE STAKER ACCOUNT!');
        return { name, programId, stakerPDA };
      } else {
        console.log(`   ❌ No account found`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n❌ No staker account found on any program!');
  console.log('\nThis means either:');
  console.log('1. You haven\'t actually staked yet');
  console.log('2. The stake is on a different program ID');
  console.log('3. The wallet address is wrong\n');
}

findStakerAccount().catch(console.error);
