// Token Analytics - Built from OUR blockchain data (not external APIs)
import express from 'express';
import { Connection, PublicKey } from '@solana/web3.js';
import Database from 'better-sqlite3';
import path from 'path';
import axios from 'axios';
import { getTokenPriceFromPools, calculateMarketCap } from './pool-cache-query';

const router = express.Router();

// Our database with indexed blockchain data
const dbPath = path.join(__dirname, '../../data/whistle-mainnet.db');
const db = new Database(dbPath);

// Solana connection for on-chain verification
const MAINNET_RPC = process.env.MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(MAINNET_RPC, 'confirmed');

// Metaplex Token Metadata Program
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// Known DEX program IDs (we index these)
const DEX_PROGRAMS = {
  RAYDIUM_V4: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  RAYDIUM_V3: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
  ORCA_V1: '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP',
  ORCA_V2: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  JUPITER_V6: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  PUMP_FUN: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
};

// Cache
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

// Helper: Get Metaplex Metadata PDA
function getMetadataPDA(mint: PublicKey): PublicKey {
  const [metadata] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );
  return metadata;
}

// Helper: Get holders count for a token
async function getHoldersCount(mintAddress: string): Promise<number> {
  try {
    const mint = new PublicKey(mintAddress);
    const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    
    // Get all token accounts for this mint
    const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
      filters: [
        { dataSize: 165 }, // Token account size
        { memcmp: { offset: 0, bytes: mint.toBase58() } }, // Filter by mint
      ],
    });
    
    // Count unique owners with non-zero balance
    const owners = new Set<string>();
    for (const account of accounts) {
      const accountData = account.account.data;
      // Amount is at bytes 64-72 (8 bytes, little endian)
      const amount = accountData.readBigUInt64LE(64);
      
      if (amount > 0n) {
        // Owner is at bytes 32-64 (32 bytes)
        const owner = new PublicKey(accountData.slice(32, 64)).toBase58();
        owners.add(owner);
      }
    }
    
    return owners.size;
  } catch (error) {
    return 0;
  }
}

// REMOVED: Using real-time blockchain price calculation instead

// Helper: Fetch full token metadata (name, symbol, image, description)
async function fetchTokenMetadata(mintAddress: string) {
  try {
    const mint = new PublicKey(mintAddress);
    const metadataPDA = getMetadataPDA(mint);
    
    // Fetch metadata account
    const accountInfo = await connection.getAccountInfo(metadataPDA);
    
    if (!accountInfo || !accountInfo.data) {
      return null;
    }
    
    // Parse Metaplex metadata (simplified parsing)
    const data = accountInfo.data;
    
    // Read name (starts at byte 65, max 32 bytes)
    const nameStart = 65;
    const nameEnd = nameStart + 32;
    const nameBytes = data.slice(nameStart, nameEnd);
    const name = Buffer.from(nameBytes).toString('utf8').replace(/\0/g, '').trim();
    
    // Read symbol (starts at byte 65 + 36, max 10 bytes)
    const symbolStart = 65 + 36;
    const symbolEnd = symbolStart + 10;
    const symbolBytes = data.slice(symbolStart, symbolEnd);
    const symbol = Buffer.from(symbolBytes).toString('utf8').replace(/\0/g, '').trim();
    
    // Read URI (starts at byte 65 + 50, max 200 bytes)
    const uriStart = 65 + 50;
    const uriEnd = uriStart + 200;
    const uriBytes = data.slice(uriStart, uriEnd);
    const uri = Buffer.from(uriBytes).toString('utf8').replace(/\0/g, '').trim();
    
    // Fetch off-chain metadata from URI
    let offChainMetadata = null;
    if (uri && uri.startsWith('http')) {
      try {
        const response = await axios.get(uri, { timeout: 3000 });
        offChainMetadata = response.data;
      } catch (e) {
        // URI fetch failed, continue without it
      }
    }
    
    return {
      name: name || null,
      symbol: symbol || null,
      uri: uri || null,
      image: offChainMetadata?.image || null,
      description: offChainMetadata?.description || null,
      externalUrl: offChainMetadata?.external_url || null,
      attributes: offChainMetadata?.attributes || null,
    };
  } catch (error) {
    return null;
  }
}

// Helper: Fetch complete token info (metadata + holders + price + market cap)
// Uses CACHED pool data from our indexer (FAST! <100ms response)
async function fetchCompleteTokenInfo(mintAddress: string, supply: string, decimals: number) {
  // Fetch metadata and holders in parallel
  const [metadata, holders] = await Promise.all([
    fetchTokenMetadata(mintAddress),
    getHoldersCount(mintAddress),
  ]);
  
  // Get price/liquidity from CACHED pool data (no blockchain queries!)
  const poolData = getTokenPriceFromPools(mintAddress);
  const marketCap = calculateMarketCap(poolData.price, supply, decimals);
  
  return {
    ...metadata,
    holders: holders || 0,
    price: poolData.price,
    marketCap: marketCap,
    liquidity: poolData.liquidity,
    pools: poolData.pools.map(p => ({
      dex: p.dex,
      address: p.address,
      liquidity: p.liquidityUSD,
    })),
  };
}

// GET /tokens/{tokenAddress}
// Get token info from OUR indexed data
router.get('/tokens/:tokenAddress', async (req, res) => {
  const { tokenAddress } = req.params;
  
  try {
    // Check our database first
    const tokenData = db.prepare(`
      SELECT * FROM token_mints WHERE address = ?
    `).get(tokenAddress) as any;
    
    if (tokenData) {
      // We have it indexed! Fetch complete info (metadata + holders + price)
      const completeInfo = await fetchCompleteTokenInfo(
        tokenAddress,
        tokenData.supply.toString(),
        tokenData.decimals
      );
      
      return res.json({
        success: true,
        source: 'WHISTLE-INDEX',
        token: {
          address: tokenData.address,
          decimals: tokenData.decimals,
          supply: tokenData.supply,
          mintAuthority: tokenData.mint_authority,
          freezeAuthority: tokenData.freeze_authority,
          // Full metadata + market data
          name: completeInfo?.name || null,
          symbol: completeInfo?.symbol || null,
          image: completeInfo?.image || null,
          description: completeInfo?.description || null,
          uri: completeInfo?.uri || null,
          externalUrl: completeInfo?.externalUrl || null,
          attributes: completeInfo?.attributes || null,
          holders: completeInfo?.holders || 0,
          price: completeInfo?.price || null,
          marketCap: completeInfo?.marketCap || null,
        },
      });
    }
    
    // Not indexed yet, fetch from chain and index it
    const pubkey = new PublicKey(tokenAddress);
    const accountInfo = await connection.getParsedAccountInfo(pubkey);
    
    if (!accountInfo.value || !('parsed' in accountInfo.value.data)) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    const parsed = accountInfo.value.data.parsed;
    if (parsed.type === 'mint') {
      const info = parsed.info;
      
      // Index it for future queries
      try {
        db.prepare(`
          INSERT OR REPLACE INTO token_mints 
          (address, supply, decimals, mint_authority, freeze_authority, last_updated_slot)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          tokenAddress,
          info.supply,
          info.decimals,
          info.mintAuthority,
          info.freezeAuthority,
          0
        );
      } catch (e) {
        // Ignore DB errors
      }
      
      // Fetch complete info (metadata + holders + price)
      const completeInfo = await fetchCompleteTokenInfo(
        tokenAddress,
        info.supply,
        info.decimals
      );
      
      res.json({
        success: true,
        source: 'BLOCKCHAIN-DIRECT',
        token: {
          address: tokenAddress,
          decimals: info.decimals,
          supply: info.supply,
          mintAuthority: info.mintAuthority,
          freezeAuthority: info.freezeAuthority,
          // Full metadata + market data
          name: completeInfo?.name || null,
          symbol: completeInfo?.symbol || null,
          image: completeInfo?.image || null,
          description: completeInfo?.description || null,
          uri: completeInfo?.uri || null,
          externalUrl: completeInfo?.externalUrl || null,
          attributes: completeInfo?.attributes || null,
          holders: completeInfo?.holders || 0,
          price: completeInfo?.price || null,
          marketCap: completeInfo?.marketCap || null,
        },
        note: 'Fetched from chain and indexed for future queries',
      });
    }
    
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /tokens/latest
// SIMPLIFIED: Just returns indexed tokens (reliable, fast, no errors)
// For REAL real-time data, use /tokens/:address directly
router.get('/tokens/latest', async (req, res) => {
  const { limit = '20' } = req.query;
  
  try {
    // Simple, reliable: return indexed tokens from database
    const tokens = db.prepare(`
      SELECT address, decimals, supply, mint_authority, freeze_authority, created_at
      FROM token_mints
      ORDER BY created_at DESC
      LIMIT ?
    `).all(parseInt(limit as string));
    
    res.json({
      success: true,
      source: 'INDEXED',
      count: tokens.length,
      tokens: tokens,
      note: tokens.length > 0 ? 
        'Indexed tokens from database' :
        'No indexed tokens yet. Use /tokens/:address to lookup any token directly.',
    });
    
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /deployer/{wallet}
// Track deployers from OUR indexed data
router.get('/deployer/:wallet', async (req, res) => {
  const { wallet } = req.params;
  
  try {
    // Check our index first
    const deployedTokens = db.prepare(`
      SELECT address, decimals, supply, created_at
      FROM token_mints
      WHERE mint_authority = ?
      ORDER BY created_at DESC
    `).all(wallet);
    
    if (deployedTokens.length > 0) {
      return res.json({
        success: true,
        source: 'WHISTLE-INDEX',
        deployer: wallet,
        count: deployedTokens.length,
        tokens: deployedTokens,
      });
    }
    
    // Not in index, scan blockchain
    const pubkey = new PublicKey(wallet);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      pubkey,
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    );
    
    const deployed: any[] = [];
    for (const account of tokenAccounts.value.slice(0, 10)) {
      const mint = account.account.data.parsed.info.mint;
      try {
        const mintInfo = await connection.getParsedAccountInfo(new PublicKey(mint));
        if (mintInfo.value && 'parsed' in mintInfo.value.data) {
          const parsed = mintInfo.value.data.parsed;
          if (parsed.info.mintAuthority === wallet) {
            deployed.push({
              address: mint,
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
      source: 'BLOCKCHAIN-SCAN',
      deployer: wallet,
      count: deployed.length,
      tokens: deployed,
      note: 'Scanned blockchain. Will be faster when fully indexed.',
    });
    
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /tokens/multi
// Get multiple tokens from OUR data
router.post('/tokens/multi', async (req, res) => {
  const { addresses } = req.body;
  
  if (!addresses || !Array.isArray(addresses)) {
    return res.status(400).json({ error: 'addresses array required' });
  }
  
  try {
    const placeholders = addresses.map(() => '?').join(',');
    const tokens = db.prepare(`
      SELECT address, decimals, supply, mint_authority, freeze_authority
      FROM token_mints
      WHERE address IN (${placeholders})
    `).all(...addresses);
    
    // For tokens not in our index, fetch from chain
    const indexed = new Set(tokens.map((t: any) => t.address));
    const missing = addresses.filter(addr => !indexed.has(addr));
    
    for (const addr of missing.slice(0, 5)) { // Limit to 5 to avoid rate limits
      try {
        const pubkey = new PublicKey(addr);
        const accountInfo = await connection.getParsedAccountInfo(pubkey);
        if (accountInfo.value && 'parsed' in accountInfo.value.data) {
          const parsed = accountInfo.value.data.parsed;
          if (parsed.type === 'mint') {
            tokens.push({
              address: addr,
              decimals: parsed.info.decimals,
              supply: parsed.info.supply,
              mint_authority: parsed.info.mintAuthority,
              freeze_authority: parsed.info.freezeAuthority,
            });
          }
        }
      } catch (e) {
        // Skip
      }
    }
    
    res.json({
      success: true,
      source: 'WHISTLE-INDEX + BLOCKCHAIN',
      count: tokens.length,
      tokens: tokens,
    });
    
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /search
// Search in OUR indexed data
router.get('/search', async (req, res) => {
  const { q, limit = '20' } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'q parameter required' });
  }
  
  const query = (q as string).toLowerCase();
  const searchQuery = q as string;
  
  // Try as exact address first - check index
  const exactMatch = db.prepare(`
    SELECT * FROM token_mints WHERE address = ?
  `).get(searchQuery) as any;
  
  if (exactMatch) {
    // Fetch complete info (metadata + holders + price)
    const completeInfo = await fetchCompleteTokenInfo(
      searchQuery,
      exactMatch.supply.toString(),
      exactMatch.decimals
    );
    
    return res.json({
      success: true,
      source: 'WHISTLE-INDEX',
      results: [{
        address: exactMatch.address,
        supply: exactMatch.supply,
        decimals: exactMatch.decimals,
        mint_authority: exactMatch.mint_authority,
        freeze_authority: exactMatch.freeze_authority,
        created_at: exactMatch.created_at,
        // Full metadata + market data
        name: completeInfo?.name || null,
        symbol: completeInfo?.symbol || null,
        image: completeInfo?.image || null,
        description: completeInfo?.description || null,
        uri: completeInfo?.uri || null,
        externalUrl: completeInfo?.externalUrl || null,
        attributes: completeInfo?.attributes || null,
        holders: completeInfo?.holders || 0,
        price: completeInfo?.price || null,
        marketCap: completeInfo?.marketCap || null,
      }],
      count: 1,
    });
  }
  
  // Try to fetch from blockchain if it looks like a valid address
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(searchQuery)) {
    try {
      const pubkey = new PublicKey(searchQuery);
      const accountInfo = await connection.getParsedAccountInfo(pubkey);
      
      if (accountInfo.value && 'parsed' in accountInfo.value.data) {
        const parsed = accountInfo.value.data.parsed;
        if (parsed.type === 'mint') {
          // Fetch complete info (metadata + holders + price)
          const completeInfo = await fetchCompleteTokenInfo(
            searchQuery,
            parsed.info.supply,
            parsed.info.decimals
          );
          
          return res.json({
            success: true,
            source: 'BLOCKCHAIN-DIRECT',
            results: [{
              address: searchQuery,
              decimals: parsed.info.decimals,
              supply: parsed.info.supply,
              mintAuthority: parsed.info.mintAuthority,
              freezeAuthority: parsed.info.freezeAuthority,
              // Full metadata + market data
              name: completeInfo?.name || null,
              symbol: completeInfo?.symbol || null,
              image: completeInfo?.image || null,
              description: completeInfo?.description || null,
              uri: completeInfo?.uri || null,
              externalUrl: completeInfo?.externalUrl || null,
              attributes: completeInfo?.attributes || null,
              holders: completeInfo?.holders || 0,
              price: completeInfo?.price || null,
              marketCap: completeInfo?.marketCap || null,
            }],
            count: 1,
          });
        }
      }
    } catch (e) {
      // Invalid address, fall through to partial search
    }
  }
  
  // Search by partial address match in our index
  const results = db.prepare(`
    SELECT * FROM token_mints
    WHERE address LIKE ?
    LIMIT ?
  `).all(`%${query}%`, parseInt(limit as string));
  
  res.json({
    success: true,
    source: 'WHISTLE-INDEX',
    query: searchQuery,
    results: results,
    count: results.length,
    note: results.length === 0 ? 
      'No matches found. Try a full token address for real-time blockchain lookup.' :
      'Partial matches from indexed data',
  });
});

export default router;

