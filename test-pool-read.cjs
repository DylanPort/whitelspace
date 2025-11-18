const { Connection, PublicKey, Transaction, TransactionInstruction, Keypair } = require('@solana/web3.js');
const fs = require('fs');

const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba', 'confirmed');

const PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr');
const POOL_ADDRESS = new PublicKey('jVaoYCKUFjHkYw975R7tVvRgns5VdfnnquSp2gzwPXB'); // NEW 155-byte pool
const TOKEN_VAULT = new PublicKey('6AP8c7sCQsm2FMvNJw6fQN5PnMdkySH75h7EPE2kD3Yq'); // NEW vault
const WHISTLE_MINT = new PublicKey('6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump');

async function testPoolCompatibility() {
  console.log('\n🧪 TESTING POOL COMPATIBILITY...\n');
  
  // Check if pool is readable
  const poolInfo = await connection.getAccountInfo(POOL_ADDRESS);
  
  if (!poolInfo) {
    console.log('❌ Pool account not found!');
    console.log('   → Need to initialize pool');
    return false;
  }
  
  console.log('✅ Pool account exists');
  console.log('   Size:', poolInfo.data.length, 'bytes');
  console.log('   Owner:', poolInfo.owner.toString());
  
  if (poolInfo.owner.toString() !== PROGRAM_ID.toString()) {
    console.log('❌ Pool not owned by program!');
    return false;
  }
  
  // Parse pool data manually
  const data = poolInfo.data;
  console.log('\n📊 Pool Data:');
  
  try {
    const authority = new PublicKey(data.slice(0, 32));
    const whistle_mint = new PublicKey(data.slice(32, 64));
    const token_vault = new PublicKey(data.slice(64, 96));
    const total_staked = data.readBigUInt64LE(96);
    const is_active = data.readUInt8(128);
    
    console.log('   Authority:', authority.toBase58());
    console.log('   WHISTLE Mint:', whistle_mint.toBase58());
    console.log('   Token Vault:', token_vault.toBase58());
    console.log('   Total Staked:', total_staked.toString());
    console.log('   Is Active:', is_active === 1 ? 'YES' : 'NO');
    
    if (data.length === 163) {
      console.log('\n⚠️  COMPATIBILITY ISSUE DETECTED:');
      console.log('   Pool is 163 bytes but program expects 155 bytes');
      console.log('   This will cause BorshIoError on all transactions');
      console.log('\n❌ RECOMMENDATION: Reinitialize pool with 155 bytes');
      return false;
    } else if (data.length === 155) {
      console.log('\n✅ Pool size matches program expectations!');
      console.log('   → Ready to use');
      return true;
    } else {
      console.log(`\n❌ Unexpected pool size: ${data.length} bytes`);
      return false;
    }
    
  } catch (err) {
    console.log('❌ Failed to parse pool data:', err.message);
    return false;
  }
}

testPoolCompatibility().then(compatible => {
  console.log('\n' + '═'.repeat(50));
  if (compatible) {
    console.log('✅ POOL IS COMPATIBLE - NO REINITIALIZATION NEEDED');
    console.log('   You can start staking immediately!');
  } else {
    console.log('❌ POOL NEEDS REINITIALIZATION');
    console.log('   Run the initialization script with 155-byte size');
  }
  console.log('═'.repeat(50) + '\n');
  process.exit(compatible ? 0 : 1);
}).catch(console.error);



