#!/usr/bin/env node
/**
 * Check the ACTUAL wallet that staked
 */

const { Connection, PublicKey } = require('@solana/web3.js');

const RPC = 'https://rpc.whistle.ninja';
const connection = new Connection(RPC, 'confirmed');

const ACTUAL_STAKER_ACCOUNT = new PublicKey('7UPVuxVeUYG3PW2Dcrp72wHLgQLPfSjZQcRdBCEGHFUi');
const ACTUAL_WALLET = new PublicKey('7BZQtBPn2yotP2vAWNi3Vf2SPNq7Ffrs1Ti5FVUAEkHr');
const PAYMENT_VAULT = new PublicKey('CU1ZcHccCbQT8iA6pcb3ZyTjog8ckmDHH8gaAmKfC73G');
const PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr');

async function checkActualRewards() {
  console.log('\n💰 Checking Your ACTUAL Staker Account\n');
  console.log('Your Wallet:', ACTUAL_WALLET.toBase58());
  console.log('Staker Account:', ACTUAL_STAKER_ACCOUNT.toBase58());
  console.log('='.repeat(70));
  
  // Get staker account
  const stakerInfo = await connection.getAccountInfo(ACTUAL_STAKER_ACCOUNT);
  
  if (!stakerInfo) {
    console.log('❌ Staker account not found');
    return;
  }
  
  console.log('\n✅ Staker Account Found!');
  console.log('Data size:', stakerInfo.data.length, 'bytes');
  
  // Parse the account
  const data = stakerInfo.data;
  
  // First 32 bytes = wallet pubkey
  const walletPubkey = new PublicKey(data.slice(0, 32));
  console.log('Wallet:', walletPubkey.toBase58());
  console.log('Match:', walletPubkey.equals(ACTUAL_WALLET) ? '✅' : '❌');
  
  // Next 8 bytes = staked amount
  if (data.length >= 40) {
    const stakedAmount = Number(data.readBigUInt64LE(32)) / 1e6;
    console.log('\nYour Staked Amount:', stakedAmount.toLocaleString(), 'WHISTLE');
  }
  
  // Next 8 bytes = access tokens
  if (data.length >= 48) {
    const accessTokens = Number(data.readBigUInt64LE(40));
    console.log('Access Tokens:', accessTokens);
  }
  
  // Check for pending rewards at different offsets
  console.log('\nSearching for pending rewards...');
  for (let offset = 48; offset <= data.length - 8; offset += 8) {
    const value = Number(data.readBigUInt64LE(offset));
    console.log(`Offset ${offset}:`, value, 'lamports =', (value / 1e9).toFixed(9), 'SOL');
  }
  
  // Get payment vault info
  console.log('\n💵 Payment Vault Status:');
  const vaultInfo = await connection.getAccountInfo(PAYMENT_VAULT);
  
  if (vaultInfo && vaultInfo.data.length >= 64) {
    const stakerPool = Number(vaultInfo.data.readBigUInt64LE(32));
    const totalCollected = Number(vaultInfo.data.readBigUInt64LE(56));
    
    console.log('Staker Rewards Pool:', stakerPool / 1e9, 'SOL');
    console.log('Total Collected:', totalCollected / 1e9, 'SOL');
  }
  
  // Get total staked
  const [poolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('staking_pool'), new PublicKey('6BNdVMgx2JZJPvkRCLyV2LLxft4S1cwuqoX2BS9eFyvh').toBuffer()],
    PROGRAM_ID
  );
  
  const poolInfo = await connection.getAccountInfo(poolPDA);
  if (poolInfo && poolInfo.data.length >= 56) {
    const totalStaked = Number(poolInfo.data.readBigUInt64LE(48)) / 1e6;
    const yourStake = Number(data.readBigUInt64LE(32)) / 1e6;
    
    console.log('\n📊 Your Share:');
    console.log('Total Network Staked:', totalStaked.toLocaleString(), 'WHISTLE');
    console.log('Your Stake:', yourStake.toLocaleString(), 'WHISTLE');
    
    const yourPercentage = (yourStake / totalStaked) * 100;
    console.log('Your Percentage:', yourPercentage.toFixed(6), '%');
    
    // Calculate share of current pool
    if (vaultInfo && vaultInfo.data.length >= 40) {
      const stakerPool = Number(vaultInfo.data.readBigUInt64LE(32));
      const yourShare = (stakerPool * yourPercentage) / 100;
      
      console.log('\n💰 YOUR CLAIMABLE REWARDS:');
      console.log('Amount:', yourShare / 1e9, 'SOL');
      console.log('Amount:', yourShare, 'lamports');
      console.log('USD Value (@ $200/SOL):', (yourShare / 1e9 * 200).toFixed(6), 'USD');
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n🎯 TO SEE THIS IN DASHBOARD:');
  console.log('\n1. Connect with THIS wallet:', ACTUAL_WALLET.toBase58());
  console.log('2. NOT this one: 7BZQ3XchGEKHRu45LqVPRPCb6diLRE5BRXtPJHMEKHRR');
  console.log('3. Then you\'ll see your rewards!\n');
}

checkActualRewards().catch(console.error);
