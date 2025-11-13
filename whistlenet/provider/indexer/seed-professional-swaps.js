/**
 * Seed professional-grade swap data
 * Uses the proper token_swaps table structure
 */

const Database = require('better-sqlite3');
const path = require('path');
const { insertSwap } = require('./swap-parser');

const dbPath = path.join(__dirname, '../data/whistle-mainnet.db');
const db = new Database(dbPath);

console.log('\n🌱 Seeding professional swap data...\n');

// Real Solana token addresses
const TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  PYTH: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
  MSOL: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
  ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
};

const DEX_PROGRAMS = [
  'RAYDIUM_V4',
  'ORCA_V2', 
  'JUPITER_V6',
  'PUMP_FUN',
];

// Common trading pairs with realistic volumes
const TRADING_PAIRS = [
  { source: 'SOL', dest: 'USDC', baseVolume: 1_000_000_000, weight: 30 }, // Most popular
  { source: 'USDC', dest: 'SOL', baseVolume: 1_000_000_000, weight: 30 },
  { source: 'SOL', dest: 'BONK', baseVolume: 500_000_000, weight: 15 },
  { source: 'BONK', dest: 'SOL', baseVolume: 500_000_000, weight: 15 },
  { source: 'SOL', dest: 'WIF', baseVolume: 300_000_000, weight: 10 },
  { source: 'WIF', dest: 'SOL', baseVolume: 300_000_000, weight: 10 },
  { source: 'USDC', dest: 'USDT', baseVolume: 200_000_000, weight: 8 },
  { source: 'USDT', dest: 'USDC', baseVolume: 200_000_000, weight: 8 },
  { source: 'SOL', dest: 'JUP', baseVolume: 150_000_000, weight: 6 },
  { source: 'JUP', dest: 'SOL', baseVolume: 150_000_000, weight: 6 },
  { source: 'SOL', dest: 'MSOL', baseVolume: 100_000_000, weight: 5 },
  { source: 'MSOL', dest: 'SOL', baseVolume: 100_000_000, weight: 5 },
  { source: 'USDC', dest: 'BONK', baseVolume: 80_000_000, weight: 4 },
  { source: 'BONK', dest: 'USDC', baseVolume: 80_000_000, weight: 4 },
  { source: 'SOL', dest: 'RAY', baseVolume: 60_000_000, weight: 3 },
  { source: 'RAY', dest: 'SOL', baseVolume: 60_000_000, weight: 3 },
];

/**
 * Generate realistic user addresses
 */
function generateUserAddress() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';
  let address = '';
  for (let i = 0; i < 44; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
}

/**
 * Generate realistic signature
 */
function generateSignature() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';
  let sig = '';
  for (let i = 0; i < 88; i++) {
    sig += chars[Math.floor(Math.random() * chars.length)];
  }
  return sig;
}

/**
 * Select trading pair based on weight
 */
function selectTradingPair() {
  const totalWeight = TRADING_PAIRS.reduce((sum, pair) => sum + pair.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const pair of TRADING_PAIRS) {
    random -= pair.weight;
    if (random <= 0) {
      return pair;
    }
  }
  
  return TRADING_PAIRS[0];
}

/**
 * Generate professional swap data
 */
function generateSwaps(count = 200) {
  const now = Math.floor(Date.now() / 1000);
  const swaps = [];
  
  console.log(`   Generating ${count} realistic swaps...\n`);
  
  for (let i = 0; i < count; i++) {
    const pair = selectTradingPair();
    const dex = DEX_PROGRAMS[Math.floor(Math.random() * DEX_PROGRAMS.length)];
    
    // Random time in last 24 hours (weighted towards recent)
    const timeFactor = Math.pow(Math.random(), 2); // Bias towards recent
    const blockTime = now - Math.floor(timeFactor * 86400);
    
    // Generate amounts with some variance
    const variance = 0.5 + Math.random(); // 50% to 150% of base
    const sourceAmount = Math.floor(pair.baseVolume * variance);
    const destAmount = Math.floor(pair.baseVolume * variance * (0.98 + Math.random() * 0.04)); // 98-102% (slippage)
    
    swaps.push({
      signature: generateSignature(),
      slot: 250000000 + i,
      blockTime,
      userAddress: generateUserAddress(),
      sourceMint: TOKENS[pair.source],
      sourceAmount: sourceAmount.toString(),
      destinationMint: TOKENS[pair.dest],
      destinationAmount: destAmount.toString(),
      dexProgram: dex,
    });
  }
  
  return swaps;
}

/**
 * Main seeding function
 */
try {
  // Clear old swap data
  console.log('   Clearing old swap data...');
  db.prepare('DELETE FROM token_swaps').run();
  console.log('   ✅ Cleared\n');
  
  // Generate and insert swaps
  const swaps = generateSwaps(200);
  
  console.log('   Inserting swaps into database...');
  let inserted = 0;
  
  const insertMany = db.transaction((swaps) => {
    for (const swap of swaps) {
      if (insertSwap(db, swap)) {
        inserted++;
      }
    }
  });
  
  insertMany(swaps);
  
  console.log(`   ✅ Inserted ${inserted} swaps\n`);
  
  // Show statistics
  console.log('📊 Database Summary:\n');
  
  const totalSwaps = db.prepare('SELECT COUNT(*) as count FROM token_swaps').get();
  console.log(`   Total Swaps: ${totalSwaps.count}`);
  
  const uniqueTokens = db.prepare(`
    SELECT COUNT(DISTINCT destination_mint) as count FROM token_swaps
  `).get();
  console.log(`   Unique Tokens Traded: ${uniqueTokens.count}`);
  
  const uniqueTraders = db.prepare(`
    SELECT COUNT(DISTINCT user_address) as count FROM token_swaps
  `).get();
  console.log(`   Unique Traders: ${uniqueTraders.count}`);
  
  // Top trending tokens
  console.log('\n🔥 Top Trending Tokens (by swap count):\n');
  const trending = db.prepare(`
    SELECT 
      destination_mint,
      COUNT(*) as swap_count,
      COUNT(DISTINCT user_address) as unique_traders
    FROM token_swaps
    GROUP BY destination_mint
    ORDER BY swap_count DESC
    LIMIT 5
  `).all();
  
  trending.forEach((token, i) => {
    const tokenName = Object.keys(TOKENS).find(k => TOKENS[k] === token.destination_mint);
    console.log(`   ${i + 1}. ${tokenName || 'UNKNOWN'}`);
    console.log(`      Swaps: ${token.swap_count}, Traders: ${token.unique_traders}`);
  });
  
  console.log('\n✅ Professional swap data seeded!\n');
  console.log('📡 Test your API:');
  console.log('   curl http://localhost:8080/api/tokens/trending/24h\n');
  
} catch (error) {
  console.error('❌ Error seeding swaps:', error.message);
  console.error(error.stack);
  process.exit(1);
}

db.close();

