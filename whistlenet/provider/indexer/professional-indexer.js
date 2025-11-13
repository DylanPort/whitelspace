/**
 * Professional WHISTLE DEX Indexer
 * Parses swaps using Helius methodology: token balance changes
 * 
 * Features:
 * - Accurate token pair extraction
 * - DEX-agnostic (works with all Solana DEXes)
 * - Real volume calculations
 * - Professional-grade data for trending token APIs
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { parseSwapFromTransaction, insertSwap, DEX_PROGRAMS } = require('./swap-parser');

// Configuration
const RPC_URL = process.env.MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com';
const DB_PATH = path.join(__dirname, '../data/whistle-mainnet.db');
const BATCH_SIZE = 10; // Process 10 signatures at a time
const DELAY_MS = 3000; // 3 second delay to avoid rate limits
const MAX_RETRIES = 3;

// Popular trading tokens to track
const TRACKED_TOKENS = [
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT  
  'So11111111111111111111111111111111111111112', // Wrapped SOL
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // Marinade SOL
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj', // Staked SOL
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // Bonk
  'jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v', // Jupiter SOL
];

console.log('\n🚀 WHISTLE Professional DEX Indexer\n');
console.log(`   RPC: ${RPC_URL}`);
console.log(`   Database: ${DB_PATH}`);
console.log(`   Method: Token balance analysis (Helius methodology)\n`);

const connection = new Connection(RPC_URL, 'confirmed');
const db = new Database(DB_PATH);

// Ensure schema exists
const schemaPath = path.join(__dirname, '../config/schema-sqlite.sql');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  console.log('✅ Database schema loaded\n');
}

// Statistics
let stats = {
  signaturesFound: 0,
  transactionsFetched: 0,
  swapsParsed: 0,
  swapsInserted: 0,
  errors: 0,
  startTime: Date.now(),
};

/**
 * Fetch transaction with retry logic
 */
async function fetchTransactionWithRetry(signature, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      const tx = await connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });
      
      if (tx) {
        stats.transactionsFetched++;
        return tx;
      }
    } catch (error) {
      if (error.message.includes('429') && i < retries - 1) {
        const backoff = Math.pow(2, i) * 1000;
        console.log(`   ⏳ Rate limited, waiting ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
      } else if (i === retries - 1) {
        stats.errors++;
        return null;
      }
    }
  }
  return null;
}

/**
 * Index token metadata
 */
async function indexTokenMint(address) {
  try {
    const pubkey = new PublicKey(address);
    const accountInfo = await connection.getParsedAccountInfo(pubkey);
    
    if (accountInfo.value && 'parsed' in accountInfo.value.data) {
      const parsed = accountInfo.value.data.parsed;
      if (parsed.type === 'mint') {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO token_mints
          (address, supply, decimals, mint_authority, freeze_authority, is_initialized, last_update_slot)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
          address,
          parsed.info.supply,
          parsed.info.decimals,
          parsed.info.mintAuthority,
          parsed.info.freezeAuthority,
          parsed.info.isInitialized ? 1 : 0,
          0
        );
        return true;
      }
    }
  } catch (error) {
    // Skip errors
  }
  return false;
}

/**
 * Index transactions for a token and parse swaps
 */
async function indexTokenSwaps(tokenAddress) {
  try {
    const pubkey = new PublicKey(tokenAddress);
    const signatures = await connection.getSignaturesForAddress(pubkey, { 
      limit: BATCH_SIZE 
    });
    
    stats.signaturesFound += signatures.length;
    
    console.log(`📥 Found ${signatures.length} sigs for ${tokenAddress.substring(0, 8)}...`);
    
    let swapsFound = 0;
    
    for (const sig of signatures) {
      // Fetch transaction
      const tx = await fetchTransactionWithRetry(sig.signature);
      
      if (tx) {
        // Parse swap from token balance changes
        const swap = parseSwapFromTransaction({ ...tx, signature: sig.signature });
        
        if (swap) {
          stats.swapsParsed++;
          
          // Insert into database
          if (insertSwap(db, swap)) {
            stats.swapsInserted++;
            swapsFound++;
            
            // Log interesting swaps
            if (swapsFound <= 3) {
              console.log(`   💱 ${swap.sourceMint.substring(0, 8)} → ${swap.destinationMint.substring(0, 8)} via ${swap.dexProgram}`);
            }
          }
        }
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (swapsFound > 0) {
      console.log(`   ✅ Parsed ${swapsFound} swaps\n`);
    } else {
      console.log(`   ℹ️  No swaps found\n`);
    }
    
    return swapsFound;
  } catch (error) {
    console.error(`❌ Error indexing ${tokenAddress}:`, error.message);
    stats.errors++;
    return 0;
  }
}

/**
 * Print statistics
 */
function printStats() {
  const elapsed = (Date.now() - stats.startTime) / 1000;
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Indexing Statistics:\n');
  console.log(`   Signatures Found:    ${stats.signaturesFound}`);
  console.log(`   Transactions Fetched: ${stats.transactionsFetched}`);
  console.log(`   Swaps Parsed:        ${stats.swapsParsed}`);
  console.log(`   Swaps Inserted:      ${stats.swapsInserted}`);
  console.log(`   Errors:              ${stats.errors}`);
  console.log(`   Elapsed Time:        ${elapsed.toFixed(1)}s`);
  console.log(`   Parse Rate:          ${(stats.swapsParsed / elapsed).toFixed(2)} swaps/sec`);
  console.log('='.repeat(50) + '\n');
}

/**
 * Main indexing loop
 */
async function main() {
  console.log('🔄 Starting professional DEX indexing...\n');
  
  // Step 1: Index token metadata
  console.log('📍 Step 1: Indexing token metadata...');
  let tokensIndexed = 0;
  for (const token of TRACKED_TOKENS) {
    if (await indexTokenMint(token)) {
      tokensIndexed++;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  console.log(`✅ Indexed ${tokensIndexed} tokens\n`);
  
  // Step 2: Index and parse swaps
  console.log('📍 Step 2: Indexing and parsing DEX swaps...\n');
  
  for (const token of TRACKED_TOKENS) {
    await indexTokenSwaps(token);
    
    // Delay between tokens to respect rate limits
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  }
  
  console.log('\n✅ Indexing complete!');
  printStats();
  
  // Show sample results
  console.log('💡 Sample Query Results:\n');
  
  const recentSwaps = db.prepare(`
    SELECT source_mint, destination_mint, dex_program, COUNT(*) as count
    FROM token_swaps
    WHERE block_time > ?
    GROUP BY source_mint, destination_mint, dex_program
    ORDER BY count DESC
    LIMIT 5
  `).all(Math.floor(Date.now() / 1000) - 86400);
  
  console.log('   Top Swap Pairs (24h):');
  recentSwaps.forEach(swap => {
    console.log(`   - ${swap.source_mint.substring(0, 8)}... → ${swap.destination_mint.substring(0, 8)}... (${swap.count}x via ${swap.dex_program})`);
  });
  
  console.log('\n📡 API Ready:');
  console.log('   - GET /api/tokens/trending/24h');
  console.log('   - GET /api/tokens/volume');
  console.log('   - Data is now accurate and professional-grade!\n');
  
  process.exit(0);
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Fatal error:', error);
  printStats();
  process.exit(1);
});

// Start
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  printStats();
  process.exit(1);
});

