/**
 * WHISTLE Provider API
 * 
 * Complete backend for the provider dashboard.
 * Queries real Solana RPC, tracks providers, counts requests.
 * 
 * Environment:
 *   PORT              - API port (default: 3001)
 *   RPC_URL           - Local Solana RPC (default: http://localhost:8899)
 *   VALIDATOR_PUBKEY  - Your validator identity pubkey
 *   DB_PATH           - SQLite database path (default: ./data/whistle.db)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const nacl = require('tweetnacl');
const bs58 = require('bs58');

// Database
const Database = require('better-sqlite3');
const DATA_DIR = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : './data';
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const db = new Database(process.env.DB_PATH || './data/whistle.db');

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet TEXT UNIQUE NOT NULL,
    name TEXT,
    rpc_endpoint TEXT,
    provider_type TEXT DEFAULT 'validator',
    registered_at INTEGER NOT NULL,
    last_seen INTEGER,
    status TEXT DEFAULT 'pending',
    metadata TEXT
  );
  
  CREATE TABLE IF NOT EXISTS metrics_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    slot INTEGER,
    block_height INTEGER,
    tps INTEGER,
    health TEXT,
    epoch INTEGER,
    epoch_progress REAL
  );
  
  CREATE TABLE IF NOT EXISTS rpc_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    method TEXT,
    latency_ms INTEGER,
    success INTEGER
  );
  
  CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics_history(timestamp);
  CREATE INDEX IF NOT EXISTS idx_rpc_timestamp ON rpc_requests(timestamp);
`);

// Configuration
const PORT = process.env.PORT || 3001;
const RPC_URL = process.env.RPC_URL || 'http://localhost:8899';
const VALIDATOR_PUBKEY = process.env.VALIDATOR_PUBKEY || '';

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Solana connection
const connection = new Connection(RPC_URL, 'confirmed');

// =============================================================================
// METRICS STATE
// =============================================================================

const state = {
  // Validator info
  validatorPubkey: VALIDATOR_PUBKEY,
  version: null,
  featureSet: null,
  
  // Current metrics
  slot: 0,
  blockHeight: 0,
  epoch: 0,
  epochProgress: 0,
  epochStartSlot: 0,
  epochEndSlot: 0,
  
  // Performance
  tps: 0,
  avgSlotTimeMs: 400,
  
  // Health
  health: 'unknown',
  behindBy: 0,
  
  // Network info
  clusterNodes: 0,
  
  // Uptime
  startTime: Date.now(),
  lastUpdate: null,
  lastError: null,
  errorCount: 0,
  
  // RPC stats
  totalRequests: 0,
  requestsLastHour: 0,
  avgLatencyMs: 0
};

// Request tracking
const requestLog = [];
const MAX_REQUEST_LOG = 10000;

function logRequest(method, latencyMs, success) {
  const now = Date.now();
  requestLog.push({ timestamp: now, method, latencyMs, success });
  
  // Trim old entries
  while (requestLog.length > MAX_REQUEST_LOG) {
    requestLog.shift();
  }
  
  // Update stats
  state.totalRequests++;
  
  // Calculate requests in last hour
  const oneHourAgo = now - 3600000;
  const recentRequests = requestLog.filter(r => r.timestamp > oneHourAgo);
  state.requestsLastHour = recentRequests.length;
  
  // Calculate average latency
  if (recentRequests.length > 0) {
    state.avgLatencyMs = Math.round(
      recentRequests.reduce((sum, r) => sum + r.latencyMs, 0) / recentRequests.length
    );
  }
  
  // Store in database (sample every 10th request to avoid bloat)
  if (state.totalRequests % 10 === 0) {
    try {
      db.prepare(`
        INSERT INTO rpc_requests (timestamp, method, latency_ms, success)
        VALUES (?, ?, ?, ?)
      `).run(now, method, latencyMs, success ? 1 : 0);
    } catch (e) {
      // Ignore DB errors
    }
  }
}

// =============================================================================
// METRICS COLLECTION
// =============================================================================

async function fetchMetrics() {
  const startTime = Date.now();
  
  try {
    // Get slot
    const slot = await connection.getSlot();
    state.slot = slot;
    logRequest('getSlot', Date.now() - startTime, true);
    
    // Get block height
    try {
      const t = Date.now();
      state.blockHeight = await connection.getBlockHeight();
      logRequest('getBlockHeight', Date.now() - t, true);
    } catch (e) {
      // May fail during sync
    }
    
    // Get epoch info
    try {
      const t = Date.now();
      const epochInfo = await connection.getEpochInfo();
      state.epoch = epochInfo.epoch;
      state.epochProgress = (epochInfo.slotIndex / epochInfo.slotsInEpoch) * 100;
      state.epochStartSlot = epochInfo.absoluteSlot - epochInfo.slotIndex;
      state.epochEndSlot = state.epochStartSlot + epochInfo.slotsInEpoch;
      logRequest('getEpochInfo', Date.now() - t, true);
    } catch (e) {
      // May fail during sync
    }
    
    // Get version
    try {
      const t = Date.now();
      const version = await connection.getVersion();
      state.version = version['solana-core'] || version['feature-set'] ? 
        `${version['solana-core'] || 'unknown'}` : JSON.stringify(version);
      state.featureSet = version['feature-set'];
      logRequest('getVersion', Date.now() - t, true);
    } catch (e) {
      // Ignore
    }
    
    // Get cluster nodes count
    try {
      const t = Date.now();
      const nodes = await connection.getClusterNodes();
      state.clusterNodes = nodes.length;
      logRequest('getClusterNodes', Date.now() - t, true);
    } catch (e) {
      // Ignore
    }
    
    // Get recent performance samples
    try {
      const t = Date.now();
      const samples = await connection.getRecentPerformanceSamples(10);
      if (samples.length > 0) {
        // Calculate TPS
        const totalTx = samples.reduce((sum, s) => sum + s.numTransactions, 0);
        const totalTime = samples.reduce((sum, s) => sum + s.samplePeriodSecs, 0);
        state.tps = Math.round(totalTx / totalTime);
        
        // Calculate avg slot time
        const totalSlots = samples.reduce((sum, s) => sum + s.numSlots, 0);
        state.avgSlotTimeMs = Math.round((totalTime / totalSlots) * 1000);
      }
      logRequest('getRecentPerformanceSamples', Date.now() - t, true);
    } catch (e) {
      // Ignore
    }
    
    // Health check
    try {
      const t = Date.now();
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' })
      });
      const result = await response.json();
      
      if (result.result === 'ok') {
        state.health = 'healthy';
        state.behindBy = 0;
      } else if (result.error) {
        state.health = 'behind';
        // Parse "Node is behind by X slots" message
        const match = result.error.message?.match(/behind by (\d+)/);
        state.behindBy = match ? parseInt(match[1]) : 0;
      }
      logRequest('getHealth', Date.now() - t, true);
    } catch (e) {
      state.health = 'unreachable';
      state.lastError = e.message;
    }
    
    // Update timestamps
    state.lastUpdate = Date.now();
    state.lastError = null;
    
    // Store metrics snapshot in database (every minute)
    const lastDbWrite = db.prepare(`
      SELECT timestamp FROM metrics_history ORDER BY id DESC LIMIT 1
    `).get();
    
    if (!lastDbWrite || Date.now() - lastDbWrite.timestamp > 60000) {
      db.prepare(`
        INSERT INTO metrics_history (timestamp, slot, block_height, tps, health, epoch, epoch_progress)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        Date.now(),
        state.slot,
        state.blockHeight,
        state.tps,
        state.health,
        state.epoch,
        state.epochProgress
      );
    }
    
  } catch (error) {
    state.health = 'error';
    state.lastError = error.message;
    state.errorCount++;
    console.error('[Metrics] Fetch error:', error.message);
  }
}

// =============================================================================
// API ROUTES
// =============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'whistle-provider-api',
    rpcHealth: state.health,
    timestamp: Date.now()
  });
});

// Current metrics
app.get('/api/metrics', (req, res) => {
  res.json({
    validator: {
      pubkey: state.validatorPubkey,
      version: state.version,
      featureSet: state.featureSet
    },
    chain: {
      slot: state.slot,
      blockHeight: state.blockHeight,
      epoch: state.epoch,
      epochProgress: parseFloat(state.epochProgress.toFixed(2)),
      epochStartSlot: state.epochStartSlot,
      epochEndSlot: state.epochEndSlot
    },
    performance: {
      tps: state.tps,
      avgSlotTimeMs: state.avgSlotTimeMs,
      clusterNodes: state.clusterNodes
    },
    health: {
      status: state.health,
      behindBy: state.behindBy,
      lastUpdate: state.lastUpdate,
      lastError: state.lastError,
      errorCount: state.errorCount
    },
    rpc: {
      totalRequests: state.totalRequests,
      requestsLastHour: state.requestsLastHour,
      avgLatencyMs: state.avgLatencyMs
    },
    uptime: {
      startTime: state.startTime,
      uptimeSeconds: Math.floor((Date.now() - state.startTime) / 1000)
    }
  });
});

// Metrics history
app.get('/api/metrics/history', (req, res) => {
  const hours = parseInt(req.query.hours) || 24;
  const since = Date.now() - (hours * 3600000);
  
  const rows = db.prepare(`
    SELECT * FROM metrics_history 
    WHERE timestamp > ? 
    ORDER BY timestamp ASC
  `).all(since);
  
  res.json({
    hours,
    count: rows.length,
    data: rows
  });
});

// RPC request stats
app.get('/api/metrics/requests', (req, res) => {
  const hours = parseInt(req.query.hours) || 1;
  const since = Date.now() - (hours * 3600000);
  
  // Get from memory for recent data
  const recent = requestLog.filter(r => r.timestamp > since);
  
  // Group by method
  const byMethod = {};
  recent.forEach(r => {
    if (!byMethod[r.method]) {
      byMethod[r.method] = { count: 0, totalLatency: 0, errors: 0 };
    }
    byMethod[r.method].count++;
    byMethod[r.method].totalLatency += r.latencyMs;
    if (!r.success) byMethod[r.method].errors++;
  });
  
  // Calculate averages
  Object.keys(byMethod).forEach(method => {
    byMethod[method].avgLatencyMs = Math.round(
      byMethod[method].totalLatency / byMethod[method].count
    );
    delete byMethod[method].totalLatency;
  });
  
  res.json({
    hours,
    total: recent.length,
    avgLatencyMs: state.avgLatencyMs,
    byMethod
  });
});

// =============================================================================
// PROVIDER REGISTRATION
// =============================================================================

// Get all providers
app.get('/api/providers', (req, res) => {
  const providers = db.prepare(`
    SELECT id, wallet, name, rpc_endpoint, provider_type, registered_at, last_seen, status
    FROM providers
    ORDER BY registered_at DESC
  `).all();
  
  res.json({ providers });
});

// Get provider by wallet
app.get('/api/providers/:wallet', (req, res) => {
  const provider = db.prepare(`
    SELECT * FROM providers WHERE wallet = ?
  `).get(req.params.wallet);
  
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }
  
  res.json({ provider });
});

// Register new provider (requires signature verification)
app.post('/api/providers/register', (req, res) => {
  const { wallet, name, rpcEndpoint, providerType, signature, message } = req.body;
  
  if (!wallet || !signature || !message) {
    return res.status(400).json({ error: 'Missing required fields: wallet, signature, message' });
  }
  
  // Verify the signature
  try {
    const publicKey = new PublicKey(wallet);
    const signatureBytes = bs58.decode(signature);
    const messageBytes = new TextEncoder().encode(message);
    
    const verified = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );
    
    if (!verified) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Check message contains expected content
    if (!message.includes('WHISTLE Provider Registration') || !message.includes(wallet)) {
      return res.status(400).json({ error: 'Invalid message format' });
    }
    
  } catch (e) {
    return res.status(400).json({ error: 'Signature verification failed: ' + e.message });
  }
  
  // Check if already registered
  const existing = db.prepare('SELECT id FROM providers WHERE wallet = ?').get(wallet);
  if (existing) {
    return res.status(409).json({ error: 'Wallet already registered' });
  }
  
  // Register provider
  try {
    const result = db.prepare(`
      INSERT INTO providers (wallet, name, rpc_endpoint, provider_type, registered_at, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `).run(
      wallet,
      name || null,
      rpcEndpoint || null,
      providerType || 'validator',
      Date.now()
    );
    
    res.json({
      success: true,
      providerId: result.lastInsertRowid,
      message: 'Provider registered successfully'
    });
    
  } catch (e) {
    res.status(500).json({ error: 'Registration failed: ' + e.message });
  }
});

// Update provider (requires signature)
app.put('/api/providers/:wallet', (req, res) => {
  const { name, rpcEndpoint, signature, message } = req.body;
  const { wallet } = req.params;
  
  if (!signature || !message) {
    return res.status(400).json({ error: 'Missing signature' });
  }
  
  // Verify signature
  try {
    const publicKey = new PublicKey(wallet);
    const signatureBytes = bs58.decode(signature);
    const messageBytes = new TextEncoder().encode(message);
    
    const verified = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );
    
    if (!verified) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Signature verification failed' });
  }
  
  // Update
  const result = db.prepare(`
    UPDATE providers 
    SET name = COALESCE(?, name),
        rpc_endpoint = COALESCE(?, rpc_endpoint),
        last_seen = ?
    WHERE wallet = ?
  `).run(name, rpcEndpoint, Date.now(), wallet);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Provider not found' });
  }
  
  res.json({ success: true });
});

// Heartbeat (provider pings to show they're online)
app.post('/api/providers/:wallet/heartbeat', (req, res) => {
  const { wallet } = req.params;
  
  const result = db.prepare(`
    UPDATE providers SET last_seen = ? WHERE wallet = ?
  `).run(Date.now(), wallet);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Provider not found' });
  }
  
  res.json({ success: true, timestamp: Date.now() });
});

// =============================================================================
// RPC PROXY (for counting external requests)
// =============================================================================

app.post('/rpc', async (req, res) => {
  const startTime = Date.now();
  const method = req.body?.method || 'unknown';
  
  try {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    const result = await response.json();
    const latency = Date.now() - startTime;
    
    logRequest(method, latency, !result.error);
    
    res.json(result);
    
  } catch (error) {
    logRequest(method, Date.now() - startTime, false);
    res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: error.message },
      id: req.body?.id || null
    });
  }
});

// =============================================================================
// STATIC INFO
// =============================================================================

app.get('/api/info', (req, res) => {
  res.json({
    name: 'WHISTLE Provider API',
    version: '1.0.0',
    validator: state.validatorPubkey,
    rpcUrl: RPC_URL.replace(/localhost|127\.0\.0\.1/, '<internal>'),
    endpoints: [
      'GET  /health',
      'GET  /api/metrics',
      'GET  /api/metrics/history?hours=24',
      'GET  /api/metrics/requests?hours=1',
      'GET  /api/providers',
      'GET  /api/providers/:wallet',
      'POST /api/providers/register',
      'PUT  /api/providers/:wallet',
      'POST /api/providers/:wallet/heartbeat',
      'POST /rpc (proxy)'
    ]
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║              WHISTLE Provider API v1.0                            ║
╠═══════════════════════════════════════════════════════════════════╣
║  API:        http://0.0.0.0:${String(PORT).padEnd(40)}║
║  RPC:        ${RPC_URL.padEnd(50)}║
║  Validator:  ${(VALIDATOR_PUBKEY || 'not set').substring(0, 44).padEnd(50)}║
║  Database:   ${(process.env.DB_PATH || './data/whistle.db').padEnd(50)}║
╚═══════════════════════════════════════════════════════════════════╝
  `);
  
  // Initial metrics fetch
  fetchMetrics();
  
  // Fetch metrics every 5 seconds
  setInterval(fetchMetrics, 5000);
  
  // Clean old data every hour
  setInterval(() => {
    const oneWeekAgo = Date.now() - (7 * 24 * 3600000);
    db.prepare('DELETE FROM metrics_history WHERE timestamp < ?').run(oneWeekAgo);
    db.prepare('DELETE FROM rpc_requests WHERE timestamp < ?').run(oneWeekAgo);
  }, 3600000);
});

