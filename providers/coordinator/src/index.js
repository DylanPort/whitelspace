/**
 * WHISTLE Coordinator
 * 
 * Central service that:
 * - Tracks all cache nodes (server + browser)
 * - Receives metrics reports from nodes
 * - Calculates tiered rewards based on work done
 * - Routes traffic to healthy nodes
 * - Manages WebSocket connections for browser nodes
 * 
 * Node Tiers:
 *   Tier 1 (Server): 1.5x reward multiplier, 24/7 expected
 *   Tier 2 (Browser): 1.0x reward multiplier, casual participation
 * 
 * Environment:
 *   PORT              - API port (default: 3003)
 *   DB_PATH           - SQLite database path
 *   REWARD_POOL       - Total rewards per epoch (in tokens)
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const Database = require('better-sqlite3');
const { WebSocketServer, WebSocket } = require('ws');
const { v4: uuidv4 } = require('uuid');

// Configuration
const PORT = process.env.PORT || 3003;
const DB_PATH = process.env.DB_PATH || './data/coordinator.db';
const REWARD_POOL_PER_HOUR = parseFloat(process.env.REWARD_POOL || '100');
const ENABLE_ONCHAIN_REWARDS = process.env.ENABLE_ONCHAIN_REWARDS === 'true';
const AUTHORITY_KEYPAIR = process.env.AUTHORITY_KEYPAIR || '';
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://rpc.whistle.ninja/rpc';

// Tier multipliers
const TIER_MULTIPLIERS = {
  server: 1.5,   // Tier 1: Server nodes
  browser: 1.0   // Tier 2: Browser nodes
};

// Uptime bonuses
const UPTIME_BONUSES = {
  95: 1.2,   // 95%+ uptime = 1.2x
  99: 1.5    // 99%+ uptime = 1.5x
};

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);

db.exec(`
  -- Cache nodes registry
  CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    wallet TEXT NOT NULL,
    name TEXT,
    endpoint TEXT,
    node_type TEXT DEFAULT 'server',
    tier INTEGER DEFAULT 1,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    total_requests INTEGER DEFAULT 0,
    total_hits INTEGER DEFAULT 0,
    total_bytes_saved INTEGER DEFAULT 0,
    uptime_samples INTEGER DEFAULT 0,
    online_samples INTEGER DEFAULT 0
  );
  
  -- Metrics reports from nodes
  CREATE TABLE IF NOT EXISTS metrics_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    requests INTEGER,
    hits INTEGER,
    misses INTEGER,
    hit_rate REAL,
    avg_cache_latency REAL,
    avg_upstream_latency REAL,
    bytes_saved INTEGER,
    uptime INTEGER
  );
  
  -- User credit accounts (Hybrid Payment Model)
  CREATE TABLE IF NOT EXISTS user_credits (
    wallet TEXT PRIMARY KEY,
    balance_lamports INTEGER DEFAULT 0,
    total_deposited INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    queries_made INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    last_query_at INTEGER,
    api_key TEXT UNIQUE,
    tier TEXT DEFAULT 'free',
    rate_limit INTEGER DEFAULT 100
  );
  
  -- Deposit transactions (SOL deposits from users)
  CREATE TABLE IF NOT EXISTS deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet TEXT NOT NULL,
    amount_lamports INTEGER NOT NULL,
    tx_signature TEXT UNIQUE,
    confirmed INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  
  -- Query usage tracking (for billing)
  CREATE TABLE IF NOT EXISTS query_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet TEXT NOT NULL,
    provider_wallet TEXT,
    method TEXT,
    cost_lamports INTEGER DEFAULT 10000,
    timestamp INTEGER NOT NULL
  );
  
  -- Batch settlements (on-chain payments)
  CREATE TABLE IF NOT EXISTS settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_start INTEGER NOT NULL,
    batch_end INTEGER NOT NULL,
    total_queries INTEGER NOT NULL,
    total_lamports INTEGER NOT NULL,
    provider_earnings TEXT,
    tx_signature TEXT,
    status TEXT DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    settled_at INTEGER
  );
  
  -- Reward calculations
  CREATE TABLE IF NOT EXISTS rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    epoch INTEGER NOT NULL,
    node_id TEXT NOT NULL,
    wallet TEXT NOT NULL,
    node_type TEXT,
    work_score REAL NOT NULL,
    tier_multiplier REAL DEFAULT 1.0,
    uptime_bonus REAL DEFAULT 1.0,
    reward_amount REAL NOT NULL,
    calculated_at INTEGER NOT NULL,
    claimed INTEGER DEFAULT 0
  );
  
  -- Epochs for reward distribution
  CREATE TABLE IF NOT EXISTS epochs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    total_work REAL DEFAULT 0,
    total_rewards REAL DEFAULT 0,
    status TEXT DEFAULT 'active'
  );
  
  -- Pending RPC requests for browser nodes
  CREATE TABLE IF NOT EXISTS pending_requests (
    id TEXT PRIMARY KEY,
    method TEXT NOT NULL,
    params TEXT,
    created_at INTEGER NOT NULL,
    assigned_to TEXT,
    completed INTEGER DEFAULT 0,
    result TEXT
  );
  
  CREATE INDEX IF NOT EXISTS idx_metrics_node ON metrics_reports(node_id);
  CREATE INDEX IF NOT EXISTS idx_metrics_time ON metrics_reports(timestamp);
  CREATE INDEX IF NOT EXISTS idx_rewards_wallet ON rewards(wallet);
  CREATE INDEX IF NOT EXISTS idx_rewards_epoch ON rewards(epoch);
  CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(node_type);
`);

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server for both Express and WebSocket
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// Track connected browser nodes
const browserNodes = new Map(); // nodeId -> { ws, wallet, lastPing, stats }

// =============================================================================
// WEBSOCKET HANDLING (Browser Nodes)
// =============================================================================

wss.on('connection', (ws, req) => {
  const nodeId = uuidv4();
  console.log(`[WS] Browser node connected: ${nodeId}`);
  
  // Initialize node state
  browserNodes.set(nodeId, {
    ws,
    wallet: null,
    lastPing: Date.now(),
    stats: {
      requests: 0,
      hits: 0,
      misses: 0,
      bytesSaved: 0,
      connected: Date.now()
    }
  });
  
  // Send welcome message with node ID
  ws.send(JSON.stringify({
    type: 'welcome',
    nodeId,
    message: 'Connected to WHISTLE Coordinator'
  }));
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleBrowserMessage(nodeId, message);
    } catch (e) {
      console.error('[WS] Invalid message:', e);
    }
  });
  
  ws.on('close', () => {
    console.log(`[WS] Browser node disconnected: ${nodeId}`);
    
    // Save final stats before removing
    const node = browserNodes.get(nodeId);
    if (node && node.wallet) {
      saveBrowserNodeStats(nodeId, node);
    }
    
    browserNodes.delete(nodeId);
  });
  
  ws.on('error', (error) => {
    console.error(`[WS] Error for node ${nodeId}:`, error);
  });
});

function handleBrowserMessage(nodeId, message) {
  const node = browserNodes.get(nodeId);
  if (!node) return;
  
  node.lastPing = Date.now();
  
  switch (message.type) {
    case 'register':
      // Browser node registering with wallet
      node.wallet = message.wallet;
      node.name = message.name;
      
      // Register in database
      registerBrowserNode(nodeId, message.wallet, message.name);
      
      node.ws.send(JSON.stringify({
        type: 'registered',
        nodeId,
        tier: 2,
        multiplier: TIER_MULTIPLIERS.browser
      }));
      
      console.log(`[WS] Browser node registered: ${nodeId} (${message.wallet})`);
      break;
      
    case 'metrics':
      // Browser node reporting metrics
      if (node.wallet) {
        node.stats.requests = message.requests || 0;
        node.stats.hits = message.hits || 0;
        node.stats.misses = message.misses || 0;
        node.stats.bytesSaved = message.bytesSaved || 0;
        
        // Save to database periodically
        saveBrowserNodeStats(nodeId, node);
      }
      break;
      
    case 'cache_result':
      // Browser node returning a cached result
      handleCacheResult(nodeId, message);
      break;
      
    case 'ping':
      node.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
      
    default:
      console.log(`[WS] Unknown message type: ${message.type}`);
  }
}

function registerBrowserNode(nodeId, wallet, name) {
  const now = Date.now();
  
  const existing = db.prepare('SELECT * FROM nodes WHERE id = ?').get(nodeId);
  
  if (!existing) {
    db.prepare(`
      INSERT INTO nodes (id, wallet, name, node_type, tier, first_seen, last_seen, status)
      VALUES (?, ?, ?, 'browser', 2, ?, ?, 'active')
    `).run(nodeId, wallet, name || null, now, now);
  } else {
    db.prepare(`
      UPDATE nodes SET wallet = ?, name = ?, last_seen = ?, status = 'active'
      WHERE id = ?
    `).run(wallet, name || null, now, nodeId);
  }
}

function saveBrowserNodeStats(nodeId, node) {
  const now = Date.now();
  
  // Update node record
  db.prepare(`
    UPDATE nodes SET 
      last_seen = ?,
      total_requests = ?,
      total_hits = ?,
      total_bytes_saved = ?
    WHERE id = ?
  `).run(now, node.stats.requests, node.stats.hits, node.stats.bytesSaved, nodeId);
  
  // Store metrics report
  db.prepare(`
    INSERT INTO metrics_reports (node_id, timestamp, requests, hits, misses, hit_rate, bytes_saved, uptime)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nodeId,
    now,
    node.stats.requests,
    node.stats.hits,
    node.stats.misses,
    node.stats.requests > 0 ? (node.stats.hits / node.stats.requests * 100) : 0,
    node.stats.bytesSaved,
    Math.floor((now - node.stats.connected) / 1000)
  );
  
  // Update epoch work
  const workScore = node.stats.hits + (node.stats.bytesSaved * 0.000001);
  if (workScore > 0) {
    const epoch = getCurrentEpoch();
    db.prepare(`
      UPDATE epochs SET total_work = total_work + ? WHERE id = ?
    `).run(workScore * TIER_MULTIPLIERS.browser, epoch.id);
  }
}

function handleCacheResult(nodeId, message) {
  // Handle cache result from browser node
  // This would be used in a full implementation where coordinator routes requests
  console.log(`[WS] Cache result from ${nodeId}: ${message.requestId}`);
}

// Broadcast to all browser nodes
function broadcastToBrowserNodes(message) {
  const data = JSON.stringify(message);
  browserNodes.forEach((node, nodeId) => {
    if (node.ws.readyState === WebSocket.OPEN) {
      node.ws.send(data);
    }
  });
}

// =============================================================================
// PROVIDER REGISTRATION (Off-chain workaround)
// =============================================================================

// Register as a provider (off-chain - workaround for broken on-chain registration)
// Providers sign a message to prove wallet ownership
app.post('/api/providers/register', (req, res) => {
  const { wallet, endpoint, name, signature, message } = req.body;
  
  if (!wallet || !endpoint) {
    return res.status(400).json({ error: 'Missing wallet or endpoint' });
  }
  
  // Validate endpoint format
  if (endpoint.length < 10 || endpoint.length > 256) {
    return res.status(400).json({ error: 'Endpoint must be 10-256 characters' });
  }
  
  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://') && 
      !endpoint.startsWith('ws://') && !endpoint.startsWith('wss://')) {
    return res.status(400).json({ error: 'Endpoint must start with http://, https://, ws://, or wss://' });
  }
  
  // TODO: Verify signature in production
  // For now, we trust the wallet address
  // In production: verify that `signature` is a valid signature of `message` by `wallet`
  
  const now = Date.now();
  const providerId = `provider-${wallet.slice(0, 8)}-${now}`;
  
  // Check if already registered
  const existing = db.prepare('SELECT * FROM nodes WHERE wallet = ? AND node_type = ?').get(wallet, 'server');
  
  if (existing) {
    // Update existing registration
    db.prepare(`
      UPDATE nodes SET 
        endpoint = ?,
        name = ?,
        last_seen = ?,
        status = 'active'
      WHERE id = ?
    `).run(endpoint, name || null, now, existing.id);
    
    console.log(`[Provider] Updated registration: ${wallet} -> ${endpoint}`);
    
    return res.json({
      success: true,
      message: 'Provider registration updated',
      provider: {
        id: existing.id,
        wallet,
        endpoint,
        name: name || null,
        tier: 1,
        multiplier: TIER_MULTIPLIERS.server,
        registeredAt: existing.first_seen,
        updatedAt: now
      }
    });
  }
  
  // New registration
  db.prepare(`
    INSERT INTO nodes (id, wallet, name, endpoint, node_type, tier, first_seen, last_seen, status)
    VALUES (?, ?, ?, ?, 'server', 1, ?, ?, 'active')
  `).run(providerId, wallet, name || null, endpoint, now, now);
  
  console.log(`[Provider] New registration: ${wallet} -> ${endpoint}`);
  
  res.json({
    success: true,
    message: 'Provider registered successfully (off-chain)',
    provider: {
      id: providerId,
      wallet,
      endpoint,
      name: name || null,
      tier: 1,
      multiplier: TIER_MULTIPLIERS.server,
      registeredAt: now,
      note: 'This is an off-chain registration. On-chain registration will be available after contract fix.'
    }
  });
});

// Get provider by wallet
app.get('/api/providers/:wallet', (req, res) => {
  const provider = db.prepare(`
    SELECT * FROM nodes 
    WHERE wallet = ? AND node_type = 'server'
  `).get(req.params.wallet);
  
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found', registered: false });
  }
  
  const now = Date.now();
  const isOnline = (now - provider.last_seen) < 120000;
  
  res.json({
    registered: true,
    provider: {
      ...provider,
      online: isOnline,
      hitRate: provider.total_requests > 0 
        ? ((provider.total_hits / provider.total_requests) * 100).toFixed(2)
        : 0,
      tierMultiplier: TIER_MULTIPLIERS.server
    }
  });
});

// Get all registered providers
app.get('/api/providers', (req, res) => {
  const providers = db.prepare(`
    SELECT * FROM nodes 
    WHERE node_type = 'server' AND status = 'active'
    ORDER BY total_hits DESC
  `).all();
  
  const now = Date.now();
  const enrichedProviders = providers.map(p => ({
    ...p,
    online: (now - p.last_seen) < 120000,
    hitRate: p.total_requests > 0 
      ? ((p.total_hits / p.total_requests) * 100).toFixed(2)
      : 0,
    tierMultiplier: TIER_MULTIPLIERS.server
  }));
  
  res.json({ 
    providers: enrichedProviders,
    total: enrichedProviders.length,
    online: enrichedProviders.filter(p => p.online).length
  });
});

// =============================================================================
// HYBRID PAYMENT SYSTEM
// =============================================================================

// Query cost in lamports (0.00001 SOL = 10,000 lamports)
const QUERY_COST_LAMPORTS = parseInt(process.env.QUERY_COST_LAMPORTS || '10000');
const FREE_TIER_QUERIES = parseInt(process.env.FREE_TIER_QUERIES || '1000');
const SETTLEMENT_INTERVAL_MS = parseInt(process.env.SETTLEMENT_INTERVAL_MS || '3600000'); // 1 hour

// Generate API key
function generateApiKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'whtt_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// Get or create user credit account
app.post('/api/credits/account', (req, res) => {
  const { wallet } = req.body;
  
  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address required' });
  }
  
  const now = Date.now();
  let account = db.prepare('SELECT * FROM user_credits WHERE wallet = ?').get(wallet);
  
  if (!account) {
    const apiKey = generateApiKey();
    db.prepare(`
      INSERT INTO user_credits (wallet, balance_lamports, created_at, api_key, tier, rate_limit)
      VALUES (?, ?, ?, ?, 'free', 100)
    `).run(wallet, FREE_TIER_QUERIES * QUERY_COST_LAMPORTS, now, apiKey);
    
    account = db.prepare('SELECT * FROM user_credits WHERE wallet = ?').get(wallet);
    console.log(`[Credits] New account created: ${wallet}`);
  }
  
  res.json({
    wallet: account.wallet,
    balance: {
      lamports: account.balance_lamports,
      sol: account.balance_lamports / 1e9,
      queries: Math.floor(account.balance_lamports / QUERY_COST_LAMPORTS)
    },
    stats: {
      totalDeposited: account.total_deposited,
      totalSpent: account.total_spent,
      queriesMade: account.queries_made
    },
    apiKey: account.api_key,
    tier: account.tier,
    rateLimit: account.rate_limit,
    createdAt: account.created_at
  });
});

// Record a deposit (called after verifying on-chain transaction)
app.post('/api/credits/deposit', async (req, res) => {
  const { wallet, amountLamports, txSignature } = req.body;
  
  if (!wallet || !amountLamports || !txSignature) {
    return res.status(400).json({ error: 'Missing wallet, amountLamports, or txSignature' });
  }
  
  // Check if already processed
  const existing = db.prepare('SELECT * FROM deposits WHERE tx_signature = ?').get(txSignature);
  if (existing) {
    return res.status(400).json({ error: 'Deposit already processed' });
  }
  
  const now = Date.now();
  
  // TODO: In production, verify the transaction on-chain
  // const connection = new Connection(SOLANA_RPC);
  // const tx = await connection.getTransaction(txSignature);
  // Verify: tx.meta.postBalances, tx.transaction.message.accountKeys, etc.
  
  // Record deposit
  db.prepare(`
    INSERT INTO deposits (wallet, amount_lamports, tx_signature, confirmed, created_at)
    VALUES (?, ?, ?, 1, ?)
  `).run(wallet, amountLamports, txSignature, now);
  
  // Update user balance
  db.prepare(`
    UPDATE user_credits 
    SET balance_lamports = balance_lamports + ?,
        total_deposited = total_deposited + ?
    WHERE wallet = ?
  `).run(amountLamports, amountLamports, wallet);
  
  // Get updated account
  const account = db.prepare('SELECT * FROM user_credits WHERE wallet = ?').get(wallet);
  
  console.log(`[Credits] Deposit recorded: ${wallet} +${amountLamports} lamports (${amountLamports / 1e9} SOL)`);
  
  res.json({
    success: true,
    deposit: {
      wallet,
      amount: amountLamports,
      txSignature
    },
    newBalance: {
      lamports: account.balance_lamports,
      sol: account.balance_lamports / 1e9,
      queries: Math.floor(account.balance_lamports / QUERY_COST_LAMPORTS)
    }
  });
});

// Use credits for a query (called by RPC gateway)
app.post('/api/credits/use', (req, res) => {
  const { wallet, apiKey, method, providerWallet } = req.body;
  
  // Authenticate by wallet or API key
  let account;
  if (apiKey) {
    account = db.prepare('SELECT * FROM user_credits WHERE api_key = ?').get(apiKey);
  } else if (wallet) {
    account = db.prepare('SELECT * FROM user_credits WHERE wallet = ?').get(wallet);
  }
  
  if (!account) {
    return res.status(401).json({ error: 'Invalid credentials', allowed: false });
  }
  
  // Check balance
  if (account.balance_lamports < QUERY_COST_LAMPORTS) {
    return res.status(402).json({ 
      error: 'Insufficient credits', 
      allowed: false,
      balance: account.balance_lamports,
      required: QUERY_COST_LAMPORTS
    });
  }
  
  const now = Date.now();
  
  // Deduct credits
  db.prepare(`
    UPDATE user_credits 
    SET balance_lamports = balance_lamports - ?,
        total_spent = total_spent + ?,
        queries_made = queries_made + 1,
        last_query_at = ?
    WHERE wallet = ?
  `).run(QUERY_COST_LAMPORTS, QUERY_COST_LAMPORTS, now, account.wallet);
  
  // Record usage for settlement
  db.prepare(`
    INSERT INTO query_usage (wallet, provider_wallet, method, cost_lamports, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(account.wallet, providerWallet || null, method || 'unknown', QUERY_COST_LAMPORTS, now);
  
  res.json({
    allowed: true,
    cost: QUERY_COST_LAMPORTS,
    remainingBalance: account.balance_lamports - QUERY_COST_LAMPORTS,
    remainingQueries: Math.floor((account.balance_lamports - QUERY_COST_LAMPORTS) / QUERY_COST_LAMPORTS)
  });
});

// Get usage history
app.get('/api/credits/:wallet/usage', (req, res) => {
  const { limit = 100, offset = 0 } = req.query;
  
  const usage = db.prepare(`
    SELECT * FROM query_usage 
    WHERE wallet = ? 
    ORDER BY timestamp DESC 
    LIMIT ? OFFSET ?
  `).all(req.params.wallet, parseInt(limit), parseInt(offset));
  
  const total = db.prepare('SELECT COUNT(*) as count FROM query_usage WHERE wallet = ?').get(req.params.wallet);
  
  res.json({
    usage,
    total: total.count,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
});

// =============================================================================
// PAYMENT INFO - How payments work
// =============================================================================

// Get payment info (explains how the system works)
app.get('/api/credits/payment-info', (req, res) => {
  res.json({
    paymentMethod: 'ProcessQueryPayment',
    description: 'Pay SOL on-chain for RPC queries. Providers earn 70%!',
    howItWorks: [
      '1. User selects query package and provider',
      '2. User pays SOL via ProcessQueryPayment instruction',
      '3. On-chain distribution: 70% provider, 20% bonus pool, 5% treasury, 5% stakers',
      '4. Provider can claim earnings via ClaimProviderEarnings',
      '5. Top providers also earn from the bonus pool'
    ],
    distribution: {
      provider: '70%',
      bonusPool: '20%',
      treasury: '5%',
      stakers: '5%'
    },
    paymentVault: 'CU1ZcHccCbQT8iA6pcb3ZyTjog8ckmDHH8gaAmKfC73G',
    queryCost: QUERY_COST_LAMPORTS / 1e9,
    note: 'Real on-chain payments. Providers/validators earn 70% of all query payments!'
  });
});

// Record on-chain payment (called after successful ProcessQueryPayment tx)
app.post('/api/credits/record-payment', (req, res) => {
  const { wallet, provider, queriesAdded, amountLamports, txSignature } = req.body;
  
  if (!wallet || !provider || !queriesAdded || !amountLamports || !txSignature) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const now = Date.now();
  
  try {
    // Get or create user account
    let account = db.prepare('SELECT * FROM user_credits WHERE wallet = ?').get(wallet);
    
    if (!account) {
      const apiKey = `wh_${uuidv4().replace(/-/g, '').substring(0, 24)}`;
      db.prepare(`
        INSERT INTO user_credits (wallet, balance_lamports, total_deposited, total_spent, queries_made, api_key, created_at, last_query_at)
        VALUES (?, 0, 0, 0, 0, ?, ?, ?)
      `).run(wallet, apiKey, now, now);
      account = db.prepare('SELECT * FROM user_credits WHERE wallet = ?').get(wallet);
    }
    
    // Record the on-chain payment
    db.prepare(`
      INSERT INTO deposits (wallet, amount_lamports, tx_signature, status, created_at)
      VALUES (?, ?, ?, 'confirmed', ?)
    `).run(wallet, amountLamports, txSignature, now);
    
    // Update user stats (queries added, but balance stays 0 since it's on-chain)
    db.prepare(`
      UPDATE user_credits 
      SET queries_made = queries_made + ?,
          total_deposited = total_deposited + ?,
          last_query_at = ?
      WHERE wallet = ?
    `).run(queriesAdded, amountLamports, now, wallet);
    
    // Record in query usage for provider tracking
    db.prepare(`
      INSERT INTO query_usage (wallet, provider_wallet, method, cost_lamports, timestamp)
      VALUES (?, ?, 'batch_payment', ?, ?)
    `).run(wallet, provider, amountLamports, now);
    
    console.log(`[Payment] Recorded on-chain payment: ${wallet} paid ${amountLamports} lamports to ${provider} for ${queriesAdded} queries. TX: ${txSignature}`);
    
    res.json({
      success: true,
      message: `Payment recorded. ${queriesAdded} queries added.`,
      txSignature,
      provider,
      amountLamports,
      providerEarnings: Math.floor(amountLamports * 0.7) // 70% to provider
    });
  } catch (err) {
    console.error('[Payment] Error recording payment:', err);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Admin: Trigger batch settlement (settles usage to on-chain)
app.post('/api/admin/settle', async (req, res) => {
  const { adminKey } = req.body;
  
  // Simple admin auth (in production, use proper auth)
  if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'whistle-admin-2024') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const now = Date.now();
  const lastSettlement = db.prepare(`
    SELECT MAX(batch_end) as last_end FROM settlements WHERE status = 'completed'
  `).get();
  
  const batchStart = lastSettlement?.last_end || 0;
  const batchEnd = now;
  
  // Get all usage since last settlement
  const usage = db.prepare(`
    SELECT 
      provider_wallet,
      COUNT(*) as query_count,
      SUM(cost_lamports) as total_cost
    FROM query_usage 
    WHERE timestamp > ? AND timestamp <= ? AND provider_wallet IS NOT NULL
    GROUP BY provider_wallet
  `).all(batchStart, batchEnd);
  
  if (usage.length === 0) {
    return res.json({ message: 'No usage to settle', queriesSettled: 0 });
  }
  
  const totalQueries = usage.reduce((sum, u) => sum + u.query_count, 0);
  const totalLamports = usage.reduce((sum, u) => sum + u.total_cost, 0);
  
  // Create settlement record
  const settlement = db.prepare(`
    INSERT INTO settlements (batch_start, batch_end, total_queries, total_lamports, provider_earnings, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)
  `).run(batchStart, batchEnd, totalQueries, totalLamports, JSON.stringify(usage), now);
  
  console.log(`[Settlement] Created batch: ${totalQueries} queries, ${totalLamports} lamports`);
  
  // TODO: In production, call ProcessQueryPayment on-chain for each provider
  // This would require the authority keypair to sign transactions
  
  // For now, mark as completed (manual on-chain settlement)
  db.prepare(`UPDATE settlements SET status = 'pending_onchain' WHERE id = ?`).run(settlement.lastInsertRowid);
  
  res.json({
    success: true,
    settlement: {
      id: settlement.lastInsertRowid,
      batchStart,
      batchEnd,
      totalQueries,
      totalLamports,
      totalSol: totalLamports / 1e9,
      providerBreakdown: usage,
      status: 'pending_onchain',
      note: 'Settlement recorded. On-chain payment pending admin action.'
    }
  });
});

// Get settlement history
app.get('/api/admin/settlements', (req, res) => {
  const settlements = db.prepare(`
    SELECT * FROM settlements ORDER BY created_at DESC LIMIT 50
  `).all();
  
  res.json({
    settlements: settlements.map(s => ({
      ...s,
      provider_earnings: JSON.parse(s.provider_earnings || '[]')
    }))
  });
});

// Get payment system stats
app.get('/api/credits/stats', (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM user_credits').get();
  const totalDeposited = db.prepare('SELECT SUM(total_deposited) as sum FROM user_credits').get();
  const totalSpent = db.prepare('SELECT SUM(total_spent) as sum FROM user_credits').get();
  const totalQueries = db.prepare('SELECT SUM(queries_made) as sum FROM user_credits').get();
  const activeUsers = db.prepare(`
    SELECT COUNT(*) as count FROM user_credits 
    WHERE last_query_at > ?
  `).get(Date.now() - 86400000); // Active in last 24h
  
  res.json({
    users: {
      total: totalUsers.count,
      active24h: activeUsers.count
    },
    volume: {
      totalDeposited: totalDeposited.sum || 0,
      totalSpent: totalSpent.sum || 0,
      totalQueries: totalQueries.sum || 0
    },
    pricing: {
      queryCostLamports: QUERY_COST_LAMPORTS,
      queryCostSol: QUERY_COST_LAMPORTS / 1e9,
      freeQueries: FREE_TIER_QUERIES
    }
  });
});

// Get credit balance by wallet (MUST be after all specific /api/credits/* routes)
app.get('/api/credits/:wallet', (req, res) => {
  // Skip if it looks like a specific route that wasn't matched
  const wallet = req.params.wallet;
  if (['packages', 'stats', 'deposit-info'].includes(wallet)) {
    return res.status(404).json({ error: 'Route not found' });
  }
  
  const account = db.prepare('SELECT * FROM user_credits WHERE wallet = ?').get(wallet);
  
  if (!account) {
    return res.status(404).json({ error: 'Account not found. Create one first.' });
  }
  
  res.json({
    wallet: account.wallet,
    balance: {
      lamports: account.balance_lamports,
      sol: account.balance_lamports / 1e9,
      queries: Math.floor(account.balance_lamports / QUERY_COST_LAMPORTS)
    },
    stats: {
      totalDeposited: account.total_deposited,
      totalSpent: account.total_spent,
      queriesMade: account.queries_made
    },
    tier: account.tier,
    rateLimit: account.rate_limit
  });
});

// =============================================================================
// NODE MANAGEMENT
// =============================================================================

// Get all active nodes
app.get('/api/nodes', (req, res) => {
  const nodes = db.prepare(`
    SELECT * FROM nodes 
    WHERE status = 'active' 
    ORDER BY last_seen DESC
  `).all();
  
  const now = Date.now();
  const enrichedNodes = nodes.map(node => {
    const isOnline = node.node_type === 'browser' 
      ? browserNodes.has(node.id)
      : (now - node.last_seen) < 120000;
    
    return {
      ...node,
      online: isOnline,
      hitRate: node.total_requests > 0 
        ? ((node.total_hits / node.total_requests) * 100).toFixed(2)
        : 0,
      tierMultiplier: node.node_type === 'server' ? TIER_MULTIPLIERS.server : TIER_MULTIPLIERS.browser
    };
  });
  
  res.json({ nodes: enrichedNodes });
});

// Get specific node
app.get('/api/nodes/:nodeId', (req, res) => {
  const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(req.params.nodeId);
  
  if (!node) {
    return res.status(404).json({ error: 'Node not found' });
  }
  
  const recentMetrics = db.prepare(`
    SELECT * FROM metrics_reports 
    WHERE node_id = ? 
    ORDER BY timestamp DESC 
    LIMIT 100
  `).all(req.params.nodeId);
  
  res.json({ node, recentMetrics });
});

// Receive metrics report from a server node
app.post('/api/nodes/report', (req, res) => {
  const {
    nodeId,
    providerWallet,
    totalRequests,
    cacheHits,
    cacheMisses,
    hitRate,
    avgCacheLatencyMs,
    avgUpstreamLatencyMs,
    bytesSaved,
    bytesServed,
    uptime,
    timestamp
  } = req.body;
  
  if (!nodeId || !providerWallet) {
    return res.status(400).json({ error: 'Missing nodeId or providerWallet' });
  }
  
  const now = Date.now();
  
  // Upsert node (server type)
  const existingNode = db.prepare('SELECT * FROM nodes WHERE id = ?').get(nodeId);
  
  if (existingNode) {
    // Calculate deltas
    const deltaRequests = Math.max(0, totalRequests - (existingNode.total_requests || 0));
    const deltaHits = Math.max(0, cacheHits - (existingNode.total_hits || 0));
    const deltaBytes = Math.max(0, bytesSaved - (existingNode.total_bytes_saved || 0));
    
    db.prepare(`
      UPDATE nodes SET 
        last_seen = ?,
        total_requests = ?,
        total_hits = ?,
        total_bytes_saved = ?,
        uptime_samples = uptime_samples + 1,
        online_samples = online_samples + 1
      WHERE id = ?
    `).run(now, totalRequests, cacheHits, bytesSaved, nodeId);
    
    // Update epoch work with tier multiplier
    const workScore = deltaHits + (deltaBytes * 0.000001);
    if (workScore > 0) {
      const epoch = getCurrentEpoch();
      db.prepare(`
        UPDATE epochs SET total_work = total_work + ? WHERE id = ?
      `).run(workScore * TIER_MULTIPLIERS.server, epoch.id);
    }
  } else {
    db.prepare(`
      INSERT INTO nodes (id, wallet, node_type, tier, first_seen, last_seen, total_requests, total_hits, total_bytes_saved, uptime_samples, online_samples)
      VALUES (?, ?, 'server', 1, ?, ?, ?, ?, ?, 1, 1)
    `).run(nodeId, providerWallet, now, now, totalRequests, cacheHits, bytesSaved);
  }
  
  // Store metrics report
  db.prepare(`
    INSERT INTO metrics_reports (node_id, timestamp, requests, hits, misses, hit_rate, avg_cache_latency, avg_upstream_latency, bytes_saved, uptime)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nodeId,
    timestamp || now,
    totalRequests,
    cacheHits,
    cacheMisses,
    hitRate,
    avgCacheLatencyMs,
    avgUpstreamLatencyMs,
    bytesSaved,
    uptime
  );
  
  res.json({ 
    success: true, 
    message: 'Metrics recorded',
    nodeId,
    tier: 1,
    multiplier: TIER_MULTIPLIERS.server
  });
});

// =============================================================================
// REWARD SYSTEM
// =============================================================================

function getCurrentEpoch() {
  const EPOCH_DURATION = 3600000; // 1 hour
  
  let epoch = db.prepare(`
    SELECT * FROM epochs WHERE status = 'active' ORDER BY id DESC LIMIT 1
  `).get();
  
  if (!epoch) {
    const now = Date.now();
    db.prepare(`INSERT INTO epochs (start_time, status) VALUES (?, 'active')`).run(now);
    epoch = db.prepare(`SELECT * FROM epochs WHERE status = 'active'`).get();
  }
  
  const now = Date.now();
  if (now - epoch.start_time > EPOCH_DURATION) {
    db.prepare(`UPDATE epochs SET end_time = ?, status = 'completed' WHERE id = ?`).run(now, epoch.id);
    calculateEpochRewards(epoch.id);
    db.prepare(`INSERT INTO epochs (start_time, status) VALUES (?, 'active')`).run(now);
    epoch = db.prepare(`SELECT * FROM epochs WHERE status = 'active'`).get();
  }
  
  return epoch;
}

function calculateEpochRewards(epochId) {
  const epoch = db.prepare('SELECT * FROM epochs WHERE id = ?').get(epochId);
  if (!epoch || epoch.total_work === 0) return;
  
  // Get all metrics from this epoch grouped by node
  const nodeMetrics = db.prepare(`
    SELECT 
      mr.node_id,
      n.wallet,
      n.node_type,
      n.tier,
      n.uptime_samples,
      n.online_samples,
      SUM(mr.hits) as total_hits,
      SUM(mr.bytes_saved) as total_bytes_saved
    FROM metrics_reports mr
    JOIN nodes n ON mr.node_id = n.id
    WHERE mr.timestamp >= ? AND mr.timestamp <= ?
    GROUP BY mr.node_id
  `).all(epoch.start_time, epoch.end_time);
  
  for (const nm of nodeMetrics) {
    // Calculate base work score
    const workScore = (nm.total_hits || 0) + ((nm.total_bytes_saved || 0) * 0.000001);
    
    // Get tier multiplier
    const tierMultiplier = nm.node_type === 'server' ? TIER_MULTIPLIERS.server : TIER_MULTIPLIERS.browser;
    
    // Calculate uptime bonus
    let uptimeBonus = 1.0;
    if (nm.uptime_samples > 0) {
      const uptimePercent = (nm.online_samples / nm.uptime_samples) * 100;
      if (uptimePercent >= 99) uptimeBonus = UPTIME_BONUSES[99];
      else if (uptimePercent >= 95) uptimeBonus = UPTIME_BONUSES[95];
    }
    
    // Calculate final reward
    const adjustedWork = workScore * tierMultiplier * uptimeBonus;
    const rewardShare = adjustedWork / epoch.total_work;
    const rewardAmount = REWARD_POOL_PER_HOUR * rewardShare;
    
    // Store reward
    db.prepare(`
      INSERT INTO rewards (epoch, node_id, wallet, node_type, work_score, tier_multiplier, uptime_bonus, reward_amount, calculated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(epochId, nm.node_id, nm.wallet, nm.node_type, workScore, tierMultiplier, uptimeBonus, rewardAmount, Date.now());
  }
  
  db.prepare(`UPDATE epochs SET total_rewards = ? WHERE id = ?`).run(REWARD_POOL_PER_HOUR, epochId);
  
  console.log(`[Rewards] Epoch ${epochId} completed. Distributed ${REWARD_POOL_PER_HOUR} tokens to ${nodeMetrics.length} nodes.`);
}

// Get rewards for a wallet
app.get('/api/rewards/:wallet', (req, res) => {
  const rewards = db.prepare(`
    SELECT * FROM rewards WHERE wallet = ? ORDER BY calculated_at DESC
  `).all(req.params.wallet);
  
  const totalEarned = rewards.reduce((sum, r) => sum + r.reward_amount, 0);
  const totalClaimed = rewards.filter(r => r.claimed).reduce((sum, r) => sum + r.reward_amount, 0);
  const pendingRewards = totalEarned - totalClaimed;
  
  // Get breakdown by node type
  const serverRewards = rewards.filter(r => r.node_type === 'server').reduce((sum, r) => sum + r.reward_amount, 0);
  const browserRewards = rewards.filter(r => r.node_type === 'browser').reduce((sum, r) => sum + r.reward_amount, 0);
  
  res.json({
    wallet: req.params.wallet,
    totalEarned,
    totalClaimed,
    pendingRewards,
    breakdown: {
      server: serverRewards,
      browser: browserRewards
    },
    rewards
  });
});

// Get leaderboard (off-chain)
app.get('/api/leaderboard', (req, res) => {
  const leaderboard = db.prepare(`
    SELECT 
      wallet,
      SUM(reward_amount) as total_rewards,
      COUNT(DISTINCT node_id) as node_count,
      SUM(work_score) as total_work,
      MAX(node_type) as primary_type
    FROM rewards
    GROUP BY wallet
    ORDER BY total_rewards DESC
    LIMIT 50
  `).all();
  
  res.json({ leaderboard });
});

// Get on-chain provider leaderboard
app.get('/api/leaderboard/onchain', async (req, res) => {
  try {
    const providers = await fetchOnChainProviders();
    res.json({ 
      providers,
      source: 'on-chain',
      contract: 'whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// NETWORK STATS
// =============================================================================

app.get('/api/stats', (req, res) => {
  const epoch = getCurrentEpoch();
  
  const totalNodes = db.prepare('SELECT COUNT(*) as count FROM nodes').get().count;
  
  // Count active server nodes (seen in last 2 minutes)
  const activeServerNodes = db.prepare(`
    SELECT COUNT(*) as count FROM nodes 
    WHERE node_type = 'server' AND last_seen > ?
  `).get(Date.now() - 120000).count;
  
  // Count active browser nodes (currently connected)
  const activeBrowserNodes = browserNodes.size;
  
  const totalStats = db.prepare(`
    SELECT 
      SUM(total_requests) as requests,
      SUM(total_hits) as hits,
      SUM(total_bytes_saved) as bytes_saved
    FROM nodes
  `).get();
  
  const recentMetrics = db.prepare(`
    SELECT 
      SUM(requests) as requests,
      SUM(hits) as hits,
      AVG(hit_rate) as avg_hit_rate,
      AVG(avg_cache_latency) as avg_latency
    FROM metrics_reports
    WHERE timestamp > ?
  `).get(Date.now() - 3600000);
  
  // Node type breakdown
  const nodeBreakdown = db.prepare(`
    SELECT node_type, COUNT(*) as count FROM nodes GROUP BY node_type
  `).all();
  
  res.json({
    network: {
      totalNodes,
      activeNodes: activeServerNodes + activeBrowserNodes,
      serverNodes: activeServerNodes,
      browserNodes: activeBrowserNodes,
      totalRequests: totalStats?.requests || 0,
      totalHits: totalStats?.hits || 0,
      totalBytesSaved: totalStats?.bytes_saved || 0,
      hitRate: totalStats?.requests > 0 
        ? ((totalStats.hits / totalStats.requests) * 100).toFixed(2)
        : 0
    },
    currentEpoch: {
      id: epoch.id,
      startTime: epoch.start_time,
      totalWork: epoch.total_work,
      rewardPool: REWARD_POOL_PER_HOUR
    },
    lastHour: {
      requests: recentMetrics?.requests || 0,
      hits: recentMetrics?.hits || 0,
      avgHitRate: recentMetrics?.avg_hit_rate?.toFixed(2) || 0,
      avgLatencyMs: recentMetrics?.avg_latency?.toFixed(2) || 0
    },
    tiers: {
      server: { multiplier: TIER_MULTIPLIERS.server, label: 'Tier 1 - Server' },
      browser: { multiplier: TIER_MULTIPLIERS.browser, label: 'Tier 2 - Browser' }
    },
    nodeBreakdown
  });
});

// =============================================================================
// HEALTH & INFO
// =============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'whistle-coordinator',
    connectedBrowserNodes: browserNodes.size,
    timestamp: Date.now()
  });
});

app.get('/api/info', (req, res) => {
  res.json({
    name: 'WHISTLE Coordinator',
    version: '1.1.0',
    rewardPoolPerHour: REWARD_POOL_PER_HOUR,
    tiers: {
      server: { tier: 1, multiplier: TIER_MULTIPLIERS.server, description: '24/7 server nodes' },
      browser: { tier: 2, multiplier: TIER_MULTIPLIERS.browser, description: 'Browser-based casual nodes' }
    },
    uptimeBonuses: UPTIME_BONUSES,
    endpoints: [
      'GET  /health',
      'GET  /api/stats',
      'GET  /api/nodes',
      'GET  /api/nodes/:nodeId',
      'POST /api/nodes/report',
      'GET  /api/rewards/:wallet',
      'GET  /api/leaderboard',
      'WS   /ws (browser nodes)'
    ]
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// =============================================================================
// ON-CHAIN INTEGRATION (WHTT Contract)
// =============================================================================

let authorityKeypair = null;
let solanaConnection = null;

async function initializeOnChainIntegration() {
  if (!ENABLE_ONCHAIN_REWARDS) {
    console.log('[OnChain] Reward distribution disabled (set ENABLE_ONCHAIN_REWARDS=true to enable)');
    return;
  }
  
  try {
    const { Connection, Keypair } = await import('@solana/web3.js');
    const fs = await import('fs');
    
    if (!AUTHORITY_KEYPAIR || !fs.existsSync(AUTHORITY_KEYPAIR)) {
      console.error('[OnChain] Authority keypair not found:', AUTHORITY_KEYPAIR);
      return;
    }
    
    const keypairData = JSON.parse(fs.readFileSync(AUTHORITY_KEYPAIR, 'utf-8'));
    authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
    solanaConnection = new Connection(SOLANA_RPC, 'confirmed');
    
    console.log('[OnChain] Initialized with authority:', authorityKeypair.publicKey.toBase58());
    
    // Start periodic reward distribution (every hour)
    setInterval(distributeOnChainRewards, 3600000);
    
  } catch (error) {
    console.error('[OnChain] Failed to initialize:', error.message);
  }
}

// Fetch all registered providers from on-chain
async function fetchOnChainProviders() {
  try {
    const { Connection, PublicKey } = await import('@solana/web3.js');
    
    const connection = solanaConnection || new Connection(SOLANA_RPC, 'confirmed');
    const WHISTLE_PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr');
    
    // Fetch all program accounts (providers have ~256 byte accounts)
    const accounts = await connection.getProgramAccounts(WHISTLE_PROGRAM_ID, {
      filters: [
        { dataSize: 256 } // ProviderAccount approximate size
      ]
    });
    
    const providers = [];
    
    for (const { pubkey, account } of accounts) {
      try {
        const data = account.data;
        const provider = new PublicKey(data.slice(0, 32));
        
        // Parse endpoint string
        const endpointLen = data.readUInt32LE(32);
        const endpoint = new TextDecoder().decode(data.slice(36, 36 + endpointLen));
        
        let offset = 36 + endpointLen;
        
        const registeredAt = Number(data.readBigInt64LE(offset));
        const isActive = data.readUInt8(offset + 8) === 1;
        const stakeBond = Number(data.readBigUInt64LE(offset + 9));
        const totalEarned = Number(data.readBigUInt64LE(offset + 17));
        const pendingEarnings = Number(data.readBigUInt64LE(offset + 25));
        const queriesServed = Number(data.readBigUInt64LE(offset + 33));
        const reputationScore = Number(data.readBigUInt64LE(offset + 41));
        const uptimePercentage = Number(data.readBigUInt64LE(offset + 49));
        const responseTimeAvg = Number(data.readBigUInt64LE(offset + 57));
        const accuracyScore = Number(data.readBigUInt64LE(offset + 65));
        const lastHeartbeat = Number(data.readBigInt64LE(offset + 73));
        
        // Check if heartbeat is recent (within 5 minutes)
        const now = Math.floor(Date.now() / 1000);
        const isOnline = (now - lastHeartbeat) < 300;
        
        providers.push({
          address: provider.toBase58(),
          endpoint,
          registeredAt,
          isActive,
          isOnline,
          stakeBond: stakeBond / 1e6, // Convert to WHISTLE
          totalEarned: totalEarned / 1e9, // Convert to SOL
          pendingEarnings: pendingEarnings / 1e9,
          queriesServed,
          reputationScore,
          uptimePercentage,
          responseTimeAvg,
          accuracyScore,
          lastHeartbeat,
          lastHeartbeatAgo: now - lastHeartbeat
        });
        
      } catch (e) {
        // Skip malformed accounts
      }
    }
    
    // Sort by queries served (descending)
    providers.sort((a, b) => b.queriesServed - a.queriesServed);
    
    return providers;
    
  } catch (error) {
    console.error('[OnChain] Failed to fetch providers:', error.message);
    throw error;
  }
}

// Distribute rewards on-chain (calls DistributeStakerRewards)
async function distributeOnChainRewards() {
  if (!authorityKeypair || !solanaConnection) {
    console.log('[OnChain] Skipping reward distribution (not initialized)');
    return;
  }
  
  try {
    const { PublicKey, Transaction, TransactionInstruction, SystemProgram } = await import('@solana/web3.js');
    
    const WHISTLE_PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr');
    const AUTHORITY_ADDRESS = new PublicKey('6BNdVMgx2JZJPvkRCLyV2LLxft4S1cwuqoX2BS9eFyvh');
    const PAYMENT_VAULT_ADDRESS = new PublicKey('CU1ZcHccCbQT8iA6pcb3ZyTjog8ckmDHH8gaAmKfC73G');
    
    // Derive staking pool PDA
    const [stakingPoolPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('staking_pool'), AUTHORITY_ADDRESS.toBuffer()],
      WHISTLE_PROGRAM_ID
    );
    
    // DistributeStakerRewards instruction (discriminator = 19)
    const instructionData = Buffer.from([19]);
    
    const distributeIx = new TransactionInstruction({
      programId: WHISTLE_PROGRAM_ID,
      keys: [
        { pubkey: authorityKeypair.publicKey, isSigner: true, isWritable: false },
        { pubkey: PAYMENT_VAULT_ADDRESS, isSigner: false, isWritable: true },
        { pubkey: stakingPoolPDA, isSigner: false, isWritable: false },
      ],
      data: instructionData,
    });
    
    const transaction = new Transaction().add(distributeIx);
    transaction.recentBlockhash = (await solanaConnection.getLatestBlockhash()).blockhash;
    transaction.feePayer = authorityKeypair.publicKey;
    
    transaction.sign(authorityKeypair);
    const signature = await solanaConnection.sendRawTransaction(transaction.serialize());
    
    await solanaConnection.confirmTransaction(signature, 'confirmed');
    
    console.log('[OnChain] Distributed staker rewards:', signature);
    
    // Record in database
    db.prepare(`
      INSERT INTO reward_distributions (timestamp, tx_signature, status)
      VALUES (?, ?, 'success')
    `).run(Date.now(), signature);
    
  } catch (error) {
    console.error('[OnChain] Failed to distribute rewards:', error.message);
    
    db.prepare(`
      INSERT INTO reward_distributions (timestamp, tx_signature, status, error)
      VALUES (?, ?, 'failed', ?)
    `).run(Date.now(), '', error.message);
  }
}

// Add reward_distributions table
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reward_distributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      tx_signature TEXT,
      status TEXT DEFAULT 'pending',
      error TEXT
    );
  `);
} catch (e) {
  // Table might already exist
}

// =============================================================================
// CLEANUP & MAINTENANCE
// =============================================================================

// Clean old metrics
setInterval(() => {
  const cutoff = Date.now() - (7 * 24 * 3600000);
  db.prepare('DELETE FROM metrics_reports WHERE timestamp < ?').run(cutoff);
}, 3600000);

// Check epoch transitions
setInterval(() => {
  getCurrentEpoch();
}, 60000);

// Ping browser nodes to check liveness
setInterval(() => {
  const now = Date.now();
  browserNodes.forEach((node, nodeId) => {
    // Disconnect if no ping in 2 minutes
    if (now - node.lastPing > 120000) {
      console.log(`[WS] Disconnecting inactive node: ${nodeId}`);
      node.ws.close();
      browserNodes.delete(nodeId);
    } else if (node.ws.readyState === WebSocket.OPEN) {
      node.ws.send(JSON.stringify({ type: 'ping', timestamp: now }));
    }
  });
}, 30000);

// =============================================================================
// START SERVER
// =============================================================================

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                    WHISTLE Coordinator v1.2                           ║
║              (with Browser Nodes + On-Chain Integration)              ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  HTTP API:       http://0.0.0.0:${String(PORT).padEnd(41)}║
║  WebSocket:      ws://0.0.0.0:${String(PORT).padEnd(43)}/ws║
║  Database:       ${DB_PATH.padEnd(52)}║
║  Reward Pool:    ${(REWARD_POOL_PER_HOUR + ' tokens/hour').padEnd(52)}║
║  On-Chain:       ${(ENABLE_ONCHAIN_REWARDS ? 'ENABLED' : 'disabled').padEnd(52)}║
║                                                                        ║
║  Tier 1 (Server):  ${(TIER_MULTIPLIERS.server + 'x multiplier').padEnd(50)}║
║  Tier 2 (Browser): ${(TIER_MULTIPLIERS.browser + 'x multiplier').padEnd(50)}║
║                                                                        ║
╚═══════════════════════════════════════════════════════════════════════╝
  `);
  
  getCurrentEpoch();
  initializeOnChainIntegration();
});
