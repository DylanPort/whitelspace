// Smart Pool Indexer - Token-focused approach
// Instead of scanning ALL pools, we discover pools for specific tokens
// This works with public RPC and builds cache gradually
const { Connection, PublicKey } = require('@solana/web3.js');
const Database = require('better-sqlite3');

const RPC_URL = process.env.MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');
const db = new Database('../data/whistle-mainnet.db');

// Known addresses
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const SOL = 'So11111111111111111111111111111111111111112';
const WSOL = 'So11111111111111111111111111111111111111112';

// DEX Programs
const RAYDIUM_V4 = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
const PUMP_FUN = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

// Database statement
const insertPool = db.prepare(`
  INSERT OR REPLACE INTO liquidity_pools (
    address, dex, token_a, token_b, reserve_a, reserve_b,
    decimals_a, decimals_b, price_a_to_b, price_b_to_a,
    liquidity_usd, fee_rate, is_active, last_updated
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`);

// Derive Raydium pool address
function getRaydiumPoolAddress(tokenA, tokenB) {
  try {
    const program = new PublicKey(RAYDIUM_V4);
    const mintA = new PublicKey(tokenA);
    const mintB = new PublicKey(tokenB);
    
    // Raydium uses a complex PDA derivation
    // For simplicity, we'll scan token accounts owned by pools
    return null;
  } catch (e) {
    return null;
  }
}

// Find pools for a token by scanning its token accounts
async function findPoolsForToken(tokenMint) {
  console.log(`\n[${tokenMint.slice(0, 8)}...] Scanning for pools...`);
  
  try {
    const mint = new PublicKey(tokenMint);
    const tokenProgram = new PublicKey(TOKEN_PROGRAM);
    
    // Get all token accounts for this mint
    const accounts = await connection.getProgramAccounts(tokenProgram, {
      filters: [
        { dataSize: 165 },
        { memcmp: { offset: 0, bytes: mint.toBase58() } },
      ],
    });
    
    console.log(`  Found ${accounts.length} token accounts`);
    
    // Look for accounts with large balances (likely pools)
    const poolCandidates = [];
    
    for (const account of accounts) {
      const data = account.account.data;
      const amount = data.readBigUInt64LE(64);
      const owner = new PublicKey(data.slice(32, 64)).toBase58();
      
      // Pool accounts typically have large balances
      const balance = Number(amount) / 1e6;
      
      if (balance > 1000) { // Threshold for pool-sized balance
        poolCandidates.push({
          address: account.pubkey.toBase58(),
          owner,
          balance,
        });
      }
    }
    
    console.log(`  Found ${poolCandidates.length} potential pool accounts`);
    
    // Now check if these owners are actual pool programs
    for (const candidate of poolCandidates.slice(0, 10)) {
      // Try to fetch the pool state
      try {
        const poolAccount = await connection.getAccountInfo(new PublicKey(candidate.owner));
        if (poolAccount && poolAccount.owner.toBase58() === RAYDIUM_V4) {
          console.log(`  ✅ Found Raydium pool: ${candidate.owner}`);
          await parseAndStorePool(candidate.owner, poolAccount.data, tokenMint);
        }
      } catch (e) {
        // Not a pool
      }
    }
    
    // Check Pump.fun bonding curve
    await checkPumpFunCurve(tokenMint);
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
}

// Check Pump.fun bonding curve
async function checkPumpFunCurve(tokenMint) {
  try {
    const mint = new PublicKey(tokenMint);
    const program = new PublicKey(PUMP_FUN);
    
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from('bonding-curve'), mint.toBuffer()],
      program
    );
    
    const account = await connection.getAccountInfo(bondingCurve);
    if (!account) return;
    
    const data = account.data;
    
    const virtualTokenReserves = Number(data.readBigUInt64LE(8)) / 1e6;
    const virtualSolReserves = Number(data.readBigUInt64LE(16)) / 1e9;
    const realTokenReserves = Number(data.readBigUInt64LE(24)) / 1e6;
    const realSolReserves = Number(data.readBigUInt64LE(32)) / 1e9;
    
    if (virtualTokenReserves === 0 || virtualSolReserves === 0) {
      console.log(`  Pump.fun: Graduated (empty curve)`);
      return;
    }
    
    console.log(`  ✅ Found Pump.fun bonding curve`);
    console.log(`     Real reserves: ${realTokenReserves.toFixed(2)} tokens, ${realSolReserves.toFixed(4)} SOL`);
    
    const priceInSol = virtualSolReserves / virtualTokenReserves;
    
    // Store the pool
    insertPool.run(
      bondingCurve.toBase58(),
      'Pump.fun',
      tokenMint,
      SOL,
      realTokenReserves,
      realSolReserves,
      6,
      9,
      priceInSol,
      1 / priceInSol,
      null, // Need SOL price
      0.01,
      1
    );
    
    console.log(`     Price: ${priceInSol.toFixed(10)} SOL per token`);
    
  } catch (e) {
    // No bonding curve
  }
}

// Parse and store Raydium pool
async function parseAndStorePool(address, data, expectedToken) {
  try {
    // Parse Raydium V4 pool data
    const baseMint = new PublicKey(data.slice(400, 432)).toBase58();
    const quoteMint = new PublicKey(data.slice(432, 464)).toBase58();
    const baseReserve = Number(data.readBigUInt64LE(464));
    const quoteReserve = Number(data.readBigUInt64LE(472));
    
    // Check if this pool contains our token
    if (baseMint !== expectedToken && quoteMint !== expectedToken) {
      return;
    }
    
    const baseDecimals = baseMint === SOL ? 9 : 6;
    const quoteDecimals = quoteMint === SOL ? 9 : 6;
    
    const reserveA = baseReserve / Math.pow(10, baseDecimals);
    const reserveB = quoteReserve / Math.pow(10, quoteDecimals);
    
    if (reserveA === 0 || reserveB === 0) return;
    
    const priceAtoB = reserveB / reserveA;
    const priceBtoA = reserveA / reserveB;
    
    let liquidityUSD = null;
    if (quoteMint === USDC || quoteMint === USDT) {
      liquidityUSD = reserveB * 2;
    }
    
    insertPool.run(
      address,
      'Raydium',
      baseMint,
      quoteMint,
      reserveA,
      reserveB,
      baseDecimals,
      quoteDecimals,
      priceAtoB,
      priceBtoA,
      liquidityUSD,
      0.0025,
      1
    );
    
    console.log(`     Indexed pool: ${baseMint.slice(0, 8)}... / ${quoteMint.slice(0, 8)}...`);
    
  } catch (e) {
    // Parse error
  }
}

// Index common pairs (USDC, SOL, etc.)
async function indexCommonPairs() {
  console.log('\n==========================================');
  console.log('  INDEXING COMMON PAIRS');
  console.log('==========================================');
  
  const commonTokens = [
    { mint: USDC, name: 'USDC' },
    { mint: SOL, name: 'SOL' },
  ];
  
  for (const token of commonTokens) {
    console.log(`\n[${token.name}] Indexing...`);
    await findPoolsForToken(token.mint);
  }
}

// Index specific token
async function indexToken(tokenMint, tokenName = 'Token') {
  console.log('\n==========================================');
  console.log(`  INDEXING ${tokenName}`);
  console.log('==========================================');
  
  await findPoolsForToken(tokenMint);
}

// Main indexer
async function runIndexer(targetTokens = []) {
  console.log('\n==========================================');
  console.log('  SMART POOL INDEXER');
  console.log('==========================================');
  console.log(`  RPC: ${RPC_URL}`);
  console.log('==========================================\n');
  
  const startTime = Date.now();
  
  try {
    // Index common pairs first (for SOL price)
    await indexCommonPairs();
    
    // Index target tokens
    for (const token of targetTokens) {
      await indexToken(token.mint, token.name);
    }
    
    // Update SOL prices
    const solPrice = getSOLPrice();
    if (solPrice > 0) {
      console.log(`\n[SOL Price] $${solPrice.toFixed(2)}`);
      updateSOLPrices(solPrice);
    }
    
    // Stats
    const stats = db.prepare('SELECT COUNT(*) as count FROM liquidity_pools WHERE is_active = 1').get();
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n==========================================');
    console.log('  INDEXING COMPLETE');
    console.log('==========================================');
    console.log(`  Total Pools: ${stats.count}`);
    console.log(`  Time: ${elapsed}s`);
    console.log('==========================================\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Get SOL price
function getSOLPrice() {
  try {
    const pool = db.prepare(`
      SELECT * FROM liquidity_pools
      WHERE (token_a = ? AND (token_b = ? OR token_b = ?))
         OR (token_b = ? AND (token_a = ? OR token_a = ?))
      ORDER BY liquidity_usd DESC
      LIMIT 1
    `).get(SOL, USDC, USDT, SOL, USDC, USDT);
    
    if (!pool) return 0;
    
    if (pool.token_a === SOL) {
      return pool.price_a_to_b;
    } else {
      return pool.price_b_to_a;
    }
  } catch (e) {
    return 0;
  }
}

// Update SOL-denominated pools
function updateSOLPrices(solPrice) {
  const pools = db.prepare('SELECT * FROM liquidity_pools WHERE token_a = ? OR token_b = ?').all(SOL, SOL);
  
  for (const pool of pools) {
    let liquidityUSD = pool.liquidity_usd;
    
    if (pool.token_b === SOL && !liquidityUSD) {
      liquidityUSD = pool.reserve_b * solPrice * 2;
    } else if (pool.token_a === SOL && !liquidityUSD) {
      liquidityUSD = pool.reserve_a * solPrice * 2;
    }
    
    if (liquidityUSD) {
      db.prepare('UPDATE liquidity_pools SET liquidity_usd = ? WHERE address = ?').run(liquidityUSD, pool.address);
    }
  }
}

// Run if called directly
if (require.main === module) {
  // Index user's token
  const WHISTL = '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump';
  
  runIndexer([
    { mint: WHISTL, name: 'WHISTL' },
  ])
    .then(() => {
      db.close();
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      db.close();
      process.exit(1);
    });
}

module.exports = { runIndexer, indexToken };

