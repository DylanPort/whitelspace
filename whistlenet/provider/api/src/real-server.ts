// REAL API Server - Connects to Solana Devnet
import express from 'express';
import cors from 'cors';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

const app = express();
const PORT = 8080;

// SQLite database
const dbPath = path.join(__dirname, '../../data');
if (!existsSync(dbPath)) {
  mkdirSync(dbPath, { recursive: true });
}
const db = new Database(path.join(dbPath, 'whistle.db'));

// Initialize schema
const schemaPath = path.join(__dirname, '../../config/schema-sqlite.sql');
if (existsSync(schemaPath)) {
  const schema = require('fs').readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  console.log('✅ Database schema loaded');
}

// Solana connection - REAL DEVNET
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

app.use(cors());
app.use(express.json());

// Middleware to log queries
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
      // Ignore errors
    }
  });
  next();
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Test REAL Solana connection
    const slot = await connection.getSlot();
    const version = await connection.getVersion();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      mode: 'REAL-DATA',
      database: 'sqlite-enabled',
      solana: {
        network: 'devnet',
        connected: true,
        current_slot: slot,
        version: version['solana-core'],
      },
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      mode: 'REAL-DATA',
      database: 'sqlite-enabled',
      solana: {
        network: 'devnet',
        connected: false,
      },
    });
  }
});

// Stats
app.get('/api/stats', async (req, res) => {
  try {
    const slot = await connection.getSlot();
    const blockTime = await connection.getBlockTime(slot);
    
    const dbStats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM transactions) as tx_count,
        (SELECT COUNT(*) FROM blocks) as block_count,
        (SELECT COUNT(*) FROM accounts) as account_count
    `).get() as any;
    
    const queryStats = db.prepare(`
      SELECT COUNT(*) as total, AVG(response_time_ms) as avg_time
      FROM query_logs
      WHERE timestamp > datetime('now', '-1 hour')
    `).get() as any;
    
    res.json({
      provider: {
        status: 'active',
        uptime: process.uptime(),
        queries_served: queryStats?.total || 0,
        avg_response_time: queryStats?.avg_time || 0,
      },
      blockchain: {
        network: 'devnet',
        latest_slot: slot,
        latest_block_time: blockTime,
        transactions_indexed: dbStats?.tx_count || 0,
        blocks_indexed: dbStats?.block_count || 0,
        accounts_indexed: dbStats?.account_count || 0,
        last_update: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get REAL transactions for a wallet
app.get('/api/transactions', async (req, res) => {
  const { wallet, limit = '10', status, from, to } = req.query;
  
  if (!wallet) {
    return res.status(400).json({ error: 'wallet parameter required' });
  }
  
  try {
    const pubkey = new PublicKey(wallet as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    
    // Fetch REAL transactions from Solana devnet
    const signatures = await connection.getSignaturesForAddress(pubkey, { limit: limitNum });
    
    const transactions = await Promise.all(
      signatures.map(async (sig) => {
        try {
          const tx = await connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });
          
          if (!tx) return null;
          
          // Parse transaction
          const meta = tx.meta;
          const message = tx.transaction.message;
          const accounts = message.accountKeys;
          
          // Get fee payer and first recipient
          const fromAddress = accounts[0]?.pubkey.toString() || '';
          const toAddress = accounts.length > 1 ? accounts[1]?.pubkey.toString() : '';
          
          // Get SOL transfer amount
          let amount = 0;
          if (meta?.preBalances && meta?.postBalances) {
            const balanceDiff = Math.abs(meta.postBalances[0] - meta.preBalances[0]);
            amount = balanceDiff;
          }
          
          return {
            signature: sig.signature,
            slot: tx.slot,
            block_time: tx.blockTime || 0,
            from_address: fromAddress,
            to_address: toAddress,
            amount: amount,
            status: meta?.err ? 'failed' : 'success',
            fee: meta?.fee || 0,
            program_id: message.instructions[0]?.programId?.toString() || '',
            confirmations: sig.confirmationStatus,
          };
        } catch (e) {
          return null;
        }
      })
    );
    
    const validTxs = transactions.filter((tx) => tx !== null);
    
    // Store in database
    for (const tx of validTxs) {
      if (tx) {
        try {
          db.prepare(`
            INSERT OR REPLACE INTO transactions 
            (signature, slot, block_time, from_address, to_address, amount, status, fee, program_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            tx.signature,
            tx.slot,
            tx.block_time,
            tx.from_address,
            tx.to_address,
            tx.amount,
            tx.status,
            tx.fee,
            tx.program_id
          );
        } catch (e) {
          // Ignore duplicate errors
        }
      }
    }
    
    res.json({
      data: validTxs,
      count: validTxs.length,
      query: { wallet, limit },
      source: 'REAL-SOLANA-DEVNET',
      cached: false,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single transaction
app.get('/api/transaction/:signature', async (req, res) => {
  const { signature } = req.params;
  
  try {
    // Try database first
    const cached = db.prepare(`
      SELECT * FROM transactions WHERE signature = ?
    `).get(signature);
    
    if (cached) {
      return res.json({
        data: cached,
        source: 'database-cache',
        cached: true,
      });
    }
    
    // Fetch from REAL Solana
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    const meta = tx.meta;
    const message = tx.transaction.message;
    const accounts = message.accountKeys;
    
    const txData = {
      signature: signature,
      slot: tx.slot,
      block_time: tx.blockTime || 0,
      from_address: accounts[0]?.pubkey.toString() || '',
      to_address: accounts.length > 1 ? accounts[1]?.pubkey.toString() : '',
      status: meta?.err ? 'failed' : 'success',
      fee: meta?.fee || 0,
      program_id: message.instructions[0]?.programId?.toString() || '',
    };
    
    res.json({
      data: txData,
      source: 'REAL-SOLANA-DEVNET',
      cached: false,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get REAL balance
app.get('/api/balance/:address', async (req, res) => {
  const { address } = req.params;
  
  try {
    const pubkey = new PublicKey(address);
    
    // Get REAL balance from Solana
    const balance = await connection.getBalance(pubkey);
    const accountInfo = await connection.getAccountInfo(pubkey);
    
    // Get token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    });
    
    const tokens = tokenAccounts.value.map((acc) => ({
      mint: acc.account.data.parsed.info.mint,
      amount: acc.account.data.parsed.info.tokenAmount.uiAmount,
      decimals: acc.account.data.parsed.info.tokenAmount.decimals,
    }));
    
    res.json({
      address: address,
      balance: balance,
      balance_sol: balance / 1e9,
      token_accounts: tokens,
      account_exists: accountInfo !== null,
      last_update: new Date().toISOString(),
      source: 'REAL-SOLANA-DEVNET',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get NFTs (limited on devnet)
app.get('/api/nfts/:owner', async (req, res) => {
  const { owner } = req.params;
  
  try {
    const pubkey = new PublicKey(owner);
    
    // Get token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    });
    
    // Filter for NFTs (amount = 1, decimals = 0)
    const nfts = tokenAccounts.value
      .filter((acc) => {
        const info = acc.account.data.parsed.info;
        return info.tokenAmount.amount === '1' && info.tokenAmount.decimals === 0;
      })
      .map((acc) => ({
        mint: acc.account.data.parsed.info.mint,
        owner: owner,
      }));
    
    res.json({
      owner: owner,
      nfts: nfts,
      count: nfts.length,
      source: 'REAL-SOLANA-DEVNET',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Metrics (Prometheus format)
app.get('/metrics', async (req, res) => {
  try {
    const queryStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        AVG(response_time_ms) as avg_time,
        MIN(response_time_ms) as min_time,
        MAX(response_time_ms) as max_time
      FROM query_logs
      WHERE timestamp > datetime('now', '-1 hour')
    `).get() as any;
    
    const dbStats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM transactions) as tx_count,
        (SELECT COUNT(*) FROM blocks) as block_count
    `).get() as any;
    
    res.type('text/plain').send(`
# HELP whistle_queries_total Total number of queries
# TYPE whistle_queries_total counter
whistle_queries_total ${queryStats?.total || 0}

# HELP whistle_response_time_avg Average response time in ms
# TYPE whistle_response_time_avg gauge
whistle_response_time_avg ${queryStats?.avg_time || 0}

# HELP whistle_transactions_indexed Total transactions in database
# TYPE whistle_transactions_indexed counter
whistle_transactions_indexed ${dbStats?.tx_count || 0}

# HELP whistle_blocks_indexed Total blocks in database
# TYPE whistle_blocks_indexed counter
whistle_blocks_indexed ${dbStats?.block_count || 0}

# HELP whistle_uptime_seconds Server uptime in seconds
# TYPE whistle_uptime_seconds counter
whistle_uptime_seconds ${Math.floor(process.uptime())}
`);
  } catch (error) {
    res.type('text/plain').send('# Error generating metrics\n');
  }
});

// Start server
app.listen(PORT, async () => {
  console.log('\n🚀 WHISTLE API Server - REAL DATA MODE\n');
  console.log(`   Status: Running`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   Mode: REAL-DATA`);
  console.log(`   Database: SQLite (Enabled)`);
  console.log(`   Blockchain: Solana Devnet (Live Connection)\n`);
  
  try {
    const slot = await connection.getSlot();
    const version = await connection.getVersion();
    console.log(`✅ Connected to Solana Devnet`);
    console.log(`   Current Slot: ${slot}`);
    console.log(`   Version: ${version['solana-core']}\n`);
  } catch (e) {
    console.error('❌ Failed to connect to Solana devnet:', e);
  }
  
  console.log('📋 Available Endpoints:\n');
  console.log(`   GET /api/health`);
  console.log(`   GET /api/stats`);
  console.log(`   GET /api/transactions?wallet=ADDRESS&limit=10`);
  console.log(`   GET /api/transaction/:signature`);
  console.log(`   GET /api/balance/:address`);
  console.log(`   GET /api/nfts/:owner`);
  console.log(`   GET /metrics\n`);
  console.log('🧪 Test with: curl http://localhost:8080/api/health\n');
  console.log('🌐 FETCHING REAL DATA FROM SOLANA DEVNET!\n');
});

