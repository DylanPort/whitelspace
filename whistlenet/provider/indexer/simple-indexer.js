/**
 * Simple WHISTLE Indexer - Populates SQLite from Solana blockchain
 * Usage: node simple-indexer.js
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Configuration
const RPC_URL = process.env.MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com';
const DB_PATH = path.join(__dirname, '../data/whistle-mainnet.db');
const BATCH_SIZE = 5; // Process 5 transactions at a time  
const DELAY_MS = 2000; // 2 second delay between batches to avoid rate limits

// Known DEX programs to track
const DEX_PROGRAMS = {
  RAYDIUM_V4: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  RAYDIUM_V3: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
  ORCA_V1: '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP',
  ORCA_V2: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  JUPITER_V6: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  PUMP_FUN: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
};

// Popular tokens to track
const TRACKED_TOKENS = [
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
  'So11111111111111111111111111111111111111112', // Wrapped SOL
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // Marinade SOL
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj', // Staked SOL
];

console.log('\n🚀 WHISTLE Simple Indexer Starting...\n');
console.log(`   RPC: ${RPC_URL}`);
console.log(`   Database: ${DB_PATH}`);
console.log(`   Mode: Track popular DEX swaps\n`);

// Initialize connection
const connection = new Connection(RPC_URL, 'confirmed');

// Initialize database
const db = new Database(DB_PATH);

// Ensure schema exists
const schemaPath = path.join(__dirname, '../config/schema-sqlite.sql');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  console.log('✅ Database schema loaded');
}

// Statistics
let stats = {
  blocksProcessed: 0,
  transactionsIndexed: 0,
  tokensIndexed: 0,
  swapsFound: 0,
  startTime: Date.now(),
};

// Insert transaction
function insertTransaction(tx) {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO transactions 
      (signature, slot, block_time, fee, status, program_ids, raw_data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      tx.signature,
      tx.slot,
      tx.blockTime,
      tx.meta?.fee || 0,
      tx.meta?.err ? 'failed' : 'success',
      tx.transaction.message.instructions.map(ix => ix.programId.toBase58()).join(','),
      JSON.stringify(tx)
    );
    
    stats.transactionsIndexed++;
    return true;
  } catch (error) {
    if (!error.message.includes('UNIQUE constraint')) {
      console.error('Error inserting transaction:', error.message);
    }
    return false;
  }
}

// Insert token mint
function insertTokenMint(address, info) {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO token_mints
      (address, supply, decimals, mint_authority, freeze_authority, is_initialized, last_update_slot)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      address,
      info.supply,
      info.decimals,
      info.mintAuthority,
      info.freezeAuthority,
      info.isInitialized ? 1 : 0,
      0
    );
    
    stats.tokensIndexed++;
    return true;
  } catch (error) {
    return false;
  }
}

// Index a single token
async function indexToken(address) {
  try {
    const pubkey = new PublicKey(address);
    const accountInfo = await connection.getParsedAccountInfo(pubkey);
    
    if (accountInfo.value && 'parsed' in accountInfo.value.data) {
      const parsed = accountInfo.value.data.parsed;
      if (parsed.type === 'mint') {
        insertTokenMint(address, parsed.info);
        return true;
      }
    }
  } catch (error) {
    console.error(`Error indexing token ${address}:`, error.message);
  }
  return false;
}

// Index transactions for a token
async function indexTokenTransactions(tokenAddress) {
  try {
    const pubkey = new PublicKey(tokenAddress);
    const signatures = await connection.getSignaturesForAddress(pubkey, { limit: BATCH_SIZE });
    
    console.log(`📥 Found ${signatures.length} transactions for ${tokenAddress.substring(0, 8)}...`);
    
    for (const sig of signatures) {
      try {
        const tx = await connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });
        
        if (tx) {
          insertTransaction({ ...tx, signature: sig.signature });
          
          // Check if it's a DEX swap
          const programIds = tx.transaction.message.instructions.map(ix => ix.programId.toBase58());
          const isDexSwap = Object.values(DEX_PROGRAMS).some(dex => programIds.includes(dex));
          
          if (isDexSwap) {
            stats.swapsFound++;
          }
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 400));
        
      } catch (error) {
        // Skip individual tx errors
      }
    }
    
    return signatures.length;
  } catch (error) {
    console.error(`Error indexing transactions for ${tokenAddress}:`, error.message);
    return 0;
  }
}

// Print statistics
function printStats() {
  const elapsed = (Date.now() - stats.startTime) / 1000;
  const txPerSec = (stats.transactionsIndexed / elapsed).toFixed(2);
  
  console.log('\n📊 Indexer Statistics:');
  console.log(`   Transactions Indexed: ${stats.transactionsIndexed}`);
  console.log(`   DEX Swaps Found: ${stats.swapsFound}`);
  console.log(`   Tokens Indexed: ${stats.tokensIndexed}`);
  console.log(`   Elapsed Time: ${elapsed.toFixed(1)}s`);
  console.log(`   Speed: ${txPerSec} tx/sec\n`);
}

// Main indexing loop
async function main() {
  console.log('🔄 Starting indexing...\n');
  
  // Step 1: Index popular tokens
  console.log('📍 Step 1: Indexing popular token metadata...');
  for (const token of TRACKED_TOKENS) {
    await indexToken(token);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  console.log(`✅ Indexed ${stats.tokensIndexed} tokens\n`);
  
  // Step 2: Index transactions for each token
  console.log('📍 Step 2: Indexing token transactions (DEX swaps)...');
  for (const token of TRACKED_TOKENS) {
    const count = await indexTokenTransactions(token);
    console.log(`   ✅ ${token.substring(0, 8)}...: ${count} transactions`);
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  }
  
  console.log('\n✅ Initial indexing complete!');
  printStats();
  
  console.log('💡 Tips:');
  console.log('   - Run this script periodically to keep data fresh');
  console.log('   - Reduce DELAY_MS if you have a paid RPC');
  console.log('   - Add more tokens to TRACKED_TOKENS array');
  console.log('   - Data is now available via /api/tokens/trending and /api/tokens/volume\n');
  
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Start
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

