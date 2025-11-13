// Optimized Pool Discovery - Using PDAs instead of scanning all pools
// This is MUCH faster and how professional services work
import { Connection, PublicKey } from '@solana/web3.js';

const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const SOL = 'So11111111111111111111111111111111111111112';

// Raydium AMM V4
const RAYDIUM_V4_PROGRAM = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';

// Pump.fun
const PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

interface PoolInfo {
  dex: string;
  address: string;
  tokenA: string;
  tokenB: string;
  reserveA: number;
  reserveB: number;
  price: number;
  liquidity: number;
}

// Parse Pump.fun bonding curve (most tokens launch here first)
async function getPumpFunPool(
  connection: Connection,
  tokenMint: string
): Promise<PoolInfo | null> {
  try {
    const mint = new PublicKey(tokenMint);
    const program = new PublicKey(PUMP_FUN_PROGRAM);
    
    // Derive bonding curve PDA
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from('bonding-curve'), mint.toBuffer()],
      program
    );
    
    // Check if it exists
    const account = await connection.getAccountInfo(bondingCurve);
    if (!account) return null;
    
    const data = account.data;
    
    // Parse bonding curve state
    // Layout (approximate):
    // - 8 bytes: discriminator
    // - 8 bytes: virtual token reserves
    // - 8 bytes: virtual sol reserves  
    // - 8 bytes: real token reserves
    // - 8 bytes: real sol reserves
    // - 8 bytes: token total supply
    // - 1 byte: complete
    
    const virtualTokenReserves = Number(data.readBigUInt64LE(8)) / 1e6;
    const virtualSolReserves = Number(data.readBigUInt64LE(16)) / 1e9;
    const realTokenReserves = Number(data.readBigUInt64LE(24)) / 1e6;
    const realSolReserves = Number(data.readBigUInt64LE(32)) / 1e9;
    
    if (virtualTokenReserves === 0 || virtualSolReserves === 0) {
      return null;
    }
    
    // Price formula: SOL per token
    const priceInSol = virtualSolReserves / virtualTokenReserves;
    
    return {
      dex: 'Pump.fun',
      address: bondingCurve.toBase58(),
      tokenA: tokenMint,
      tokenB: SOL,
      reserveA: realTokenReserves,
      reserveB: realSolReserves,
      price: priceInSol,
      liquidity: realSolReserves * 2, // TVL in SOL
    };
    
  } catch (e) {
    return null;
  }
}

// Get SOL/USDC price from Raydium
async function getSOLPrice(connection: Connection): Promise<number> {
  try {
    // Well-known Raydium SOL/USDC pool
    const SOL_USDC_POOL = '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2';
    
    const account = await connection.getAccountInfo(new PublicKey(SOL_USDC_POOL));
    if (!account) return 0;
    
    const data = account.data;
    
    // Parse pool state (simplified)
    // Raydium V4 layout is complex, using approximate offsets
    const baseReserve = Number(data.readBigUInt64LE(464)) / 1e9; // SOL decimals = 9
    const quoteReserve = Number(data.readBigUInt64LE(472)) / 1e6; // USDC decimals = 6
    
    if (baseReserve === 0) return 0;
    
    const solPrice = quoteReserve / baseReserve;
    return solPrice;
    
  } catch (e) {
    console.error('Error getting SOL price:', e);
    return 0;
  }
}

// Main function: Get token price + market cap from pools
export async function getTokenMetricsFromPools(
  connection: Connection,
  tokenMint: string,
  supply: string,
  decimals: number
): Promise<{
  price: number | null;
  marketCap: number | null;
  liquidity: number | null;
  pools: PoolInfo[];
}> {
  const pools: PoolInfo[] = [];
  
  try {
    console.log(`[Pool Discovery] Looking for pools for ${tokenMint}...`);
    
    // 1. Check Pump.fun first (most new tokens launch here)
    const pumpPool = await getPumpFunPool(connection, tokenMint);
    if (pumpPool) {
      console.log(`[Pool Discovery] Found Pump.fun bonding curve`);
      pools.push(pumpPool);
    }
    
    // 2. TODO: Check Raydium pools (need to enumerate base/quote pairs)
    // Would need to try:
    // - TOKEN/USDC
    // - TOKEN/USDT
    // - TOKEN/SOL
    // - TOKEN/WSOL
    
    // 3. TODO: Check Orca pools
    
    if (pools.length === 0) {
      console.log(`[Pool Discovery] No pools found for ${tokenMint}`);
      return {
        price: null,
        marketCap: null,
        liquidity: null,
        pools: [],
      };
    }
    
    // Get SOL price if we have SOL pairs
    const solPrice = await getSOLPrice(connection);
    console.log(`[SOL Price] $${solPrice}`);
    
    // Convert SOL prices to USD
    for (const pool of pools) {
      if (pool.tokenB === SOL && solPrice > 0) {
        pool.price = pool.price * solPrice; // Convert to USD
        pool.liquidity = pool.liquidity * solPrice; // Convert to USD
      }
    }
    
    // Use pool with highest liquidity for price
    const bestPool = pools.reduce((best, current) => 
      current.liquidity > best.liquidity ? current : best
    );
    
    const price = bestPool.price;
    const totalLiquidity = pools.reduce((sum, p) => sum + p.liquidity, 0);
    
    // Calculate market cap
    const supplyNumber = parseFloat(supply) / Math.pow(10, decimals);
    const marketCap = supplyNumber * price;
    
    console.log(`[Pool Discovery] Price: $${price}, Market Cap: $${marketCap}, Liquidity: $${totalLiquidity}`);
    
    return {
      price,
      marketCap,
      liquidity: totalLiquidity,
      pools,
    };
    
  } catch (error) {
    console.error('[Pool Discovery] Error:', error);
    return {
      price: null,
      marketCap: null,
      liquidity: null,
      pools: [],
    };
  }
}

