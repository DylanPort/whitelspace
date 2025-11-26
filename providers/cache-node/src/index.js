/**
 * WHISTLE Cache Node
 * 
 * A distributed caching layer for Solana RPC requests.
 * 
 * Features:
 * - Intercepts RPC requests and caches responses
 * - Smart TTL based on request type
 * - Reports metrics to coordinator for rewards
 * - Connects to WHISTLE network for traffic routing
 * - Automatic heartbeat to on-chain WHTT contract
 * 
 * Environment:
 *   PORT              - Cache node port (default: 8545)
 *   UPSTREAM_RPC      - Upstream Solana RPC (default: https://rpc.whistle.ninja/rpc)
 *   COORDINATOR_URL   - WHISTLE coordinator URL
 *   PROVIDER_WALLET   - Your Solana wallet address for rewards
 *   PROVIDER_KEYPAIR  - Path to keypair file for signing heartbeats
 *   NODE_ID           - Unique node identifier (auto-generated if not set)
 *   REDIS_URL         - Redis URL for distributed caching (optional)
 *   ENABLE_HEARTBEAT  - Enable on-chain heartbeats (default: false)
 */

require('dotenv').config();

const express = require('express');
const NodeCache = require('node-cache');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Configuration
const PORT = process.env.PORT || 8545;
const UPSTREAM_RPC = process.env.UPSTREAM_RPC || 'https://rpc.whistle.ninja/rpc';
const COORDINATOR_URL = process.env.COORDINATOR_URL || 'http://localhost:3002';
const PROVIDER_WALLET = process.env.PROVIDER_WALLET || '';
const PROVIDER_KEYPAIR = process.env.PROVIDER_KEYPAIR || '';
const NODE_ID = process.env.NODE_ID || uuidv4();
const ENABLE_HEARTBEAT = process.env.ENABLE_HEARTBEAT === 'true';
const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL || '60000'); // 1 minute default

// Initialize Express
const app = express();
app.use(express.json({ limit: '10mb' }));

// Initialize cache (in-memory, can be replaced with Redis)
const cache = new NodeCache({
  stdTTL: 1, // Default 1 second TTL
  checkperiod: 1,
  useClones: false
});

// =============================================================================
// CACHE TTL CONFIGURATION
// Different RPC methods have different cache durations
// =============================================================================

const CACHE_TTL = {
  // Frequently changing - very short cache
  'getSlot': 0.4,                    // 400ms - changes every slot
  'getBlockHeight': 0.4,
  'getLatestBlockhash': 0.4,
  'getHealth': 1,
  'getRecentBlockhash': 0.4,
  
  // Epoch info - moderate cache
  'getEpochInfo': 5,                 // 5 seconds
  'getEpochSchedule': 60,            // 1 minute
  'getRecentPerformanceSamples': 10,
  
  // Account data - depends on commitment
  'getAccountInfo': 2,               // 2 seconds
  'getBalance': 2,
  'getTokenAccountBalance': 2,
  'getTokenAccountsByOwner': 5,
  'getProgramAccounts': 10,
  
  // Transaction data - longer cache (immutable once confirmed)
  'getTransaction': 300,             // 5 minutes
  'getConfirmedTransaction': 300,
  'getSignaturesForAddress': 30,
  
  // Block data - very long cache (immutable)
  'getBlock': 3600,                  // 1 hour
  'getConfirmedBlock': 3600,
  'getBlockTime': 3600,
  
  // Static/config data - long cache
  'getVersion': 300,
  'getGenesisHash': 86400,           // 24 hours
  'getIdentity': 300,
  'getClusterNodes': 60,
  'getVoteAccounts': 30,
  'getSupply': 60,
  'getInflationRate': 300,
  'getInflationGovernor': 300,
  'getMinimumBalanceForRentExemption': 3600,
  
  // Default for unknown methods
  'default': 1
};

function getTTL(method) {
  return CACHE_TTL[method] || CACHE_TTL['default'];
}

// =============================================================================
// METRICS TRACKING
// =============================================================================

const metrics = {
  nodeId: NODE_ID,
  providerWallet: PROVIDER_WALLET,
  startTime: Date.now(),
  
  // Request counts
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  errors: 0,
  
  // By method
  methodStats: {},
  
  // Latency tracking
  totalUpstreamLatency: 0,
  totalCacheLatency: 0,
  
  // Bandwidth saved (approximate)
  bytesSaved: 0,
  bytesServed: 0
};

function recordRequest(method, hit, latencyMs, responseSize) {
  metrics.totalRequests++;
  
  if (hit) {
    metrics.cacheHits++;
    metrics.totalCacheLatency += latencyMs;
    metrics.bytesSaved += responseSize;
  } else {
    metrics.cacheMisses++;
    metrics.totalUpstreamLatency += latencyMs;
  }
  
  metrics.bytesServed += responseSize;
  
  // Track by method
  if (!metrics.methodStats[method]) {
    metrics.methodStats[method] = { hits: 0, misses: 0, totalLatency: 0 };
  }
  
  if (hit) {
    metrics.methodStats[method].hits++;
  } else {
    metrics.methodStats[method].misses++;
  }
  metrics.methodStats[method].totalLatency += latencyMs;
}

function getMetricsSummary() {
  const uptime = Math.floor((Date.now() - metrics.startTime) / 1000);
  const hitRate = metrics.totalRequests > 0 
    ? (metrics.cacheHits / metrics.totalRequests * 100).toFixed(2) 
    : 0;
  
  const avgCacheLatency = metrics.cacheHits > 0
    ? (metrics.totalCacheLatency / metrics.cacheHits).toFixed(2)
    : 0;
    
  const avgUpstreamLatency = metrics.cacheMisses > 0
    ? (metrics.totalUpstreamLatency / metrics.cacheMisses).toFixed(2)
    : 0;

  return {
    nodeId: metrics.nodeId,
    providerWallet: metrics.providerWallet,
    uptime,
    totalRequests: metrics.totalRequests,
    cacheHits: metrics.cacheHits,
    cacheMisses: metrics.cacheMisses,
    hitRate: parseFloat(hitRate),
    avgCacheLatencyMs: parseFloat(avgCacheLatency),
    avgUpstreamLatencyMs: parseFloat(avgUpstreamLatency),
    bytesSaved: metrics.bytesSaved,
    bytesServed: metrics.bytesServed,
    errors: metrics.errors,
    methodStats: metrics.methodStats,
    cacheSize: cache.keys().length,
    timestamp: Date.now()
  };
}

// =============================================================================
// CACHE KEY GENERATION
// =============================================================================

function generateCacheKey(method, params) {
  // For most methods, the key is method + stringified params
  const paramStr = JSON.stringify(params || []);
  return `${method}:${paramStr}`;
}

// Methods that should NOT be cached
const NO_CACHE_METHODS = [
  'sendTransaction',
  'simulateTransaction',
  'requestAirdrop',
  'getSignatureStatuses', // Status can change
];

function shouldCache(method) {
  return !NO_CACHE_METHODS.includes(method);
}

// =============================================================================
// RPC PROXY
// =============================================================================

async function forwardToUpstream(body) {
  const response = await fetch(UPSTREAM_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  return response.json();
}

app.post('/', async (req, res) => {
  const startTime = Date.now();
  const body = req.body;
  
  // Handle batch requests
  if (Array.isArray(body)) {
    const results = await Promise.all(body.map(r => handleSingleRequest(r)));
    return res.json(results);
  }
  
  // Single request
  const result = await handleSingleRequest(body);
  const latency = Date.now() - startTime;
  
  // Add cache header
  res.set('X-Cache-Latency', latency.toString());
  res.set('X-Cache-Node', NODE_ID);
  
  res.json(result);
});

async function handleSingleRequest(request) {
  const startTime = Date.now();
  const method = request.method;
  const params = request.params || [];
  const id = request.id;
  
  // Check if cacheable
  if (!shouldCache(method)) {
    try {
      const result = await forwardToUpstream(request);
      const latency = Date.now() - startTime;
      recordRequest(method, false, latency, JSON.stringify(result).length);
      return result;
    } catch (error) {
      metrics.errors++;
      return {
        jsonrpc: '2.0',
        error: { code: -32000, message: error.message },
        id
      };
    }
  }
  
  // Generate cache key
  const cacheKey = generateCacheKey(method, params);
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached !== undefined) {
    const latency = Date.now() - startTime;
    const response = {
      jsonrpc: '2.0',
      result: cached,
      id
    };
    recordRequest(method, true, latency, JSON.stringify(response).length);
    return response;
  }
  
  // Cache miss - forward to upstream
  try {
    const result = await forwardToUpstream(request);
    const latency = Date.now() - startTime;
    
    // Cache the result if successful
    if (result.result !== undefined && !result.error) {
      const ttl = getTTL(method);
      cache.set(cacheKey, result.result, ttl);
    }
    
    recordRequest(method, false, latency, JSON.stringify(result).length);
    return result;
    
  } catch (error) {
    metrics.errors++;
    return {
      jsonrpc: '2.0',
      error: { code: -32000, message: error.message },
      id
    };
  }
}

// =============================================================================
// METRICS ENDPOINTS
// =============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    nodeId: NODE_ID,
    uptime: Math.floor((Date.now() - metrics.startTime) / 1000)
  });
});

// Full metrics
app.get('/metrics', (req, res) => {
  res.json(getMetricsSummary());
});

// Prometheus format
app.get('/metrics/prometheus', (req, res) => {
  const m = getMetricsSummary();
  
  const lines = [
    '# HELP whistle_cache_requests_total Total RPC requests',
    '# TYPE whistle_cache_requests_total counter',
    `whistle_cache_requests_total ${m.totalRequests}`,
    '',
    '# HELP whistle_cache_hits_total Cache hits',
    '# TYPE whistle_cache_hits_total counter',
    `whistle_cache_hits_total ${m.cacheHits}`,
    '',
    '# HELP whistle_cache_misses_total Cache misses',
    '# TYPE whistle_cache_misses_total counter',
    `whistle_cache_misses_total ${m.cacheMisses}`,
    '',
    '# HELP whistle_cache_hit_rate Cache hit rate',
    '# TYPE whistle_cache_hit_rate gauge',
    `whistle_cache_hit_rate ${m.hitRate}`,
    '',
    '# HELP whistle_cache_latency_ms Average cache latency',
    '# TYPE whistle_cache_latency_ms gauge',
    `whistle_cache_latency_ms ${m.avgCacheLatencyMs}`,
    '',
    '# HELP whistle_upstream_latency_ms Average upstream latency',
    '# TYPE whistle_upstream_latency_ms gauge',
    `whistle_upstream_latency_ms ${m.avgUpstreamLatencyMs}`,
    '',
    '# HELP whistle_bytes_saved Bytes saved by caching',
    '# TYPE whistle_bytes_saved counter',
    `whistle_bytes_saved ${m.bytesSaved}`,
    '',
    '# HELP whistle_uptime_seconds Node uptime',
    '# TYPE whistle_uptime_seconds counter',
    `whistle_uptime_seconds ${m.uptime}`,
  ];
  
  res.set('Content-Type', 'text/plain');
  res.send(lines.join('\n'));
});

// =============================================================================
// COORDINATOR REPORTING
// =============================================================================

async function reportToCoordinator() {
  if (!COORDINATOR_URL) return;
  
  try {
    const metrics = getMetricsSummary();
    
    await fetch(`${COORDINATOR_URL}/api/nodes/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metrics)
    });
    
    console.log(`[Reporter] Sent metrics to coordinator: ${metrics.totalRequests} requests, ${metrics.hitRate}% hit rate`);
  } catch (error) {
    // Coordinator might not be running - that's okay
    console.log(`[Reporter] Could not reach coordinator: ${error.message}`);
  }
}

// Report every 30 seconds
setInterval(reportToCoordinator, 30000);

// =============================================================================
// ON-CHAIN HEARTBEAT (WHTT Contract)
// =============================================================================

let heartbeatKeypair = null;
let heartbeatConnection = null;

async function initializeHeartbeat() {
  if (!ENABLE_HEARTBEAT || !PROVIDER_KEYPAIR) {
    console.log('[Heartbeat] Disabled (set ENABLE_HEARTBEAT=true and PROVIDER_KEYPAIR to enable)');
    return;
  }
  
  try {
    // Dynamic import for Solana web3
    const { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, SYSVAR_CLOCK_PUBKEY } = await import('@solana/web3.js');
    
    // Load keypair
    if (!fs.existsSync(PROVIDER_KEYPAIR)) {
      console.error('[Heartbeat] Keypair file not found:', PROVIDER_KEYPAIR);
      return;
    }
    
    const keypairData = JSON.parse(fs.readFileSync(PROVIDER_KEYPAIR, 'utf-8'));
    heartbeatKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
    
    // Initialize connection
    heartbeatConnection = new Connection(UPSTREAM_RPC, 'confirmed');
    
    console.log('[Heartbeat] Initialized for provider:', heartbeatKeypair.publicKey.toBase58());
    
    // Start heartbeat loop
    setInterval(sendOnChainHeartbeat, HEARTBEAT_INTERVAL);
    
    // Send initial heartbeat after 10 seconds
    setTimeout(sendOnChainHeartbeat, 10000);
    
  } catch (error) {
    console.error('[Heartbeat] Failed to initialize:', error.message);
  }
}

async function sendOnChainHeartbeat() {
  if (!heartbeatKeypair || !heartbeatConnection) return;
  
  try {
    const { PublicKey, Transaction, TransactionInstruction, SYSVAR_CLOCK_PUBKEY } = await import('@solana/web3.js');
    
    // WHTT Contract addresses
    const WHISTLE_PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr');
    
    // Derive provider account PDA
    const [providerAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('provider'), heartbeatKeypair.publicKey.toBuffer()],
      WHISTLE_PROGRAM_ID
    );
    
    // RecordHeartbeat instruction (discriminator = 12)
    const instructionData = Buffer.from([12]);
    
    const heartbeatIx = new TransactionInstruction({
      programId: WHISTLE_PROGRAM_ID,
      keys: [
        { pubkey: heartbeatKeypair.publicKey, isSigner: true, isWritable: false },
        { pubkey: providerAccountPDA, isSigner: false, isWritable: true },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
      ],
      data: instructionData,
    });
    
    const transaction = new Transaction().add(heartbeatIx);
    transaction.recentBlockhash = (await heartbeatConnection.getLatestBlockhash()).blockhash;
    transaction.feePayer = heartbeatKeypair.publicKey;
    
    // Sign and send
    transaction.sign(heartbeatKeypair);
    const signature = await heartbeatConnection.sendRawTransaction(transaction.serialize());
    
    await heartbeatConnection.confirmTransaction(signature, 'confirmed');
    
    console.log('[Heartbeat] Sent on-chain heartbeat:', signature.slice(0, 16) + '...');
    
    // Update metrics
    metrics.lastHeartbeat = Date.now();
    metrics.heartbeatCount = (metrics.heartbeatCount || 0) + 1;
    
  } catch (error) {
    console.error('[Heartbeat] Failed to send:', error.message);
    metrics.heartbeatErrors = (metrics.heartbeatErrors || 0) + 1;
  }
}

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                    WHISTLE Cache Node v1.1                            ║
║                    (with On-Chain Heartbeat)                          ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  Node ID:      ${NODE_ID.padEnd(52)}║
║  Port:         ${String(PORT).padEnd(52)}║
║  Upstream:     ${UPSTREAM_RPC.substring(0, 50).padEnd(52)}║
║  Wallet:       ${(PROVIDER_WALLET || 'not set').substring(0, 44).padEnd(52)}║
║  Heartbeat:    ${(ENABLE_HEARTBEAT ? 'ENABLED' : 'disabled').padEnd(52)}║
║                                                                        ║
║  Endpoints:                                                            ║
║    POST /       - RPC proxy (cached)                                   ║
║    GET /health  - Health check                                         ║
║    GET /metrics - Cache metrics                                        ║
║                                                                        ║
╚═══════════════════════════════════════════════════════════════════════╝
  `);
  
  // Initial report
  setTimeout(reportToCoordinator, 5000);
  
  // Initialize on-chain heartbeat
  initializeHeartbeat();
});

