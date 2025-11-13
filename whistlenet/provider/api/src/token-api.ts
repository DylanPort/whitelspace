// Token Analytics API - Full DeFi Suite
import express from 'express';
import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';

const router = express.Router();

// Solana connection
const MAINNET_RPC = process.env.MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(MAINNET_RPC, 'confirmed');

// External APIs for enhanced data
const JUPITER_API = 'https://price.jup.ag/v4';
const JUPITER_TOKENS = 'https://token.jup.ag/all';
const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex';
const BIRDEYE_API = 'https://public-api.birdeye.so';

// In-memory cache (would use Redis in production)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

function getCache(key: string): any | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// GET /tokens/{tokenAddress}
// Get complete token information
router.get('/tokens/:tokenAddress', async (req, res) => {
  const { tokenAddress } = req.params;
  
  try {
    const cached = getCache(`token_${tokenAddress}`);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }
    
    const pubkey = new PublicKey(tokenAddress);
    
    // Get on-chain token data
    const accountInfo = await connection.getParsedAccountInfo(pubkey);
    
    if (!accountInfo.value) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    let tokenData: any = {};
    
    if ('parsed' in accountInfo.value.data) {
      const parsed = accountInfo.value.data.parsed;
      if (parsed.type === 'mint') {
        tokenData = {
          address: tokenAddress,
          decimals: parsed.info.decimals,
          supply: parsed.info.supply,
          mintAuthority: parsed.info.mintAuthority,
          freezeAuthority: parsed.info.freezeAuthority,
          isInitialized: parsed.info.isInitialized,
        };
      }
    }
    
    // Try to get price from Jupiter
    try {
      const priceResponse = await axios.get(`${JUPITER_API}/price?ids=${tokenAddress}`);
      if (priceResponse.data.data && priceResponse.data.data[tokenAddress]) {
        tokenData.price = priceResponse.data.data[tokenAddress].price;
      }
    } catch (e) {
      // Price not available
    }
    
    // Get token accounts (holders)
    try {
      const supply = await connection.getTokenSupply(pubkey);
      tokenData.supplyUI = supply.value.uiAmountString;
    } catch (e) {
      // Ignore
    }
    
    const response = {
      success: true,
      token: tokenData,
      network: 'mainnet-beta',
      timestamp: new Date().toISOString(),
    };
    
    setCache(`token_${tokenAddress}`, response);
    res.json(response);
    
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /tokens/by-pool/{poolAddress}
// Get tokens in a liquidity pool
router.get('/tokens/by-pool/:poolAddress', async (req, res) => {
  const { poolAddress } = req.params;
  
  try {
    const pubkey = new PublicKey(poolAddress);
    const accountInfo = await connection.getParsedAccountInfo(pubkey);
    
    if (!accountInfo.value) {
      return res.status(404).json({ error: 'Pool not found' });
    }
    
    // Parse pool data (Raydium, Orca, etc.)
    // This would need specific parsing for each DEX
    
    res.json({
      success: true,
      pool: poolAddress,
      tokens: [], // Would parse from pool data
      note: 'Pool parsing requires DEX-specific logic',
    });
    
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /tokens/multi
// Get multiple tokens at once
router.post('/tokens/multi', async (req, res) => {
  const { addresses } = req.body;
  
  if (!addresses || !Array.isArray(addresses)) {
    return res.status(400).json({ error: 'addresses array required' });
  }
  
  try {
    const tokens = await Promise.all(
      addresses.map(async (addr: string) => {
        try {
          const pubkey = new PublicKey(addr);
          const accountInfo = await connection.getParsedAccountInfo(pubkey);
          
          if (!accountInfo.value || !('parsed' in accountInfo.value.data)) {
            return null;
          }
          
          const parsed = accountInfo.value.data.parsed;
          if (parsed.type === 'mint') {
            return {
              address: addr,
              decimals: parsed.info.decimals,
              supply: parsed.info.supply,
            };
          }
          return null;
        } catch (e) {
          return null;
        }
      })
    );
    
    res.json({
      success: true,
      count: tokens.filter(t => t !== null).length,
      tokens: tokens.filter(t => t !== null),
    });
    
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /tokens/{tokenAddress}/ath
// Get all-time high for token
router.get('/tokens/:tokenAddress/ath', async (req, res) => {
  const { tokenAddress } = req.params;
  
  try {
    // This would require historical price data
    // Could integrate with Birdeye, DexScreener, or store our own
    
    res.json({
      success: true,
      token: tokenAddress,
      ath: {
        price: null,
        timestamp: null,
        note: 'ATH tracking requires historical price database',
      },
    });
    
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /deployer/{wallet}
// Get all tokens deployed by a wallet
router.get('/deployer/:wallet', async (req, res) => {
  const { wallet } = req.params;
  
  try {
    const pubkey = new PublicKey(wallet);
    
    // Get token accounts owned by this wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      pubkey,
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    );
    
    // Filter for tokens where this wallet is mint authority
    const deployedTokens: any[] = [];
    
    for (const account of tokenAccounts.value) {
      const mint = account.account.data.parsed.info.mint;
      try {
        const mintInfo = await connection.getParsedAccountInfo(new PublicKey(mint));
        if (mintInfo.value && 'parsed' in mintInfo.value.data) {
          const parsed = mintInfo.value.data.parsed;
          if (parsed.info.mintAuthority === wallet) {
            deployedTokens.push({
              mint: mint,
              decimals: parsed.info.decimals,
              supply: parsed.info.supply,
            });
          }
        }
      } catch (e) {
        // Skip
      }
    }
    
    res.json({
      success: true,
      deployer: wallet,
      count: deployedTokens.length,
      tokens: deployedTokens,
    });
    
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /tokens/latest
// Get latest deployed tokens
router.get('/tokens/latest', async (req, res) => {
  const { limit = '20' } = req.query;
  
  try {
    const cached = getCache('tokens_latest');
    if (cached) {
      return res.json({ ...cached, cached: true });
    }
    
    // This would require indexing new token creations
    // For now, return sample structure
    
    const response = {
      success: true,
      count: 0,
      tokens: [],
      note: 'Requires blockchain indexing for real-time token creation tracking',
      suggestion: 'Index Token Program "InitializeMint" instructions',
    };
    
    setCache('tokens_latest', response);
    res.json(response);
    
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /tokens/trending
// Get trending tokens (24h default)
router.get('/tokens/trending/:timeframe?', async (req, res) => {
  const { timeframe = '24h' } = req.params;
  
  try {
    const cached = getCache(`tokens_trending_${timeframe}`);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }
    
    // This requires volume/transaction tracking
    // Could integrate with Jupiter, Birdeye, or DexScreener
    
    const response = {
      success: true,
      timeframe: timeframe,
      count: 0,
      tokens: [],
      note: 'Requires DEX aggregation or integration with price APIs',
      suggestion: 'Integrate Jupiter aggregator or Birdeye API',
    };
    
    setCache(`tokens_trending_${timeframe}`, response);
    res.json(response);
    
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /tokens/volume
// Get tokens by volume
router.get('/tokens/volume/:timeframe?', async (req, res) => {
  const { timeframe = '24h' } = req.params;
  
  try {
    const cached = getCache(`tokens_volume_${timeframe}`);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }
    
    const response = {
      success: true,
      timeframe: timeframe,
      count: 0,
      tokens: [],
      note: 'Requires DEX swap indexing',
      suggestion: 'Index Raydium, Orca, Jupiter swaps',
    };
    
    setCache(`tokens_volume_${timeframe}`, response);
    res.json(response);
    
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /tokens/multi/all
// Get all tokens (paginated)
router.get('/tokens/multi/all', async (req, res) => {
  const { page = '1', limit = '100' } = req.query;
  
  try {
    res.json({
      success: true,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total: 0,
      tokens: [],
      note: 'Requires comprehensive token registry',
      suggestion: 'Build token registry from on-chain data',
    });
    
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /tokens/multi/graduated
// Get graduated tokens (e.g., from pump.fun to Raydium)
router.get('/tokens/multi/graduated', async (req, res) => {
  try {
    res.json({
      success: true,
      count: 0,
      tokens: [],
      note: 'Tracks tokens that graduated from bonding curves to real pools',
      suggestion: 'Monitor pump.fun -> Raydium migrations',
    });
    
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /search
// Search tokens by name, symbol, or address
router.get('/search', async (req, res) => {
  const { q, type = 'all', limit = '20' } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'q parameter required' });
  }
  
  try {
    const query = (q as string).toLowerCase();
    
    // Try as address first
    try {
      const pubkey = new PublicKey(q as string);
      const accountInfo = await connection.getParsedAccountInfo(pubkey);
      
      if (accountInfo.value && 'parsed' in accountInfo.value.data) {
        const parsed = accountInfo.value.data.parsed;
        if (parsed.type === 'mint') {
          return res.json({
            success: true,
            results: [{
              type: 'token',
              address: q,
              decimals: parsed.info.decimals,
              supply: parsed.info.supply,
            }],
            count: 1,
          });
        }
      }
    } catch (e) {
      // Not a valid address, continue with text search
    }
    
    // Text search would require token metadata index
    res.json({
      success: true,
      query: q,
      results: [],
      count: 0,
      note: 'Requires token metadata index (names, symbols)',
      suggestion: 'Index Metaplex token metadata accounts',
    });
    
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

