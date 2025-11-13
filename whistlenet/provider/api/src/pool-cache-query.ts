// Query cached pool data from database (FAST!)
// This is how professional services work - no real-time blockchain queries
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../data/whistle-mainnet.db');
const db = new Database(dbPath);

const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const SOL = 'So11111111111111111111111111111111111111112';

interface PoolData {
  address: string;
  dex: string;
  tokenA: string;
  tokenB: string;
  reserveA: number;
  reserveB: number;
  priceAtoB: number;
  priceBtoA: number;
  liquidityUSD: number | null;
}

// Get token price from cached pools (INSTANT)
export function getTokenPriceFromPools(mintAddress: string): {
  price: number | null;
  liquidity: number | null;
  pools: PoolData[];
} {
  try {
    // Query all pools containing this token
    const pools = db.prepare(`
      SELECT 
        address,
        dex,
        token_a,
        token_b,
        reserve_a,
        reserve_b,
        decimals_a,
        decimals_b,
        price_a_to_b,
        price_b_to_a,
        liquidity_usd
      FROM liquidity_pools
      WHERE (token_a = ? OR token_b = ?)
        AND is_active = 1
        AND (token_a IN (?, ?, ?) OR token_b IN (?, ?, ?))
      ORDER BY liquidity_usd DESC NULLS LAST
      LIMIT 10
    `).all(
      mintAddress, mintAddress,
      USDC, USDT, SOL,
      USDC, USDT, SOL
    ) as any[];
    
    if (pools.length === 0) {
      return { price: null, liquidity: null, pools: [] };
    }
    
    // Convert to standard format
    const poolData: PoolData[] = pools.map(p => ({
      address: p.address,
      dex: p.dex,
      tokenA: p.token_a,
      tokenB: p.token_b,
      reserveA: p.reserve_a,
      reserveB: p.reserve_b,
      priceAtoB: p.price_a_to_b,
      priceBtoA: p.price_b_to_a,
      liquidityUSD: p.liquidity_usd,
    }));
    
    // Calculate price from best pool (highest liquidity)
    const bestPool = poolData[0];
    let price: number;
    
    if (bestPool.tokenA === mintAddress) {
      price = bestPool.priceAtoB;
    } else {
      price = bestPool.priceBtoA;
    }
    
    // Total liquidity across all pools
    const totalLiquidity = poolData.reduce((sum, p) => sum + (p.liquidityUSD || 0), 0);
    
    return {
      price,
      liquidity: totalLiquidity > 0 ? totalLiquidity : null,
      pools: poolData,
    };
    
  } catch (error) {
    console.error('[Pool Cache] Error querying pools:', error);
    return { price: null, liquidity: null, pools: [] };
  }
}

// Get market cap from price + supply
export function calculateMarketCap(
  price: number | null,
  supply: string,
  decimals: number
): number | null {
  if (!price || !supply) return null;
  
  const supplyNumber = parseFloat(supply) / Math.pow(10, decimals);
  return supplyNumber * price;
}

// Get pool statistics
export function getPoolStats(): {
  totalPools: number;
  activePools: number;
  totalLiquidityUSD: number;
  lastUpdated: string | null;
} {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_pools,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_pools,
        SUM(CASE WHEN is_active = 1 THEN liquidity_usd ELSE 0 END) as total_liquidity,
        MAX(last_updated) as last_updated
      FROM liquidity_pools
    `).get() as any;
    
    return {
      totalPools: stats.total_pools || 0,
      activePools: stats.active_pools || 0,
      totalLiquidityUSD: stats.total_liquidity || 0,
      lastUpdated: stats.last_updated,
    };
  } catch (error) {
    return {
      totalPools: 0,
      activePools: 0,
      totalLiquidityUSD: 0,
      lastUpdated: null,
    };
  }
}

