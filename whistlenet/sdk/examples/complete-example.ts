/**
 * WHISTLE SDK Complete Example
 * 
 * This example demonstrates all major SDK features:
 * - Staking WHISTLE tokens
 * - Querying blockchain data
 * - Claiming rewards
 * - Provider registration
 */

import { WhistleClient, Keypair, PublicKey } from '@whistle/sdk';

async function main() {
  console.log('🚀 WHISTLE Network SDK Example\n');

  // ============= 1. SETUP =============
  
  console.log('📦 Setting up client...');
  const client = new WhistleClient({
    network: 'devnet', // Use devnet for testing
  });

  // Load your keypair (DO NOT expose private keys in production!)
  // This is just for example - use environment variables in real apps
  const userKeypair = Keypair.generate(); // In reality: Keypair.fromSecretKey(YOUR_SECRET)
  console.log('Wallet:', userKeypair.publicKey.toString());

  // ============= 2. CHECK BALANCE =============
  
  console.log('\n💰 Checking WHISTLE balance...');
  const balance = await client.getWhistleBalance(userKeypair.publicKey);
  console.log(`Balance: ${balance} WHISTLE`);

  if (balance < 100) {
    console.log('⚠️  Insufficient WHISTLE tokens. You need at least 100 WHISTLE to stake.');
    console.log('Get WHISTLE tokens at: https://whistle.network/get-tokens');
    return;
  }

  // ============= 3. STAKE WHISTLE TOKENS =============
  
  console.log('\n🔒 Staking 1000 WHISTLE tokens...');
  try {
    const stakeResult = await client.stake(
      {
        amount: 1000,
        wallet: userKeypair.publicKey,
      },
      userKeypair
    );

    if (stakeResult.confirmed) {
      console.log('✅ Staked successfully!');
      console.log('Transaction:', stakeResult.signature);
    } else {
      console.log('❌ Stake failed:', stakeResult.error);
    }
  } catch (error) {
    console.log('❌ Stake error:', error);
  }

  // ============= 4. QUERY STAKER ACCOUNT =============
  
  console.log('\n📊 Fetching staker account...');
  const stakerAccount = await client.getStakerAccount(userKeypair.publicKey);
  
  if (stakerAccount) {
    console.log('Staked amount:', client.fromBaseUnits(stakerAccount.stakedAmount), 'WHISTLE');
    console.log('Access tokens:', client.fromBaseUnits(stakerAccount.accessTokens));
    console.log('Pending rewards:', client.fromBaseUnits(stakerAccount.pendingRewards), 'SOL');
  } else {
    console.log('No staker account found (not staked yet)');
  }

  // ============= 5. QUERY BLOCKCHAIN DATA =============
  
  console.log('\n🔍 Querying blockchain data...');
  
  // Example wallet to query (replace with actual wallet)
  const targetWallet = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
  
  try {
    // Get transactions
    console.log('\n📜 Getting transactions...');
    const transactions = await client.queryTransactions({
      wallet: targetWallet,
      from: Date.now() - 30 * 24 * 60 * 60 * 1000, // Last 30 days
      limit: 10,
    });
    
    console.log(`Found ${transactions.length} transactions`);
    transactions.slice(0, 3).forEach((tx, i) => {
      console.log(`\nTransaction ${i + 1}:`);
      console.log('  Signature:', tx.signature.slice(0, 20) + '...');
      console.log('  From:', tx.from);
      console.log('  To:', tx.to);
      console.log('  Amount:', tx.amount);
      console.log('  Status:', tx.status);
    });

    // Get token balances
    console.log('\n💎 Getting token balances...');
    const balances = await client.getTokenBalances(targetWallet);
    console.log(`Found ${balances.length} token balances`);
    balances.slice(0, 5).forEach((balance, i) => {
      console.log(`${i + 1}. ${balance.uiAmount} tokens (${balance.mint.slice(0, 10)}...)`);
    });

    // Get NFTs
    console.log('\n🖼️  Getting NFTs...');
    const nfts = await client.getNFTs(targetWallet);
    console.log(`Found ${nfts.length} NFTs`);
    nfts.slice(0, 3).forEach((nft, i) => {
      console.log(`${i + 1}. ${nft.name} (${nft.symbol})`);
    });

  } catch (error) {
    console.log('Query error:', error);
    console.log('Note: Queries require active providers. Check network status.');
  }

  // ============= 6. CHECK PROVIDERS =============
  
  console.log('\n🖥️  Checking active providers...');
  const providers = await client.getActiveProviders();
  console.log(`Active providers: ${providers.length}`);
  
  if (providers.length > 0) {
    console.log('\nTop 3 providers:');
    providers.slice(0, 3).forEach((provider, i) => {
      console.log(`\n${i + 1}. ${provider.publicKey.toString().slice(0, 20)}...`);
      console.log(`   Reputation: ${provider.reputationScore}/10000`);
      console.log(`   Uptime: ${provider.uptimePercentage/100}%`);
      console.log(`   Response time: ${provider.responseTimeAvg}ms`);
      console.log(`   Endpoint: ${provider.endpoint}`);
    });
  } else {
    console.log('⚠️  No active providers found. Network may be initializing.');
  }

  // ============= 7. CLAIM REWARDS =============
  
  console.log('\n💸 Checking rewards...');
  if (stakerAccount && stakerAccount.pendingRewards > BigInt(0)) {
    console.log(`You have ${client.fromBaseUnits(stakerAccount.pendingRewards)} SOL to claim!`);
    
    console.log('Claiming rewards...');
    const claimResult = await client.claimRewards(
      userKeypair.publicKey,
      userKeypair
    );
    
    if (claimResult.confirmed) {
      console.log('✅ Rewards claimed!');
      console.log('Transaction:', claimResult.signature);
    } else {
      console.log('❌ Claim failed:', claimResult.error);
    }
  } else {
    console.log('No rewards to claim yet.');
    console.log('Rewards accumulate as users pay for queries (5% goes to stakers).');
  }

  // ============= 8. EVENT LISTENING =============
  
  console.log('\n📡 Setting up event listener...');
  client.on((event) => {
    console.log(`\n🔔 Event: ${event.type}`);
    console.log('Data:', event.data);
  });

  // ============= 9. PROVIDER EXAMPLE (Optional) =============
  
  console.log('\n\n🏢 Provider Registration Example:');
  console.log('If you want to run a provider node and earn SOL:');
  console.log(`
const providerKeypair = Keypair.generate();

await client.registerProvider(
  {
    provider: providerKeypair.publicKey,
    endpoint: 'https://your-provider-api.com:8080',
    bondAmount: 1000, // 1000 WHISTLE bond
  },
  providerKeypair
);

console.log('Provider registered! Start serving queries to earn 70% of query payments.');
  `);

  // ============= 10. UNSTAKING EXAMPLE =============
  
  console.log('\n🔓 Unstaking Example:');
  console.log('To unstake your WHISTLE tokens (after 24h cooldown):');
  console.log(`
const unstakeResult = await client.unstake(
  {
    amount: 500, // Unstake 500 WHISTLE
    wallet: userKeypair.publicKey,
  },
  userKeypair
);
  `);

  console.log('\n\n✨ Example complete!');
  console.log('\nNext steps:');
  console.log('1. Get WHISTLE tokens: https://whistle.network/get-tokens');
  console.log('2. Stake to access network: https://whistle.network/stake');
  console.log('3. Start querying: https://docs.whistle.network/api');
  console.log('4. Earn rewards: https://whistle.network/rewards');
}

// Run the example
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });



