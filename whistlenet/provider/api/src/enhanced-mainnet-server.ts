// PROFESSIONAL GRADE MAINNET API - Helius-level data organization
import express from 'express';
import cors from 'cors';
import { Connection, PublicKey, ParsedTransactionWithMeta, PartiallyDecodedInstruction } from '@solana/web3.js';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import tokenRouter from './token-analytics';

const app = express();
const PORT = 8080;

// Database setup
const dbPath = path.join(__dirname, '../../data');
if (!existsSync(dbPath)) {
  mkdirSync(dbPath, { recursive: true });
}
const db = new Database(path.join(dbPath, 'whistle-mainnet.db'));

// Initialize enhanced schema
const schemaPath = path.join(__dirname, '../../config/schema-sqlite.sql');
if (existsSync(schemaPath)) {
  const schema = require('fs').readFileSync(schemaPath, 'utf8');
  db.exec(schema);
}

// Solana mainnet connection
const MAINNET_RPC = process.env.MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(MAINNET_RPC, 'confirmed');

// Known program IDs
const PROGRAMS = {
  // Whistlenet (155-byte pool reinitialized)
  WHISTLE: 'whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr',
  
  // Solana core
  TOKEN_PROGRAM: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  SYSTEM_PROGRAM: '11111111111111111111111111111111',
  ASSOCIATED_TOKEN: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  COMPUTE_BUDGET: 'ComputeBudget111111111111111111111111111111',
  MEMO_PROGRAM: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
  
  // DeFi programs
  RAYDIUM_V4: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  JUPITER_V6: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  ORCA_WHIRLPOOL: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  METAPLEX: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
};

app.use(cors());
app.use(express.json());

// Mount token API router
app.use('/api', tokenRouter);

// Health check endpoint (both paths for compatibility)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', network: 'mainnet-beta', timestamp: Date.now() });
});

// Provider stats endpoint (for dashboard)
app.get('/providers/stats', (req, res) => {
  // Mock data for now - will be populated by indexer
  res.json({
    totalProviders: 0,
    activeProviders: 0,
    totalStaked: '0',
    averageUptime: 0,
    providers: []
  });
});

// Query logs endpoint (for dashboard)
app.get('/queries/logs', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  // Mock data for now - will be populated by indexer
  res.json({
    queries: [],
    total: 0,
    limit: limit
  });
});

// Enhanced transaction parser
interface EnhancedTransaction {
  signature: string;
  slot: number;
  blockTime: number;
  status: 'success' | 'failed';
  fee: number;
  feePayer: string;
  
  // Token transfers
  tokenTransfers: Array<{
    mint: string;
    from: string;
    to: string;
    amount: number;
    decimals: number;
    tokenStandard?: string;
  }>;
  
  // Native SOL transfers
  nativeTransfers: Array<{
    from: string;
    to: string;
    amount: number;
  }>;
  
  // Instructions
  instructions: Array<{
    programId: string;
    programName: string;
    type: string;
    data?: any;
  }>;
  
  // Account changes
  accountData: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: Array<{
      mint: string;
      change: number;
    }>;
  }>;
  
  // Events/logs
  events: string[];
  
  // Source
  source: string;
  timestamp: string;
}

function getProgramName(programId: string): string {
  const names: { [key: string]: string } = {
    [PROGRAMS.TOKEN_PROGRAM]: 'Token Program',
    [PROGRAMS.SYSTEM_PROGRAM]: 'System Program',
    [PROGRAMS.ASSOCIATED_TOKEN]: 'Associated Token Program',
    [PROGRAMS.COMPUTE_BUDGET]: 'Compute Budget',
    [PROGRAMS.MEMO_PROGRAM]: 'Memo Program',
    [PROGRAMS.RAYDIUM_V4]: 'Raydium V4',
    [PROGRAMS.JUPITER_V6]: 'Jupiter V6',
    [PROGRAMS.ORCA_WHIRLPOOL]: 'Orca Whirlpool',
    [PROGRAMS.METAPLEX]: 'Metaplex',
  };
  return names[programId] || 'Unknown Program';
}

function parseEnhancedTransaction(
  tx: ParsedTransactionWithMeta,
  signature: string
): EnhancedTransaction | null {
  if (!tx) return null;

  const meta = tx.meta;
  const message = tx.transaction.message;
  const accountKeys = message.accountKeys;

  // Token transfers
  const tokenTransfers: any[] = [];
  if (meta?.preTokenBalances && meta?.postTokenBalances) {
    const preBalances = new Map(meta.preTokenBalances.map(b => [b.accountIndex, b]));
    const postBalances = new Map(meta.postTokenBalances.map(b => [b.accountIndex, b]));

    postBalances.forEach((post, index) => {
      const pre = preBalances.get(index);
      if (pre && post.mint === pre.mint) {
        const preAmount = parseFloat(pre.uiTokenAmount.uiAmountString || '0');
        const postAmount = parseFloat(post.uiTokenAmount.uiAmountString || '0');
        const change = postAmount - preAmount;

        if (change !== 0) {
          tokenTransfers.push({
            mint: post.mint,
            from: change < 0 ? post.owner : pre.owner,
            to: change > 0 ? post.owner : pre.owner,
            amount: Math.abs(change),
            decimals: post.uiTokenAmount.decimals,
            tokenStandard: post.uiTokenAmount.decimals === 0 ? 'NFT' : 'Fungible',
          });
        }
      }
    });
  }

  // Native SOL transfers
  const nativeTransfers: any[] = [];
  if (meta?.preBalances && meta?.postBalances) {
    for (let i = 0; i < meta.preBalances.length; i++) {
      const preBalance = meta.preBalances[i];
      const postBalance = meta.postBalances[i];
      const change = postBalance - preBalance;

      if (change !== 0 && i < accountKeys.length) {
        nativeTransfers.push({
          from: change < 0 ? accountKeys[i].pubkey.toString() : 'system',
          to: change > 0 ? accountKeys[i].pubkey.toString() : 'system',
          amount: Math.abs(change),
          amountSol: Math.abs(change) / 1e9,
        });
      }
    }
  }

  // Parse instructions
  const instructions = message.instructions.map((ix: any) => {
    const programId = ix.programId.toString();
    const programName = getProgramName(programId);

    let type = 'unknown';
    let data: any = {};

    if (ix.parsed) {
      type = ix.parsed.type || 'unknown';
      data = ix.parsed.info || {};
    }

    return {
      programId,
      programName,
      type,
      data,
    };
  });

  // Account balance changes
  const accountData: any[] = [];
  if (meta?.preBalances && meta?.postBalances) {
    for (let i = 0; i < accountKeys.length; i++) {
      const nativeChange = meta.postBalances[i] - meta.preBalances[i];
      const account = accountKeys[i].pubkey.toString();

      // Token balance changes for this account
      const tokenBalanceChanges: any[] = [];
      if (meta.preTokenBalances && meta.postTokenBalances) {
        const preTokens = meta.preTokenBalances.filter(b => b.accountIndex === i);
        const postTokens = meta.postTokenBalances.filter(b => b.accountIndex === i);

        postTokens.forEach(post => {
          const pre = preTokens.find(p => p.mint === post.mint);
          if (pre) {
            const preAmount = parseFloat(pre.uiTokenAmount.uiAmountString || '0');
            const postAmount = parseFloat(post.uiTokenAmount.uiAmountString || '0');
            const change = postAmount - preAmount;

            if (change !== 0) {
              tokenBalanceChanges.push({
                mint: post.mint,
                change: change,
                decimals: post.uiTokenAmount.decimals,
              });
            }
          }
        });
      }

      if (nativeChange !== 0 || tokenBalanceChanges.length > 0) {
        accountData.push({
          account,
          nativeBalanceChange: nativeChange,
          nativeBalanceChangeSol: nativeChange / 1e9,
          tokenBalanceChanges,
        });
      }
    }
  }

  // Events/logs
  const events = meta?.logMessages || [];

  return {
    signature,
    slot: tx.slot,
    blockTime: tx.blockTime || 0,
    status: meta?.err ? 'failed' : 'success',
    fee: meta?.fee || 0,
    feePayer: accountKeys[0]?.pubkey.toString() || '',
    tokenTransfers,
    nativeTransfers,
    instructions,
    accountData,
    events,
    source: 'WHISTLE-MAINNET-PROFESSIONAL',
    timestamp: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : '',
  };
}

// Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    try {
      db.prepare(`
        INSERT INTO query_logs (query_type, parameters, response_time_ms, timestamp)
        VALUES (?, ?, ?, datetime('now'))
      `).run(req.path, JSON.stringify(req.query), duration);
    } catch (e) {
      // Ignore
    }
  });
  next();
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const slot = await connection.getSlot();
    const version = await connection.getVersion();
    const epochInfo = await connection.getEpochInfo();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      mode: '🏆 PROFESSIONAL-GRADE MAINNET 🏆',
      dataQuality: 'Helius-Level',
      database: 'sqlite-enabled',
      solana: {
        network: 'MAINNET-BETA',
        connected: true,
        current_slot: slot,
        epoch: epochInfo.epoch,
        version: version['solana-core'],
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// Enhanced transactions endpoint with FULL RPC data
app.get('/api/v1/transactions', async (req, res) => {
  const { wallet, limit = '20' } = req.query;
  
  if (!wallet) {
    return res.status(400).json({ 
      error: 'wallet parameter required',
      example: '/api/v1/transactions?wallet=ADDRESS&limit=20'
    });
  }
  
  try {
    const pubkey = new PublicKey(wallet as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    
    console.log(`[API] Fetching ${limitNum} FULL transactions for ${wallet}...`);
    
    const signatures = await connection.getSignaturesForAddress(pubkey, { limit: limitNum });
    
    const fullTransactions = await Promise.all(
      signatures.map(async (sig) => {
        try {
          const tx = await connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });
          
          if (!tx) return null;
          
          const enhanced = parseEnhancedTransaction(tx, sig.signature);
          
          // Return BOTH enhanced parsing AND full raw data
          return {
            // Our enhanced parsing
            enhanced: enhanced,
            
            // FULL RAW RPC DATA
            raw: {
              slot: tx.slot,
              blockTime: tx.blockTime,
              transaction: tx.transaction,
              meta: tx.meta ? {
                err: tx.meta.err || null,
                fee: tx.meta.fee || 0,
                preBalances: tx.meta.preBalances || [],
                postBalances: tx.meta.postBalances || [],
                preTokenBalances: tx.meta.preTokenBalances || [],
                postTokenBalances: tx.meta.postTokenBalances || [],
                innerInstructions: tx.meta.innerInstructions || [],
                logMessages: tx.meta.logMessages || [],
                loadedAddresses: tx.meta.loadedAddresses || {},
                computeUnitsConsumed: (tx.meta as any).computeUnitsConsumed || null,
              } : null,
              version: tx.version,
            },
            
            // Quick access fields
            signature: sig.signature,
            slot: tx.slot,
            blockTime: tx.blockTime,
            status: tx.meta?.err ? 'failed' : 'success',
            fee: tx.meta?.fee || 0,
          };
        } catch (e) {
          console.error(`[API] Error parsing tx ${sig.signature}:`, e);
          return null;
        }
      })
    );
    
    const validTxs = fullTransactions.filter(tx => tx !== null);
    
    res.json({
      success: true,
      count: validTxs.length,
      transactions: validTxs,
      query: {
        wallet,
        limit: limitNum,
      },
      metadata: {
        source: 'WHISTLE-MAINNET',
        dataQuality: 'Professional Grade - FULL RPC DATA',
        network: 'mainnet-beta',
        timestamp: new Date().toISOString(),
        note: 'Includes both enhanced parsing and complete raw RPC response',
      },
    });
  } catch (error: any) {
    console.error('[API] Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      hint: 'Check if the wallet address is valid'
    });
  }
});

// Enhanced balance endpoint
app.get('/api/v1/balance/:address', async (req, res) => {
  const { address } = req.params;
  
  try {
    const pubkey = new PublicKey(address);
    
    console.log(`[API] Fetching balance for ${address}...`);
    
    // Get SOL balance
    const balance = await connection.getBalance(pubkey);
    const accountInfo = await connection.getAccountInfo(pubkey);
    
    // Get token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: new PublicKey(PROGRAMS.TOKEN_PROGRAM),
    });
    
    const tokens = tokenAccounts.value.map((acc) => {
      const info = acc.account.data.parsed.info;
      const amount = info.tokenAmount;
      
      return {
        mint: info.mint,
        owner: info.owner,
        balance: amount.uiAmountString,
        decimals: amount.decimals,
        uiAmount: amount.uiAmount,
        rawAmount: amount.amount,
        tokenStandard: amount.decimals === 0 ? 'NFT' : 'Fungible Token',
      };
    });
    
    // Separate NFTs and tokens
    const nfts = tokens.filter(t => t.tokenStandard === 'NFT');
    const fungibleTokens = tokens.filter(t => t.tokenStandard === 'Fungible Token');
    
    res.json({
      success: true,
      address: address,
      balance: {
        sol: {
          lamports: balance,
          sol: balance / 1e9,
          usd: (balance / 1e9) * 250, // Approximate
        },
        tokens: {
          count: fungibleTokens.length,
          items: fungibleTokens,
        },
        nfts: {
          count: nfts.length,
          items: nfts,
        },
      },
      accountInfo: {
        exists: accountInfo !== null,
        owner: accountInfo?.owner?.toString(),
        executable: accountInfo?.executable || false,
        rentEpoch: accountInfo?.rentEpoch,
      },
      metadata: {
        source: 'WHISTLE-MAINNET',
        network: 'mainnet-beta',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[API] Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Token metadata endpoint
app.get('/api/v1/token/:mint', async (req, res) => {
  const { mint } = req.params;
  
  try {
    const pubkey = new PublicKey(mint);
    const accountInfo = await connection.getParsedAccountInfo(pubkey);
    
    if (!accountInfo.value) {
      return res.status(404).json({ error: 'Token mint not found' });
    }
    
    const data = accountInfo.value.data;
    let tokenInfo: any = {};
    
    if ('parsed' in data) {
      const parsed = data.parsed;
      if (parsed.type === 'mint') {
        tokenInfo = {
          mint: mint,
          supply: parsed.info.supply,
          decimals: parsed.info.decimals,
          mintAuthority: parsed.info.mintAuthority,
          freezeAuthority: parsed.info.freezeAuthority,
          isInitialized: parsed.info.isInitialized,
          tokenStandard: parsed.info.decimals === 0 ? 'NFT' : 'Fungible Token',
        };
      }
    }
    
    res.json({
      success: true,
      token: tokenInfo,
      metadata: {
        source: 'WHISTLE-MAINNET',
        network: 'mainnet-beta',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Stats
app.get('/api/stats', async (req, res) => {
  try {
    const slot = await connection.getSlot();
    const epochInfo = await connection.getEpochInfo();
    
    const queryStats = db.prepare(`
      SELECT COUNT(*) as total, AVG(response_time_ms) as avg_time
      FROM query_logs
      WHERE timestamp > datetime('now', '-1 hour')
    `).get() as any;
    
    res.json({
      success: true,
      provider: {
        status: 'active',
        mode: 'PROFESSIONAL-GRADE',
        dataQuality: 'Helius-Level',
        uptime: process.uptime(),
        queries_last_hour: queryStats?.total || 0,
        avg_response_time_ms: Math.round(queryStats?.avg_time || 0),
      },
      blockchain: {
        network: 'mainnet-beta',
        slot: slot,
        epoch: epochInfo.epoch,
        slotIndex: epochInfo.slotIndex,
        slotsInEpoch: epochInfo.slotsInEpoch,
        percentComplete: ((epochInfo.slotIndex / epochInfo.slotsInEpoch) * 100).toFixed(2) + '%',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Metrics
app.get('/metrics', (req, res) => {
  const queryStats = db.prepare(`
    SELECT COUNT(*) as total, AVG(response_time_ms) as avg_time
    FROM query_logs
    WHERE timestamp > datetime('now', '-1 hour')
  `).get() as any;
  
  res.type('text/plain').send(`
# HELP whistle_queries_total Total queries
whistle_queries_total ${queryStats?.total || 0}

# HELP whistle_response_time_avg Average response time (ms)
whistle_response_time_avg ${queryStats?.avg_time || 0}

# HELP whistle_uptime_seconds Uptime
whistle_uptime_seconds ${Math.floor(process.uptime())}
`);
});

// API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'WHISTLE Professional API',
    version: '1.0.0',
    quality: 'Helius-Grade',
    network: 'mainnet-beta',
    endpoints: {
      health: 'GET /api/health',
      transactions: 'GET /api/v1/transactions?wallet=ADDRESS&limit=20',
      balance: 'GET /api/v1/balance/:address',
      token: 'GET /api/v1/token/:mint',
      stats: 'GET /api/stats',
      metrics: 'GET /metrics',
    },
    documentation: 'https://docs.whistle.network',
  });
});

// Start server
app.listen(PORT, async () => {
  console.log('\n🏆🏆🏆 WHISTLE PROFESSIONAL-GRADE API 🏆🏆🏆\n');
  console.log(`   Status: Running`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   Quality: Helius-Level Data Organization`);
  console.log(`   Network: Solana MAINNET-BETA\n`);
  
  try {
    const slot = await connection.getSlot();
    const epochInfo = await connection.getEpochInfo();
    console.log(`✅ Connected to Solana MAINNET`);
    console.log(`   Slot: ${slot.toLocaleString()}`);
    console.log(`   Epoch: ${epochInfo.epoch}\n`);
  } catch (e) {
    console.error('❌ Connection error:', e);
  }
  
  console.log('📋 Professional Endpoints:\n');
  console.log(`   GET /api/v1/transactions?wallet=ADDRESS&limit=20`);
  console.log(`   GET /api/v1/balance/:address`);
  console.log(`   GET /api/v1/token/:mint`);
  console.log(`   GET /api/stats`);
  console.log(`   GET /metrics\n`);
  console.log('🏆 PROFESSIONAL-GRADE DATA - HELIUS QUALITY 🏆\n');
});

