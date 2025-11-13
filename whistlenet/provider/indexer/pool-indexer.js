// Pool Indexer - Scans and indexes DEX liquidity pools
// This is how professional services (Birdeye, DexScreener) work
const { Connection, PublicKey } = require('@solana/web3.js');
const Database = require('better-sqlite3');

const RPC_URL = process.env.MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');
const db = new Database('../data/whistle-mainnet.db');

// Known addresses
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const SOL = 'So11111111111111111111111111111111111111112';

// DEX Programs
const RAYDIUM_V4 = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
const PUMP_FUN = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

// Database statements
const insertPool = db.prepare(`
  INSERT OR REPLACE INTO liquidity_pools (
    address, dex, token_a, token_b, reserve_a, reserve_b,
    decimals_a, decimals_b, price_a_to_b, price_b_to_a,
    liquidity_usd, fee_rate, is_active, last_updated
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`);

// Parse Raydium V4 pool
function parseRaydiumV4Pool(address, data) {
  try {
    // Raydium V4 AMM layout (simplified based on common offsets)
    // Full spec: https://github.com/raydium-io/raydium-sdk
    
    // Status (8 bytes at offset 0)
    const status = Number(data.readBigUInt64LE(0));
    if (status === 0) return null; // Not initialized
    
    // Try to parse mints and reserves
    // These offsets are approximations - may need adjustment
    let baseMintBytes, quoteMintBytes, baseReserve, quoteReserve;
    
    try {
      // Common Raydium V4 offsets
      baseMintBytes = data.slice(400, 432);
      quoteMintBytes = data.slice(432, 464);
      baseReserve = Number(data.readBigUInt64LE(464));
      quoteReserve = Number(data.readBigUInt64LE(472));
    } catch (e) {
      return null;
    }
    
    const baseMint = new PublicKey(baseMintBytes).toBase58();
    const quoteMint = new PublicKey(quoteMintBytes).toBase58();
    
    // Only index pools with USDC/USDT/SOL
    const isValidPair = 
      baseMint === USDC || baseMint === USDT || baseMint === SOL ||
      quoteMint === USDC || quoteMint === USDT || quoteMint === SOL;
    
    if (!isValidPair) return null;
    
    // Assume common decimals (adjust if needed)
    const baseDecimals = baseMint === SOL ? 9 : baseMint === USDC || baseMint === USDT ? 6 : 9;
    const quoteDecimals = quoteMint === SOL ? 9 : quoteMint === USDC || quoteMint === USDT ? 6 : 9;
    
    const reserveA = baseReserve / Math.pow(10, baseDecimals);
    const reserveB = quoteReserve / Math.pow(10, quoteDecimals);
    
    if (reserveA === 0 || reserveB === 0) return null;
    
    const priceAtoB = reserveB / reserveA;
    const priceBtoA = reserveA / reserveB;
    
    // Estimate liquidity in USD
    let liquidityUSD = null;
    if (quoteMint === USDC || quoteMint === USDT) {
      liquidityUSD = reserveB * 2; // Rough estimate
    } else if (baseMint === USDC || baseMint === USDT) {
      liquidityUSD = reserveA * 2;
    }
    
    return {
      address: address.toBase58(),
      dex: 'Raydium',
      tokenA: baseMint,
      tokenB: quoteMint,
      reserveA,
      reserveB,
      decimalsA: baseDecimals,
      decimalsB: quoteDecimals,
      priceAtoB,
      priceBtoA,
      liquidityUSD,
      feeRate: 0.0025, // 0.25% for Raydium V4
      isActive: true,
    };
  } catch (e) {
    return null;
  }
}

// Parse Pump.fun bonding curve
async function parsePumpFunCurve(address, data) {
  try {
    // Bonding curve layout
    const virtualTokenReserves = Number(data.readBigUInt64LE(8));
    const virtualSolReserves = Number(data.readBigUInt64LE(16));
    const realTokenReserves = Number(data.readBigUInt64LE(24));
    const realSolReserves = Number(data.readBigUInt64LE(32));
    
    if (virtualTokenReserves === 0 || virtualSolReserves === 0) {
      return null; // Graduated or inactive
    }
    
    const reserveA = realTokenReserves / 1e6;
    const reserveB = realSolReserves / 1e9;
    
    if (reserveA === 0 || reserveB === 0) return null;
    
    const priceAtoB = virtualSolReserves / virtualTokenReserves * 1e3; // Token to SOL
    const priceBtoA = virtualTokenReserves / virtualSolReserves / 1e3; // SOL to Token
    
    // Extract token mint from curve PDA
    // The mint is part of the seeds used to derive the PDA
    // For now, we'll need to track this separately
    
    return {
      address: address.toBase58(),
      dex: 'Pump.fun',
      tokenA: 'UNKNOWN', // Need to derive from PDA
      tokenB: SOL,
      reserveA,
      reserveB,
      decimalsA: 6,
      decimalsB: 9,
      priceAtoB,
      priceBtoA,
      liquidityUSD: null, // Need SOL price
      feeRate: 0.01, // 1% for Pump.fun
      isActive: true,
    };
  } catch (e) {
    return null;
  }
}

// Scan Raydium V4 pools
async function scanRaydiumPools() {
  console.log('[Raydium] Scanning pools...');
  
  try {
    const program = new PublicKey(RAYDIUM_V4);
    
    // Get all Raydium V4 pool accounts
    console.log('[Raydium] Fetching program accounts...');
    const accounts = await connection.getProgramAccounts(program, {
      filters: [
        { dataSize: 752 }, // Raydium V4 pool size
      ],
    });
    
    console.log(`[Raydium] Found ${accounts.length} pool accounts`);
    
    let indexed = 0;
    let skipped = 0;
    
    for (const account of accounts) {
      const pool = parseRaydiumV4Pool(account.pubkey, account.account.data);
      
      if (pool) {
        try {
          insertPool.run(
            pool.address,
            pool.dex,
            pool.tokenA,
            pool.tokenB,
            pool.reserveA,
            pool.reserveB,
            pool.decimalsA,
            pool.decimalsB,
            pool.priceAtoB,
            pool.priceBtoA,
            pool.liquidityUSD,
            pool.feeRate,
            pool.isActive ? 1 : 0
          );
          indexed++;
          
          if (indexed % 100 === 0) {
            console.log(`[Raydium] Indexed ${indexed} pools...`);
          }
        } catch (e) {
          // Skip on error
        }
      } else {
        skipped++;
      }
    }
    
    console.log(`[Raydium] ✅ Indexed ${indexed} pools (skipped ${skipped})`);
    return indexed;
    
  } catch (error) {
    console.error('[Raydium] Error:', error.message);
    return 0;
  }
}

// Get SOL/USD price from Raydium
async function getSOLPrice() {
  try {
    const pool = db.prepare(`
      SELECT * FROM liquidity_pools
      WHERE (token_a = ? AND token_b = ?)
         OR (token_a = ? AND token_b = ?)
      ORDER BY liquidity_usd DESC
      LIMIT 1
    `).get(SOL, USDC, USDC, SOL);
    
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

// Update SOL-denominated pools with USD values
function updateSOLPoolsWithUSD() {
  console.log('[SOL Price] Updating SOL-denominated pools...');
  
  const solPrice = getSOLPrice();
  
  if (solPrice === 0) {
    console.log('[SOL Price] ⚠️  No SOL price available');
    return;
  }
  
  console.log(`[SOL Price] SOL = $${solPrice.toFixed(2)}`);
  
  // Update all pools with SOL
  const pools = db.prepare(`
    SELECT * FROM liquidity_pools
    WHERE token_a = ? OR token_b = ?
  `).all(SOL, SOL);
  
  for (const pool of pools) {
    let liquidityUSD = pool.liquidity_usd;
    
    if (pool.token_b === SOL && !liquidityUSD) {
      liquidityUSD = pool.reserve_b * solPrice * 2;
    } else if (pool.token_a === SOL && !liquidityUSD) {
      liquidityUSD = pool.reserve_a * solPrice * 2;
    }
    
    if (liquidityUSD) {
      db.prepare(`
        UPDATE liquidity_pools
        SET liquidity_usd = ?
        WHERE address = ?
      `).run(liquidityUSD, pool.address);
    }
  }
  
  console.log('[SOL Price] ✅ Updated SOL pool valuations');
}

// Main indexer function
async function indexPools() {
  console.log('\n==========================================');
  console.log('  POOL INDEXER - Starting Scan');
  console.log('==========================================\n');
  
  const startTime = Date.now();
  
  try {
    // Scan Raydium pools (includes SOL/USDC for price)
    const raydiumCount = await scanRaydiumPools();
    
    // Update SOL-denominated pools with USD values
    updateSOLPoolsWithUSD();
    
    // Get total pool count
    const totalPools = db.prepare('SELECT COUNT(*) as count FROM liquidity_pools WHERE is_active = 1').get().count;
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n==========================================');
    console.log('  INDEXING COMPLETE');
    console.log('==========================================');
    console.log(`  Total Active Pools: ${totalPools}`);
    console.log(`  Time Elapsed: ${elapsed}s`);
    console.log('==========================================\n');
    
    return totalPools;
    
  } catch (error) {
    console.error('\n❌ Indexing failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  console.log('Pool Indexer v1.0\n');
  console.log('RPC:', RPC_URL);
  console.log('Database:', '../data/whistle-mainnet.db\n');
  
  indexPools()
    .then(() => {
      console.log('✅ Done!');
      db.close();
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      db.close();
      process.exit(1);
    });
}

module.exports = { indexPools };

