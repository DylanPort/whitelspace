#!/usr/bin/env node
/**
 * Stake WHISTLE tokens to start earning X402 rewards
 */

const { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');

// Configuration
const PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr');
const WHISTLE_MINT = new PublicKey('6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump');
const AUTHORITY = new PublicKey('6BNdVMgx2JZJPvkRCLyV2LLxft4S1cwuqoX2BS9eFyvh');
const RPC = 'https://rpc.whistle.ninja';

async function stakeWhistle() {
  console.log('\n💰 Staking WHISTLE Tokens\n');
  
  const connection = new Connection(RPC, 'confirmed');
  
  // Load your wallet
  console.log('Which wallet file do you want to use?');
  console.log('Enter the path to your keypair JSON file:');
  console.log('(Press Enter for default: ./wallet.json)');
  
  const walletPath = './wallet.json'; // You'll need to provide this
  
  if (!fs.existsSync(walletPath)) {
    console.error(`\n❌ Wallet file not found: ${walletPath}`);
    console.log('\nPlease:');
    console.log('1. Export your wallet from Phantom/Solflare as JSON');
    console.log('2. Save it as wallet.json in this directory');
    console.log('3. Run this script again\n');
    return;
  }
  
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  
  console.log(`Your Wallet: ${wallet.publicKey.toBase58()}`);
  
  // Check WHISTLE balance
  const userTokenAccount = getAssociatedTokenAddressSync(WHISTLE_MINT, wallet.publicKey);
  const tokenBalance = await connection.getTokenAccountBalance(userTokenAccount);
  
  console.log(`\nYour WHISTLE Balance: ${tokenBalance.value.uiAmount} WHISTLE`);
  
  if (tokenBalance.value.uiAmount === 0) {
    console.log('\n❌ You need WHISTLE tokens to stake!');
    console.log('Buy WHISTLE on: https://pump.fun');
    return;
  }
  
  console.log(`\nHow much do you want to stake? (Min: 100 WHISTLE)`);
  console.log(`Max available: ${tokenBalance.value.uiAmount} WHISTLE`);
  
  const amountToStake = 100; // CHANGE THIS to amount you want
  
  console.log(`\nStaking ${amountToStake} WHISTLE...`);
  
  // Build stake instruction
  // This needs the actual instruction format from your contract
  console.log('\n⚠️  TO COMPLETE THIS:');
  console.log('1. Use the Stake button in your dashboard');
  console.log('2. Connect your wallet (7BZQ...EKHR)');
  console.log('3. Enter amount and click STAKE');
  console.log('4. Confirm the transaction\n');
  
  console.log('Once you stake, run check-my-rewards.js to verify!');
}

stakeWhistle().catch(console.error);
