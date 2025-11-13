// DEX Liquidity Pool Parser - Read pool state directly from blockchain
// This is how Birdeye, DexScreener, etc. get real price/liquidity data
import { Connection, PublicKey } from '@solana/web3.js';

const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const SOL = 'So11111111111111111111111111111111111111112';

// DEX program IDs
const DEX_PROGRAMS = {
  RAYDIUM_V4: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  RAYDIUM_CLMM: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
  ORCA_WHIRLPOOL: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  PUMP_FUN: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  METEORA: 'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB',
};

interface PoolData {
  dex: string;
  poolAddress: string;
  tokenA: string;
  tokenB: string;
  reserveA: number;
  reserveB: number;
  price: number;
  liquidity: number;
}

// Parse Raydium V4 pool state
function parseRaydiumV4Pool(data: Buffer, tokenMint: string): PoolData | null {
  try {
    // Raydium V4 pool layout (simplified)
    // See: https://github.com/raydium-io/raydium-sdk
    
    // Status at offset 0 (8 bytes)
    const status = data.readBigUInt64LE(0);
    if (status === 0n) return null; // Not initialized
    
    // Base mint at offset 8 + some bytes
    const baseMintStart = 400; // Approximate offset
    const quoteMintStart = 432;
    
    // Try to read mints (32 bytes each)
    const baseMint = new PublicKey(data.slice(baseMintStart, baseMintStart + 32)).toBase58();
    const quoteMint = new PublicKey(data.slice(quoteMintStart, quoteMintStart + 32)).toBase58();
    
    // Base/quote reserves
    const baseReserve = Number(data.readBigUInt64LE(464)) / 1e9; // Adjust for decimals
    const quoteReserve = Number(data.readBigUInt64LE(472)) / 1e6; // USDC/USDT have 6 decimals
    
    // Check if this pool has our token
    let price = 0;
    if (baseMint === tokenMint && (quoteMint === USDC || quoteMint === USDT)) {
      price = quoteReserve / baseReserve;
    } else if (quoteMint === tokenMint && (baseMint === USDC || baseMint === USDT)) {
      price = baseReserve / quoteReserve;
    } else {
      return null; // Not a stablecoin pair
    }
    
    return {
      dex: 'Raydium',
      poolAddress: '',
      tokenA: baseMint,
      tokenB: quoteMint,
      reserveA: baseReserve,
      reserveB: quoteReserve,
      price: price,
      liquidity: quoteReserve * 2, // Rough estimate
    };
  } catch (e) {
    return null;
  }
}

// Parse Pump.fun bonding curve (most new tokens launch here)
function parsePumpFunBondingCurve(data: Buffer, tokenMint: string): PoolData | null {
  try {
    // Pump.fun bonding curve layout
    // virtualTokenReserves and virtualSolReserves determine price
    
    // Read discriminator (8 bytes)
    const discriminator = data.readBigUInt64LE(0);
    
    // Virtual reserves (approximate offsets)
    const virtualTokenReserves = Number(data.readBigUInt64LE(8)) / 1e6;
    const virtualSolReserves = Number(data.readBigUInt64LE(16)) / 1e9;
    const realTokenReserves = Number(data.readBigUInt64LE(24)) / 1e6;
    const realSolReserves = Number(data.readBigUInt64LE(32)) / 1e9;
    
    if (virtualTokenReserves === 0 || virtualSolReserves === 0) {
      return null;
    }
    
    // Price in SOL
    const priceInSol = virtualSolReserves / virtualTokenReserves;
    
    // TODO: Need SOL price to convert to USD
    // For now, return null unless we have SOL price
    
    return {
      dex: 'Pump.fun',
      poolAddress: '',
      tokenA: tokenMint,
      tokenB: SOL,
      reserveA: realTokenReserves,
      reserveB: realSolReserves,
      price: priceInSol,
      liquidity: realSolReserves * 2, // In SOL terms
    };
  } catch (e) {
    return null;
  }
}

// Find all liquidity pools for a token
export async function findTokenPools(
  connection: Connection,
  tokenMint: string
): Promise<PoolData[]> {
  const pools: PoolData[] = [];
  
  try {
    // 1. Search Raydium V4 pools
    const raydiumProgram = new PublicKey(DEX_PROGRAMS.RAYDIUM_V4);
    
    // Get all Raydium pools (this is expensive, in production you'd use a pool cache)
    const raydiumAccounts = await connection.getProgramAccounts(raydiumProgram, {
      filters: [
        { dataSize: 752 }, // Raydium V4 pool size
      ],
    });
    
    console.log(`Found ${raydiumAccounts.length} Raydium pools to check`);
    
    for (const account of raydiumAccounts.slice(0, 100)) { // Limit to avoid timeouts
      const poolData = parseRaydiumV4Pool(account.account.data, tokenMint);
      if (poolData) {
        poolData.poolAddress = account.pubkey.toBase58();
        pools.push(poolData);
      }
    }
    
    // 2. Search Pump.fun bonding curves
    const pumpFunProgram = new PublicKey(DEX_PROGRAMS.PUMP_FUN);
    
    // Derive bonding curve PDA for token
    try {
      const [bondingCurvePDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bonding-curve'),
          new PublicKey(tokenMint).toBuffer(),
        ],
        pumpFunProgram
      );
      
      const bondingCurveAccount = await connection.getAccountInfo(bondingCurvePDA);
      if (bondingCurveAccount) {
        const curveData = parsePumpFunBondingCurve(bondingCurveAccount.data, tokenMint);
        if (curveData) {
          curveData.poolAddress = bondingCurvePDA.toBase58();
          pools.push(curveData);
        }
      }
    } catch (e) {
      // Bonding curve doesn't exist
    }
    
    console.log(`Found ${pools.length} pools for token`);
    
  } catch (error) {
    console.error('Error finding pools:', error);
  }
  
  return pools;
}

// Get SOL price from SOL/USDC pools
async function getSOLPrice(connection: Connection): Promise<number> {
  try {
    // Raydium SOL/USDC pool (well-known address)
    const SOL_USDC_POOL = '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2';
    
    const poolAccount = await connection.getAccountInfo(new PublicKey(SOL_USDC_POOL));
    if (!poolAccount) return 0;
    
    const poolData = parseRaydiumV4Pool(poolAccount.data, SOL);
    if (poolData) {
      return poolData.price;
    }
    
    return 0;
  } catch (e) {
    return 0;
  }
}

// Calculate token metrics from pool data
export async function calculateTokenMetrics(
  connection: Connection,
  tokenMint: string,
  supply: string,
  decimals: number
): Promise<{
  price: number | null;
  marketCap: number | null;
  liquidity: number | null;
  priceChange24h: number | null;
  volume24h: number | null;
  pools: PoolData[];
}> {
  try {
    // Find all pools for this token
    const pools = await findTokenPools(connection, tokenMint);
    
    if (pools.length === 0) {
      return {
        price: null,
        marketCap: null,
        liquidity: null,
        priceChange24h: null,
        volume24h: null,
        pools: [],
      };
    }
    
    // Get SOL price if we have SOL pairs
    const solPrice = await getSOLPrice(connection);
    
    // Convert SOL prices to USD
    for (const pool of pools) {
      if (pool.tokenB === SOL && solPrice > 0) {
        pool.price = pool.price * solPrice;
        pool.liquidity = pool.liquidity * solPrice;
      }
    }
    
    // Use the pool with highest liquidity for price
    const bestPool = pools.reduce((best, current) => 
      current.liquidity > best.liquidity ? current : best
    );
    
    const price = bestPool.price;
    
    // Calculate market cap
    const supplyNumber = parseFloat(supply) / Math.pow(10, decimals);
    const marketCap = supplyNumber * price;
    
    // Total liquidity across all pools
    const totalLiquidity = pools.reduce((sum, pool) => sum + pool.liquidity, 0);
    
    return {
      price: price,
      marketCap: marketCap,
      liquidity: totalLiquidity,
      priceChange24h: null, // TODO: Need historical data
      volume24h: null, // TODO: Parse swap events
      pools: pools,
    };
    
  } catch (error) {
    console.error('Error calculating metrics:', error);
    return {
      price: null,
      marketCap: null,
      liquidity: null,
      priceChange24h: null,
      volume24h: null,
      pools: [],
    };
  }
}

