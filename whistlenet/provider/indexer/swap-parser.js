/**
 * Professional DEX Swap Parser
 * Based on Helius methodology: analyzing preTokenBalances and postTokenBalances
 * 
 * This approach is DEX-agnostic and works across all Solana DEXes:
 * - Raydium, Orca, Jupiter, Pump.fun, etc.
 * - Works regardless of instruction format
 * - Accurate token amounts and pairs
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const Database = require('better-sqlite3');
const path = require('path');

// Known DEX programs for attribution
const DEX_PROGRAMS = {
  RAYDIUM_V4: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  RAYDIUM_V3: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
  ORCA_V1: '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP',
  ORCA_V2: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  JUPITER_V6: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  JUPITER_V4: 'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB',
  PUMP_FUN: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
};

/**
 * Parse a swap from a transaction using token balance changes
 * This is how Helius, Birdeye, and DexScreener do it
 */
function parseSwapFromTransaction(tx) {
  if (!tx || !tx.meta || tx.meta.err) {
    return null; // Skip failed transactions
  }

  const { preTokenBalances, postTokenBalances } = tx.meta;
  
  if (!preTokenBalances || !postTokenBalances || 
      preTokenBalances.length === 0 || postTokenBalances.length === 0) {
    return null; // No token activity
  }

  // Calculate balance changes for each account
  const balanceChanges = new Map();
  
  // Process post balances
  for (const post of postTokenBalances) {
    const key = `${post.accountIndex}_${post.mint}`;
    balanceChanges.set(key, {
      accountIndex: post.accountIndex,
      mint: post.mint,
      owner: post.owner,
      preAmount: '0',
      postAmount: post.uiTokenAmount.amount,
      decimals: post.uiTokenAmount.decimals,
    });
  }
  
  // Subtract pre balances to get delta
  for (const pre of preTokenBalances) {
    const key = `${pre.accountIndex}_${pre.mint}`;
    const existing = balanceChanges.get(key);
    if (existing) {
      existing.preAmount = pre.uiTokenAmount.amount;
    } else {
      balanceChanges.set(key, {
        accountIndex: pre.accountIndex,
        mint: pre.mint,
        owner: pre.owner,
        preAmount: pre.uiTokenAmount.amount,
        postAmount: '0',
        decimals: pre.uiTokenAmount.decimals,
      });
    }
  }
  
  // Calculate net changes
  const changes = [];
  for (const [key, data] of balanceChanges.entries()) {
    const delta = BigInt(data.postAmount) - BigInt(data.preAmount);
    if (delta !== 0n) {
      changes.push({
        mint: data.mint,
        owner: data.owner,
        delta: delta,
        amount: delta > 0n ? delta : -delta,
        isIncrease: delta > 0,
        decimals: data.decimals,
      });
    }
  }
  
  // A swap should have at least 2 token changes:
  // - Source token decreases (sent)
  // - Destination token increases (received)
  if (changes.length < 2) {
    return null;
  }
  
  // Find the user's token changes (increases and decreases)
  const userIncreases = changes.filter(c => c.isIncrease);
  const userDecreases = changes.filter(c => !c.isIncrease);
  
  if (userIncreases.length === 0 || userDecreases.length === 0) {
    return null; // Not a swap
  }
  
  // Get the primary swap (largest amounts)
  const source = userDecreases.reduce((max, curr) => 
    curr.amount > max.amount ? curr : max, userDecreases[0]
  );
  
  const destination = userIncreases.reduce((max, curr) => 
    curr.amount > max.amount ? curr : max, userIncreases[0]
  );
  
  // Determine which DEX program was used
  let dexProgram = 'UNKNOWN';
  if (tx.transaction && tx.transaction.message && tx.transaction.message.instructions) {
    for (const ix of tx.transaction.message.instructions) {
      const programId = ix.programId.toBase58();
      for (const [name, address] of Object.entries(DEX_PROGRAMS)) {
        if (programId === address) {
          dexProgram = name;
          break;
        }
      }
      if (dexProgram !== 'UNKNOWN') break;
    }
  }
  
  // Get user address (owner of the token accounts)
  const userAddress = source.owner || destination.owner;
  
  return {
    signature: tx.signature || tx.transaction.signatures[0],
    slot: tx.slot,
    blockTime: tx.blockTime,
    userAddress,
    sourceMint: source.mint,
    sourceAmount: source.amount.toString(),
    destinationMint: destination.mint,
    destinationAmount: destination.amount.toString(),
    dexProgram,
  };
}

/**
 * Fetch and parse a single transaction signature
 */
async function fetchAndParseSwap(connection, signature) {
  try {
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    
    if (!tx) return null;
    
    return parseSwapFromTransaction({ ...tx, signature });
  } catch (error) {
    console.error(`Error fetching transaction ${signature}:`, error.message);
    return null;
  }
}

/**
 * Insert a parsed swap into the database
 */
function insertSwap(db, swap) {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO token_swaps
      (signature, slot, block_time, user_address, source_mint, source_amount, 
       destination_mint, destination_amount, dex_program)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      swap.signature,
      swap.slot,
      swap.blockTime,
      swap.userAddress,
      swap.sourceMint,
      swap.sourceAmount,
      swap.destinationMint,
      swap.destinationAmount,
      swap.dexProgram
    );
    
    return true;
  } catch (error) {
    if (!error.message.includes('UNIQUE constraint')) {
      console.error('Error inserting swap:', error.message);
    }
    return false;
  }
}

module.exports = {
  parseSwapFromTransaction,
  fetchAndParseSwap,
  insertSwap,
  DEX_PROGRAMS,
};

