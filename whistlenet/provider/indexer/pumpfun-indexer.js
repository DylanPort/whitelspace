// Pump.fun + Known Raydium Pools Indexer
// Works with public RPC - no scanning needed!
const { Connection, PublicKey } = require('@solana/web3.js');
const Database = require('better-sqlite3');

const RPC_URL = process.env.MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');
const db = new Database('../data/whistle-mainnet.db');

const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOL = 'So11111111111111111111111111111111111111112';
const PUMP_FUN = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

const insertPool = db.prepare(`
  INSERT OR REPLACE INTO liquidity_pools (
    address, dex, token_a, token_b, reserve_a, reserve_b,
    decimals_a, decimals_b, price_a_to_b, price_b_to_a,
    liquidity_usd, fee_rate, is_active, last_updated
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`);

// Index well-known SOL/USDC pool for SOL price
async function indexSOLPrice() {
  console.log('\n[SOL/USDC] Indexing well-known pool...');
  
  try {
    // Raydium SOL/USDC pool (most liquid)
    const SOL_USDC_POOL = '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2';
    
    const account = await connection.getAccountInfo(new PublicKey(SOL_USDC_POOL));
    if (!account) {
      console.log('  ❌ Could not fetch SOL/USDC pool');
      return 0;
    }
    
    const data = account.data;
    
    // Parse Raydium V4 pool
    const baseReserve = Number(data.readBigUInt64LE(464)) / 1e9; // SOL
    const quoteReserve = Number(data.readBigUInt64LE(472)) / 1e6; // USDC
    
    if (baseReserve === 0 || quoteReserve === 0) {
      console.log('  ❌ Invalid reserves');
      return 0;
    }
    
    const solPrice = quoteReserve / baseReserve;
    
    insertPool.run(
      SOL_USDC_POOL,
      'Raydium',
      SOL,
      USDC,
      baseReserve,
      quoteReserve,
      9,
      6,
      solPrice,
      1 / solPrice,
      quoteReserve * 2,
      0.0025,
      1
    );
    
    console.log(`  ✅ SOL Price: $${solPrice.toFixed(2)}`);
    console.log(`  ✅ Liquidity: $${(quoteReserve * 2).toFixed(0)}`);
    
    return solPrice;
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return 0;
  }
}

// Index Pump.fun bonding curve for a token
async function indexPumpFunToken(tokenMint, tokenName = 'Token') {
  console.log(`\n[${tokenName}] Checking Pump.fun bonding curve...`);
  
  try {
    const mint = new PublicKey(tokenMint);
    const program = new PublicKey(PUMP_FUN);
    
    // Derive bonding curve PDA
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from('bonding-curve'), mint.toBuffer()],
      program
    );
    
    console.log(`  Curve address: ${bondingCurve.toBase58()}`);
    
    const account = await connection.getAccountInfo(bondingCurve);
    if (!account) {
      console.log('  ❌ Bonding curve does not exist');
      return false;
    }
    
    const data = account.data;
    
    // Parse bonding curve
    const virtualTokenReserves = Number(data.readBigUInt64LE(8));
    const virtualSolReserves = Number(data.readBigUInt64LE(16));
    const realTokenReserves = Number(data.readBigUInt64LE(24));
    const realSolReserves = Number(data.readBigUInt64LE(32));
    
    console.log(`  Virtual Token: ${virtualTokenReserves}`);
    console.log(`  Virtual SOL: ${virtualSolReserves}`);
    console.log(`  Real Token: ${realTokenReserves}`);
    console.log(`  Real SOL: ${realSolReserves}`);
    
    if (virtualTokenReserves === 0 || virtualSolReserves === 0) {
      console.log('  ⚠️  Graduated (bonding curve empty)');
      console.log('  → Token moved to Raydium');
      return false;
    }
    
    // Calculate reserves with decimals
    const reserveA = realTokenReserves / 1e6;
    const reserveB = realSolReserves / 1e9;
    
    // Price using virtual reserves (this is how Pump.fun calculates)
    const priceInSol = (virtualSolReserves / 1e9) / (virtualTokenReserves / 1e6);
    
    console.log(`  ✅ Active bonding curve!`);
    console.log(`  Reserves: ${reserveA.toFixed(2)} ${tokenName}, ${reserveB.toFixed(4)} SOL`);
    console.log(`  Price: ${priceInSol.toFixed(10)} SOL per token`);
    
    // Store in database
    insertPool.run(
      bondingCurve.toBase58(),
      'Pump.fun',
      tokenMint,
      SOL,
      reserveA,
      reserveB,
      6,
      9,
      priceInSol,
      1 / priceInSol,
      null, // Will update with SOL price
      0.01,
      1
    );
    
    return true;
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return false;
  }
}

// Update SOL-denominated pools with USD values
function updateSOLPrices(solPrice) {
  console.log(`\n[Prices] Updating with SOL = $${solPrice.toFixed(2)}...`);
  
  const pools = db.prepare(`
    SELECT * FROM liquidity_pools 
    WHERE token_b = ? AND liquidity_usd IS NULL
  `).all(SOL);
  
  console.log(`  Found ${pools.length} SOL-denominated pools`);
  
  for (const pool of pools) {
    const liquidityUSD = pool.reserve_b * solPrice * 2;
    
    db.prepare(`
      UPDATE liquidity_pools 
      SET liquidity_usd = ?
      WHERE address = ?
    `).run(liquidityUSD, pool.address);
    
    // Also update price in USD
    const priceUSD = pool.price_a_to_b * solPrice;
    console.log(`  ${pool.dex}: $${priceUSD.toExponential(4)} | Liquidity: $${liquidityUSD.toFixed(2)}`);
  }
}

// Main function
async function indexToken(tokenMint, tokenName = 'Token') {
  console.log('\n==========================================');
  console.log(`  INDEXING: ${tokenName}`);
  console.log('==========================================');
  console.log(`  Address: ${tokenMint}`);
  console.log('==========================================');
  
  const startTime = Date.now();
  
  try {
    // 1. Index SOL/USDC for price reference
    const solPrice = await indexSOLPrice();
    
    // 2. Check Pump.fun
    const hasPumpPool = await indexPumpFunToken(tokenMint, tokenName);
    
    // 3. Update SOL prices to USD
    if (solPrice > 0) {
      updateSOLPrices(solPrice);
    }
    
    // 4. Check if we found any pools
    const pools = db.prepare(`
      SELECT * FROM liquidity_pools
      WHERE (token_a = ? OR token_b = ?) AND is_active = 1
    `).all(tokenMint, tokenMint);
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n==========================================');
    console.log('  RESULT');
    console.log('==========================================');
    console.log(`  Pools Found: ${pools.length}`);
    console.log(`  Time: ${elapsed}s`);
    
    if (pools.length > 0) {
      console.log('\n  Pool Details:');
      for (const pool of pools) {
        console.log(`  - ${pool.dex}: ${pool.address}`);
        console.log(`    Price: ${pool.price_a_to_b.toExponential(6)}`);
        console.log(`    Liquidity: $${pool.liquidity_usd ? pool.liquidity_usd.toFixed(2) : 'N/A'}`);
      }
    } else {
      console.log('  ⚠️  No active pools found');
      console.log('  Token may have graduated to Raydium');
      console.log('  (Requires premium RPC to find Raydium pools)');
    }
    
    console.log('==========================================\n');
    
    return pools.length > 0;
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  const WHISTL = '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump';
  
  indexToken(WHISTL, 'WHISTL')
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

module.exports = { indexToken };

