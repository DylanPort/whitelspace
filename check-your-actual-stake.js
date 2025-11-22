#!/usr/bin/env node
/**
 * Check the token vault and find YOUR stake
 */

const { Connection, PublicKey } = require('@solana/web3.js');

const RPC = 'https://rpc.whistle.ninja';
const connection = new Connection(RPC, 'confirmed');

const PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr');
const TOKEN_VAULT = new PublicKey('6AP8c7sCQsm2FMvNJw6fQN5PnMdkySH75h7EPE2kD3Yq');
const PAYMENT_VAULT = new PublicKey('CU1ZcHccCbQT8iA6pcb3ZyTjog8ckmDHH8gaAmKfC73G');
const YOUR_WALLET = new PublicKey('7BZQ3XchGEKHRu45LqVPRPCb6diLRE5BRXtPJHMEKHRR');

async function checkYourStake() {
  console.log('\n💰 Checking Your Staked Tokens\n');
  console.log('Your Wallet:', YOUR_WALLET.toBase58());
  console.log('='.repeat(70));
  
  // 1. Check token vault balance
  console.log('\n📦 TOKEN VAULT (WHISTLE tokens)');
  console.log('Address:', TOKEN_VAULT.toBase58());
  
  try {
    const tokenBalance = await connection.getTokenAccountBalance(TOKEN_VAULT);
    console.log('Total Staked:', tokenBalance.value.uiAmount, 'WHISTLE');
    console.log('Raw Amount:', tokenBalance.value.amount);
  } catch (e) {
    console.log('Error reading token vault:', e.message);
  }
  
  // 2. Check payment vault
  console.log('\n💵 PAYMENT VAULT (SOL rewards)');
  console.log('Address:', PAYMENT_VAULT.toBase58());
  
  const vaultInfo = await connection.getAccountInfo(PAYMENT_VAULT);
  if (vaultInfo) {
    console.log('Balance:', vaultInfo.lamports / 1e9, 'SOL');
    
    if (vaultInfo.data.length >= 64) {
      const stakerPool = Number(vaultInfo.data.readBigUInt64LE(32)) / 1e9;
      const bonusPool = Number(vaultInfo.data.readBigUInt64LE(40)) / 1e9;
      const treasury = Number(vaultInfo.data.readBigUInt64LE(48)) / 1e9;
      const totalCollected = Number(vaultInfo.data.readBigUInt64LE(56)) / 1e9;
      
      console.log('├─ Staker Rewards Pool:', stakerPool, 'SOL 🎁');
      console.log('├─ Bonus Pool:', bonusPool, 'SOL');
      console.log('├─ Treasury:', treasury, 'SOL');
      console.log('└─ Total Collected:', totalCollected, 'SOL');
    }
  }
  
  // 3. Get ALL staker accounts and check if yours is there
  console.log('\n🔍 Searching for YOUR Staker Account...\n');
  
  const allAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      { dataSize: 82 } // Staker account size
    ]
  });
  
  console.log(`Found ${allAccounts.length} staker accounts total`);
  
  let foundYou = false;
  let yourStake = 0;
  let yourRewards = 0;
  
  for (const { pubkey, account } of allAccounts) {
    // Try to parse as staker account
    // First 32 bytes should be the staker pubkey
    const stakerPubkey = new PublicKey(account.data.slice(0, 32));
    
    if (stakerPubkey.equals(YOUR_WALLET)) {
      foundYou = true;
      console.log('\n✅ FOUND YOUR STAKER ACCOUNT!');
      console.log('PDA:', pubkey.toBase58());
      
      // Parse the account data
      if (account.data.length >= 40) {
        yourStake = Number(account.data.readBigUInt64LE(32)) / 1e6;
        console.log('Your Staked Amount:', yourStake.toLocaleString(), 'WHISTLE');
      }
      
      if (account.data.length >= 48) {
        const accessTokens = Number(account.data.readBigUInt64LE(40));
        console.log('Access Tokens:', accessTokens);
      }
      
      // Check for pending rewards (might be at different offsets)
      for (let offset = 48; offset <= account.data.length - 8; offset += 8) {
        const value = Number(account.data.readBigUInt64LE(offset));
        if (value > 0 && value < 1e18) { // Reasonable range
          console.log(`Possible rewards at offset ${offset}:`, value, 'lamports =', value / 1e9, 'SOL');
        }
      }
      
      console.log('\nRaw account data (hex):');
      console.log(account.data.toString('hex').substring(0, 200), '...');
      
      break;
    }
  }
  
  if (!foundYou) {
    console.log('\n❌ Your wallet not found in any staker accounts!');
    console.log('\nLet me check all staker wallets:');
    
    const first10 = allAccounts.slice(0, 10);
    for (let i = 0; i < first10.length; i++) {
      const stakerPubkey = new PublicKey(first10[i].account.data.slice(0, 32));
      console.log(`${i + 1}. ${stakerPubkey.toBase58()}`);
    }
    
    if (allAccounts.length > 10) {
      console.log(`... and ${allAccounts.length - 10} more`);
    }
  } else {
    // Calculate your share
    console.log('\n📊 Calculating Your Rewards...');
    
    // Get total staked from pool
    const [poolPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('staking_pool'), new PublicKey('6BNdVMgx2JZJPvkRCLyV2LLxft4S1cwuqoX2BS9eFyvh').toBuffer()],
      PROGRAM_ID
    );
    
    const poolInfo = await connection.getAccountInfo(poolPDA);
    if (poolInfo && poolInfo.data.length >= 56) {
      const totalStaked = Number(poolInfo.data.readBigUInt64LE(48)) / 1e6;
      
      console.log('Total Network Staked:', totalStaked.toLocaleString(), 'WHISTLE');
      console.log('Your Stake:', yourStake.toLocaleString(), 'WHISTLE');
      
      if (totalStaked > 0) {
        const yourPercentage = (yourStake / totalStaked) * 100;
        console.log('Your Percentage:', yourPercentage.toFixed(6), '%');
        
        // Calculate share of staker pool
        const vaultInfo = await connection.getAccountInfo(PAYMENT_VAULT);
        if (vaultInfo && vaultInfo.data.length >= 40) {
          const stakerPool = Number(vaultInfo.data.readBigUInt64LE(32));
          const yourShare = (stakerPool * yourPercentage) / 100;
          
          console.log('\n💰 YOUR CLAIMABLE REWARDS:');
          console.log('From current pool:', yourShare / 1e9, 'SOL');
          console.log('USD Value (@ $200/SOL):', (yourShare / 1e9 * 200).toFixed(6), 'USD');
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(70));
}

checkYourStake().catch(console.error);
