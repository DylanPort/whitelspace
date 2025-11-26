/**
 * WHISTLE Metrics Exporter
 * 
 * Runs on the validator server, queries local RPC, exposes metrics API.
 * 
 * Endpoints:
 *   GET /health        - Simple health check
 *   GET /metrics       - Full metrics JSON
 *   GET /metrics/slot  - Current slot only
 * 
 * Environment:
 *   PORT          - API port (default: 3001)
 *   RPC_URL       - Local Solana RPC (default: http://localhost:8899)
 *   VALIDATOR_ID  - Your validator identity pubkey
 */

const express = require('express');
const cors = require('cors');
const { Connection, PublicKey } = require('@solana/web3.js');

// Configuration
const PORT = process.env.PORT || 3001;
const RPC_URL = process.env.RPC_URL || 'http://localhost:8899';
const VALIDATOR_ID = process.env.VALIDATOR_ID || '';

// Initialize
const app = express();
app.use(cors());
app.use(express.json());

const connection = new Connection(RPC_URL, 'confirmed');

// Metrics state
let metrics = {
  // Validator info
  validatorId: VALIDATOR_ID,
  version: null,
  
  // Sync status
  slot: 0,
  blockHeight: 0,
  epochInfo: null,
  health: 'unknown',
  
  // Performance
  tps: 0,
  avgSlotTime: 0,
  
  // Uptime tracking
  startTime: Date.now(),
  lastUpdate: null,
  uptimeSeconds: 0,
  
  // RPC stats (basic - for advanced stats use proxy)
  rpcRequestsTotal: 0,
  rpcRequestsPerMinute: 0,
  
  // Errors
  lastError: null,
  errorCount: 0
};

// Request counter for basic RPC stats
let requestCounts = [];
const REQUEST_WINDOW_MS = 60000; // 1 minute window

function trackRequest() {
  const now = Date.now();
  requestCounts.push(now);
  // Clean old entries
  requestCounts = requestCounts.filter(t => now - t < REQUEST_WINDOW_MS);
  metrics.rpcRequestsTotal++;
  metrics.rpcRequestsPerMinute = requestCounts.length;
}

// Fetch metrics from local RPC
async function updateMetrics() {
  try {
    const startTime = Date.now();
    
    // Get slot
    const slot = await connection.getSlot();
    metrics.slot = slot;
    
    // Get block height
    try {
      const blockHeight = await connection.getBlockHeight();
      metrics.blockHeight = blockHeight;
    } catch (e) {
      // May fail if not fully synced
    }
    
    // Get epoch info
    try {
      const epochInfo = await connection.getEpochInfo();
      metrics.epochInfo = {
        epoch: epochInfo.epoch,
        slotIndex: epochInfo.slotIndex,
        slotsInEpoch: epochInfo.slotsInEpoch,
        absoluteSlot: epochInfo.absoluteSlot,
        progress: ((epochInfo.slotIndex / epochInfo.slotsInEpoch) * 100).toFixed(2) + '%'
      };
    } catch (e) {
      // May fail during sync
    }
    
    // Get version
    try {
      const version = await connection.getVersion();
      metrics.version = version['solana-core'] || version['agave'] || JSON.stringify(version);
    } catch (e) {
      // Ignore
    }
    
    // Get recent performance samples for TPS
    try {
      const perfSamples = await connection.getRecentPerformanceSamples(5);
      if (perfSamples.length > 0) {
        const avgTps = perfSamples.reduce((sum, s) => sum + s.numTransactions / s.samplePeriodSecs, 0) / perfSamples.length;
        metrics.tps = Math.round(avgTps);
        
        const avgSlotTime = perfSamples.reduce((sum, s) => sum + (s.samplePeriodSecs / s.numSlots) * 1000, 0) / perfSamples.length;
        metrics.avgSlotTime = Math.round(avgSlotTime);
      }
    } catch (e) {
      // May fail during sync
    }
    
    // Health check
    try {
      // getHealth returns 'ok' if healthy
      const health = await fetch(`${RPC_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth'
        })
      }).then(r => r.json());
      
      if (health.result === 'ok') {
        metrics.health = 'healthy';
      } else if (health.error) {
        metrics.health = 'unhealthy';
        metrics.lastError = health.error.message;
      }
    } catch (e) {
      metrics.health = 'unreachable';
      metrics.lastError = e.message;
    }
    
    // Update timestamps
    metrics.lastUpdate = new Date().toISOString();
    metrics.uptimeSeconds = Math.floor((Date.now() - metrics.startTime) / 1000);
    metrics.lastError = null;
    
    const latency = Date.now() - startTime;
    metrics.rpcLatencyMs = latency;
    
  } catch (error) {
    metrics.health = 'error';
    metrics.lastError = error.message;
    metrics.errorCount++;
    console.error('[Metrics] Update error:', error.message);
  }
}

// Routes

// Health check (for load balancers, Cloudflare, etc.)
app.get('/health', (req, res) => {
  trackRequest();
  res.json({
    status: 'ok',
    service: 'whistle-metrics-exporter',
    timestamp: new Date().toISOString()
  });
});

// Full metrics
app.get('/metrics', (req, res) => {
  trackRequest();
  res.json({
    success: true,
    data: metrics,
    timestamp: new Date().toISOString()
  });
});

// Just slot (lightweight)
app.get('/metrics/slot', (req, res) => {
  trackRequest();
  res.json({
    slot: metrics.slot,
    health: metrics.health
  });
});

// Epoch info
app.get('/metrics/epoch', (req, res) => {
  trackRequest();
  res.json({
    epoch: metrics.epochInfo,
    slot: metrics.slot
  });
});

// Prometheus-style metrics (for Grafana)
app.get('/metrics/prometheus', (req, res) => {
  trackRequest();
  const lines = [
    '# HELP whistle_slot Current slot number',
    '# TYPE whistle_slot gauge',
    `whistle_slot ${metrics.slot}`,
    '',
    '# HELP whistle_block_height Current block height',
    '# TYPE whistle_block_height gauge',
    `whistle_block_height ${metrics.blockHeight}`,
    '',
    '# HELP whistle_tps Transactions per second',
    '# TYPE whistle_tps gauge',
    `whistle_tps ${metrics.tps}`,
    '',
    '# HELP whistle_uptime_seconds Exporter uptime',
    '# TYPE whistle_uptime_seconds counter',
    `whistle_uptime_seconds ${metrics.uptimeSeconds}`,
    '',
    '# HELP whistle_rpc_requests_total Total RPC requests to exporter',
    '# TYPE whistle_rpc_requests_total counter',
    `whistle_rpc_requests_total ${metrics.rpcRequestsTotal}`,
    '',
    '# HELP whistle_health Health status (1=healthy, 0=unhealthy)',
    '# TYPE whistle_health gauge',
    `whistle_health ${metrics.health === 'healthy' ? 1 : 0}`,
  ];
  
  res.set('Content-Type', 'text/plain');
  res.send(lines.join('\n'));
});

// Validator identity
app.get('/metrics/identity', (req, res) => {
  trackRequest();
  res.json({
    validatorId: metrics.validatorId,
    version: metrics.version
  });
});

// Error for unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    availableEndpoints: [
      'GET /health',
      'GET /metrics',
      'GET /metrics/slot',
      'GET /metrics/epoch',
      'GET /metrics/prometheus',
      'GET /metrics/identity'
    ]
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           WHISTLE Metrics Exporter v1.0                       ║
╠═══════════════════════════════════════════════════════════════╣
║  API:     http://0.0.0.0:${PORT}                                 ║
║  RPC:     ${RPC_URL.padEnd(45)}║
║  ID:      ${(VALIDATOR_ID || 'not set').substring(0, 44).padEnd(45)}║
╚═══════════════════════════════════════════════════════════════╝
  `);
  
  // Initial fetch
  updateMetrics();
  
  // Update every 5 seconds
  setInterval(updateMetrics, 5000);
});

