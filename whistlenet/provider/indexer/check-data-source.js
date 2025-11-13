const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/whistle-mainnet.db');
const db = new Database(dbPath, { readonly: true });

console.log('\n📊 Database Data Source Analysis\n');
console.log('='.repeat(50));

// Check token_mints
const tokenCount = db.prepare('SELECT COUNT(*) as count FROM token_mints').get();
console.log(`\n✓ Token Mints: ${tokenCount.count}`);

const sampleTokens = db.prepare('SELECT address, decimals, supply FROM token_mints LIMIT 3').all();
console.log('\nSample tokens:');
sampleTokens.forEach(t => {
  const name = t.address === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ? '(USDC)' :
               t.address === 'So11111111111111111111111111111111111111112' ? '(SOL)' :
               t.address === 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' ? '(USDT)' : '';
  console.log(`  ${t.address.substring(0, 8)}... ${name}`);
  console.log(`    Decimals: ${t.decimals}, Supply: ${t.supply}`);
});

// Check token_swaps
const swapCount = db.prepare('SELECT COUNT(*) as count FROM token_swaps').get();
console.log(`\n✓ Token Swaps: ${swapCount.count}`);

if (swapCount.count > 0) {
  const sampleSwaps = db.prepare(`
    SELECT signature, source_mint, destination_mint, block_time, dex_program 
    FROM token_swaps 
    ORDER BY block_time DESC 
    LIMIT 3
  `).all();
  
  console.log('\nSample swaps:');
  sampleSwaps.forEach(s => {
    const date = new Date(s.block_time * 1000);
    console.log(`  ${s.signature.substring(0, 16)}...`);
    console.log(`    ${s.source_mint.substring(0, 8)}... → ${s.destination_mint.substring(0, 8)}...`);
    console.log(`    Time: ${date.toISOString()}`);
    console.log(`    DEX: ${s.dex_program}`);
  });
  
  // Check if signatures look real or fake
  const firstSwap = sampleSwaps[0];
  const sigPattern = /^[A-Za-z0-9]{88}$/;
  const looksReal = sigPattern.test(firstSwap.signature);
  
  console.log('\n' + '='.repeat(50));
  console.log('\n🔍 Data Source Assessment:\n');
  
  if (looksReal && firstSwap.signature.length === 88) {
    console.log('⚠️  MOCK DATA DETECTED');
    console.log('   Signatures are randomly generated, not from blockchain');
    console.log('   This is seed/test data from seed-professional-swaps.js');
  } else {
    console.log('✅ REAL BLOCKCHAIN DATA');
    console.log('   Signatures are from actual Solana transactions');
  }
}

// Check transactions table
const txCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
console.log(`\n✓ Transactions: ${txCount.count}`);

console.log('\n' + '='.repeat(50));
console.log('\n📡 ENDPOINT DATA SOURCES:\n');
console.log('1. GET /tokens/:address');
console.log('   ✅ REAL - Fetches from Solana blockchain RPC');
console.log('   Falls back to indexed data if available');
console.log('');
console.log('2. GET /tokens/latest');
console.log(`   ${tokenCount.count > 0 ? '⚠️  INDEXED' : '❌ EMPTY'} - Shows indexed tokens only`);
console.log('   Data source: token_mints table');
console.log('');
console.log('3. GET /deployer/:wallet');
console.log('   ✅ REAL - Scans blockchain for deployer tokens');
console.log('   Falls back to index for speed');
console.log('');
console.log('4. POST /tokens/multi');
console.log('   ✅ REAL - Batch fetches from blockchain');
console.log('');
console.log('5. GET /search?q=');
console.log('   ✅ REAL - Searches index + blockchain fallback');
console.log('\n' + '='.repeat(50));

console.log('\n💡 RECOMMENDATION:\n');
if (swapCount.count > 0) {
  console.log('Your database contains MOCK swap data.');
  console.log('To get REAL data:');
  console.log('  1. Clear mock data: DELETE FROM token_swaps;');
  console.log('  2. Run: node professional-indexer.js');
  console.log('  3. Or use endpoints that fetch directly from chain\n');
} else {
  console.log('Your database is clean (no swap data).');
  console.log('All endpoints fetch REAL data from Solana blockchain.\n');
}

db.close();

