#!/usr/bin/env node
/**
 * Analyze the stake transaction to see what actually happened
 */

const { Connection, PublicKey } = require('@solana/web3.js');

const RPC = 'https://rpc.whistle.ninja';
const connection = new Connection(RPC, 'confirmed');

const TX_SIGNATURE = '3QWg3hwshYMjr52P9ghApppUMZjKFo5EnBJaDuthopxzoa9BdqmexiSAzYCGi3UkoaqLFWarUGnXQBXoyiLKtSQW';

async function analyzeStakeTransaction() {
  console.log('\n🔍 Analyzing Your Stake Transaction\n');
  console.log('Transaction:', TX_SIGNATURE);
  console.log('Solscan:', `https://solscan.io/tx/${TX_SIGNATURE}`);
  console.log('='.repeat(70));
  
  try {
    const tx = await connection.getParsedTransaction(TX_SIGNATURE, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed'
    });
    
    if (!tx) {
      console.log('\n❌ Transaction not found or too old');
      return;
    }
    
    console.log('\n✅ Transaction Found!');
    console.log('Block Time:', new Date(tx.blockTime * 1000).toISOString());
    console.log('Slot:', tx.slot);
    console.log('Success:', !tx.meta.err ? '✅ YES' : '❌ FAILED');
    
    if (tx.meta.err) {
      console.log('Error:', JSON.stringify(tx.meta.err));
      return;
    }
    
    // Get all accounts involved
    console.log('\n📝 Accounts Involved:');
    const accountKeys = tx.transaction.message.accountKeys;
    
    for (let i = 0; i < Math.min(10, accountKeys.length); i++) {
      const account = accountKeys[i];
      const pubkey = account.pubkey.toBase58();
      const signer = account.signer ? '🔑 SIGNER' : '';
      const writable = account.writable ? '✏️  WRITABLE' : '';
      
      console.log(`   ${i}. ${pubkey} ${signer} ${writable}`);
    }
    
    // Check instructions
    console.log('\n📦 Instructions:');
    const instructions = tx.transaction.message.instructions;
    
    for (let i = 0; i < instructions.length; i++) {
      const ix = instructions[i];
      console.log(`\n   Instruction ${i + 1}:`);
      
      if ('parsed' in ix) {
        console.log('      Type:', ix.parsed.type);
        console.log('      Info:', JSON.stringify(ix.parsed.info, null, 2).substring(0, 200));
      } else {
        console.log('      Program:', ix.programId.toBase58());
        console.log('      Accounts:', ix.accounts.length);
        console.log('      Data length:', ix.data.length, 'bytes');
      }
    }
    
    // Check token balance changes
    console.log('\n💰 Token Balance Changes:');
    if (tx.meta.preTokenBalances && tx.meta.postTokenBalances) {
      for (let i = 0; i < tx.meta.postTokenBalances.length; i++) {
        const pre = tx.meta.preTokenBalances.find(b => b.accountIndex === tx.meta.postTokenBalances[i].accountIndex);
        const post = tx.meta.postTokenBalances[i];
        
        if (pre) {
          const change = post.uiTokenAmount.uiAmount - pre.uiTokenAmount.uiAmount;
          const owner = post.owner;
          
          console.log(`   ${owner}:`);
          console.log(`      Before: ${pre.uiTokenAmount.uiAmount}`);
          console.log(`      After: ${post.uiTokenAmount.uiAmount}`);
          console.log(`      Change: ${change > 0 ? '+' : ''}${change}`);
        }
      }
    }
    
    // Check SOL balance changes
    console.log('\n💵 SOL Balance Changes:');
    for (let i = 0; i < Math.min(10, accountKeys.length); i++) {
      const pre = tx.meta.preBalances[i];
      const post = tx.meta.postBalances[i];
      const change = (post - pre) / 1e9;
      
      if (change !== 0) {
        console.log(`   ${accountKeys[i].pubkey.toBase58()}:`);
        console.log(`      Change: ${change > 0 ? '+' : ''}${change} SOL`);
      }
    }
    
    // Check for new accounts created
    console.log('\n🆕 Accounts Created:');
    const innerInstructions = tx.meta.innerInstructions || [];
    let accountsCreated = false;
    
    for (const inner of innerInstructions) {
      for (const ix of inner.instructions) {
        if ('parsed' in ix && ix.parsed.type === 'createAccount') {
          accountsCreated = true;
          console.log('   ✅ New account:', ix.parsed.info.newAccount);
          console.log('      Space:', ix.parsed.info.space, 'bytes');
          console.log('      Lamports:', ix.parsed.info.lamports);
        }
      }
    }
    
    if (!accountsCreated) {
      console.log('   ❌ No new accounts created');
    }
    
    // Check log messages
    console.log('\n📋 Program Logs:');
    if (tx.meta.logMessages) {
      const relevantLogs = tx.meta.logMessages.filter(log => 
        !log.includes('invoke') && !log.includes('success') && log.trim().length > 0
      );
      
      for (const log of relevantLogs.slice(0, 15)) {
        console.log('   ', log);
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n💡 SUMMARY:');
    console.log('Transaction succeeded:', !tx.meta.err ? '✅' : '❌');
    console.log('New accounts created:', accountsCreated ? '✅' : '❌');
    
    // Try to determine what happened
    if (!accountsCreated) {
      console.log('\n⚠️  PROBLEM: No staker account was created!');
      console.log('This means:');
      console.log('1. The transaction might have done something else');
      console.log('2. OR the account already existed');
      console.log('3. OR the transaction format is different than expected');
    }
    
  } catch (error) {
    console.error('\n❌ Error analyzing transaction:', error.message);
  }
}

analyzeStakeTransaction().catch(console.error);
