/**
 * WHISTLE Cache Node
 * Earn SOL by caching and serving Solana RPC responses
 */

import express from 'express';
import { createHash } from 'crypto';
import axios from 'axios';
import WebSocket from 'ws';
import NodeCache from 'node-cache';
import pino from 'pino';
import dotenv from 'dotenv';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { ContractIntegration } from './contract-integration';

dotenv.config();

// Configuration
const config = {
  // Node settings
  NODE_PORT: process.env.NODE_PORT || 8545,
  NODE_ID: process.env.NODE_ID || generateNodeId(),
  WALLET_ADDRESS: process.env.WALLET_ADDRESS || '',
  
  // Network settings
  COORDINATOR_URL: process.env.COORDINATOR_URL || 'wss://coordinator.whistle.network',
  WHISTLE_CONTRACT: process.env.WHISTLE_CONTRACT || 'whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr',
  
  // RPC endpoints (fallbacks)
  RPC_ENDPOINTS: [
    process.env.PRIMARY_RPC || 'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana',
  ],
  
  // Cache settings
  CACHE_TTL_DEFAULT: 10, // 10 seconds default
  CACHE_TTL_STATIC: 60,   // 60 seconds for static data
  CACHE_TTL_DYNAMIC: 2,   // 2 seconds for dynamic data
  CACHE_CHECK_PERIOD: 60, // Cleanup every 60 seconds
  MAX_CACHE_SIZE: 10000,  // Maximum cache entries
  
  // Performance
  MAX_CONCURRENT_REQUESTS: 100,
  REQUEST_TIMEOUT: 5000,
};

// Logger setup
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});

// Cache setup with TTL
const cache = new NodeCache({
  stdTTL: config.CACHE_TTL_DEFAULT,
  checkperiod: config.CACHE_CHECK_PERIOD,
  maxKeys: config.MAX_CACHE_SIZE,
  useClones: false, // Don't clone for performance
});

// Metrics tracking
const metrics = {
  cacheHits: 0,
  cacheMisses: 0,
  totalRequests: 0,
  totalEarnings: 0,
  uptime: Date.now(),
  errors: 0,
  avgResponseTime: 0,
  responseTimes: [] as number[],
};

// WebSocket connection to coordinator
let coordinatorWs: WebSocket | null = null;
let isRegistered = false;

// Smart contract integration
let contractIntegration: ContractIntegration | null = null;

/**
 * Generate unique node ID
 */
function generateNodeId(): string {
  return 'node_' + createHash('sha256')
    .update(process.env.WALLET_ADDRESS || '')
    .update(Date.now().toString())
    .digest('hex')
    .substring(0, 16);
}

/**
 * Get cache key for RPC request
 */
function getCacheKey(method: string, params: any[]): string {
  return createHash('sha256')
    .update(JSON.stringify({ method, params }))
    .digest('hex');
}

/**
 * Determine cache TTL based on method
 */
function getCacheTTL(method: string): number {
  // Static data - cache longer
  const staticMethods = [
    'getAccountInfo',
    'getTransaction',
    'getBlock',
    'getSignaturesForAddress',
  ];
  
  // Dynamic data - cache shorter
  const dynamicMethods = [
    'getSlot',
    'getBlockHeight',
    'getRecentBlockhash',
    'getLatestBlockhash',
  ];
  
  if (staticMethods.includes(method)) {
    return config.CACHE_TTL_STATIC;
  } else if (dynamicMethods.includes(method)) {
    return config.CACHE_TTL_DYNAMIC;
  }
  
  return config.CACHE_TTL_DEFAULT;
}

/**
 * Connect to coordinator network
 */
async function connectToCoordinator() {
  return new Promise<void>((resolve, reject) => {
    logger.info('Connecting to coordinator network...');
    
    coordinatorWs = new WebSocket(config.COORDINATOR_URL);
    
    coordinatorWs.on('open', () => {
      logger.info('Connected to coordinator');
      registerNode();
      resolve();
    });
    
    coordinatorWs.on('message', (data) => {
      handleCoordinatorMessage(JSON.parse(data.toString()));
    });
    
    coordinatorWs.on('error', (error) => {
      logger.error('Coordinator connection error:', error);
      reject(error);
    });
    
    coordinatorWs.on('close', () => {
      logger.warn('Disconnected from coordinator, reconnecting...');
      isRegistered = false;
      setTimeout(() => connectToCoordinator(), 5000);
    });
  });
}

/**
 * Register node with coordinator
 */
function registerNode() {
  if (!coordinatorWs) return;
  
  const registration = {
    type: 'REGISTER_CACHE_NODE',
    nodeId: config.NODE_ID,
    wallet: config.WALLET_ADDRESS,
    endpoint: `http://${process.env.PUBLIC_IP || 'localhost'}:${config.NODE_PORT}`,
    capabilities: {
      cacheSize: config.MAX_CACHE_SIZE,
      ttl: config.CACHE_TTL_DEFAULT,
      location: process.env.NODE_LOCATION || 'unknown',
    },
    version: '1.0.0',
  };
  
  coordinatorWs.send(JSON.stringify(registration));
  logger.info('Registering node with coordinator...', { nodeId: config.NODE_ID });
}

/**
 * Handle messages from coordinator
 */
function handleCoordinatorMessage(message: any) {
  switch (message.type) {
    case 'REGISTERED':
      isRegistered = true;
      logger.info('Successfully registered with coordinator');
      break;
      
    case 'HEARTBEAT':
      if (coordinatorWs) {
        coordinatorWs.send(JSON.stringify({
          type: 'HEARTBEAT_RESPONSE',
          nodeId: config.NODE_ID,
          metrics: getMetrics(),
        }));
      }
      break;
      
    case 'CLEAR_CACHE':
      cache.flushAll();
      logger.info('Cache cleared by coordinator');
      break;
      
    case 'UPDATE_CONFIG':
      // Update configuration dynamically
      if (message.config) {
        Object.assign(config, message.config);
        logger.info('Configuration updated', message.config);
      }
      break;
  }
}

/**
 * Get current metrics
 */
function getMetrics() {
  const hitRate = metrics.totalRequests > 0 
    ? (metrics.cacheHits / metrics.totalRequests * 100).toFixed(2)
    : 0;
    
  const avgResponseTime = metrics.responseTimes.length > 0
    ? metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length
    : 0;
  
  return {
    cacheHits: metrics.cacheHits,
    cacheMisses: metrics.cacheMisses,
    totalRequests: metrics.totalRequests,
    hitRate: hitRate + '%',
    totalEarnings: metrics.totalEarnings,
    uptime: Date.now() - metrics.uptime,
    errors: metrics.errors,
    avgResponseTime: Math.round(avgResponseTime),
    cacheSize: cache.keys().length,
  };
}

/**
 * Forward request to RPC endpoint
 */
async function forwardToRPC(method: string, params: any[], rpcIndex = 0): Promise<any> {
  if (rpcIndex >= config.RPC_ENDPOINTS.length) {
    throw new Error('All RPC endpoints failed');
  }
  
  const rpcUrl = config.RPC_ENDPOINTS[rpcIndex];
  
  try {
    const response = await axios.post(
      rpcUrl,
      {
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      },
      {
        timeout: config.REQUEST_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (response.data.error) {
      throw new Error(response.data.error.message);
    }
    
    return response.data.result;
  } catch (error: any) {
    logger.warn(`RPC endpoint ${rpcUrl} failed:`, error.message);
    
    // Try next endpoint
    return forwardToRPC(method, params, rpcIndex + 1);
  }
}

/**
 * Report cache hit to coordinator for rewards and track on-chain
 */
async function reportCacheHit() {
  // Report to coordinator
  if (coordinatorWs && isRegistered) {
    coordinatorWs.send(JSON.stringify({
      type: 'CACHE_HIT',
      nodeId: config.NODE_ID,
      timestamp: Date.now(),
    }));
  }
  
  // Track on-chain for accurate earnings (batched)
  if (contractIntegration) {
    try {
      // Calculate earnings for this cache hit (70/20/5/5 split)
      const earnings = contractIntegration.calculateEarnings(1);
      metrics.totalEarnings += earnings.provider; // 70% goes to provider
      
      // Batch metrics submission every 100 cache hits for efficiency
      if (metrics.cacheHits % 100 === 0) {
        await contractIntegration.submitMetricsBatch(
          100,
          metrics.avgResponseTime,
          (metrics.cacheHits / metrics.totalRequests) * 100
        );
        logger.info(`💰 Batch submitted: 100 hits = ${(earnings.provider * 100).toFixed(4)} SOL earned`);
      }
    } catch (error) {
      logger.error('Failed to track cache hit on-chain:', error);
    }
  } else {
    // Fallback: estimate earnings locally
    metrics.totalEarnings += 0.00007; // 70% of 0.0001 SOL per hit
  }
}

/**
 * Express server setup
 */
const app = express();
app.use(express.json({ limit: '50mb' }));

// Middleware for timing
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    nodeId: config.NODE_ID,
    registered: isRegistered,
    metrics: getMetrics(),
  });
});

// Main RPC endpoint
app.post('/', async (req, res) => {
  const startTime = Date.now();
  metrics.totalRequests++;
  
  try {
    const { method, params = [], id = 1 } = req.body;
    
    // Generate cache key
    const cacheKey = getCacheKey(method, params);
    
    // Check cache
    const cachedResult = cache.get(cacheKey);
    if (cachedResult !== undefined) {
      // Cache hit!
      metrics.cacheHits++;
      reportCacheHit();
      
      const responseTime = Date.now() - startTime;
      metrics.responseTimes.push(responseTime);
      if (metrics.responseTimes.length > 100) {
        metrics.responseTimes.shift();
      }
      
      logger.debug(`Cache hit for ${method}`, { responseTime });
      
      return res.json({
        jsonrpc: '2.0',
        id,
        result: cachedResult,
        cached: true,
        servedBy: config.NODE_ID,
      });
    }
    
    // Cache miss - forward to RPC
    metrics.cacheMisses++;
    logger.debug(`Cache miss for ${method}, forwarding to RPC`);
    
    const result = await forwardToRPC(method, params);
    
    // Cache the result
    const ttl = getCacheTTL(method);
    cache.set(cacheKey, result, ttl);
    
    const responseTime = Date.now() - startTime;
    metrics.responseTimes.push(responseTime);
    if (metrics.responseTimes.length > 100) {
      metrics.responseTimes.shift();
    }
    
    res.json({
      jsonrpc: '2.0',
      id,
      result,
      cached: false,
      servedBy: config.NODE_ID,
    });
    
  } catch (error: any) {
    metrics.errors++;
    logger.error('Request error:', error);
    
    res.json({
      jsonrpc: '2.0',
      id: req.body.id || 1,
      error: {
        code: -32603,
        message: error.message,
      },
    });
  }
});

// Batch RPC endpoint
app.post('/batch', async (req, res) => {
  const requests = req.body;
  
  if (!Array.isArray(requests)) {
    return res.status(400).json({
      error: 'Batch request must be an array',
    });
  }
  
  const responses = await Promise.all(
    requests.map(async (request) => {
      try {
        const { method, params = [], id = 1 } = request;
        const cacheKey = getCacheKey(method, params);
        
        // Check cache
        const cachedResult = cache.get(cacheKey);
        if (cachedResult !== undefined) {
          metrics.cacheHits++;
          reportCacheHit();
          return {
            jsonrpc: '2.0',
            id,
            result: cachedResult,
          };
        }
        
        // Forward to RPC
        metrics.cacheMisses++;
        const result = await forwardToRPC(method, params);
        
        // Cache result
        const ttl = getCacheTTL(method);
        cache.set(cacheKey, result, ttl);
        
        return {
          jsonrpc: '2.0',
          id,
          result,
        };
      } catch (error: any) {
        return {
          jsonrpc: '2.0',
          id: request.id || 1,
          error: {
            code: -32603,
            message: error.message,
          },
        };
      }
    })
  );
  
  res.json(responses);
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.json(getMetrics());
});

// Cache stats endpoint
app.get('/cache/stats', (req, res) => {
  res.json({
    keys: cache.keys().length,
    stats: cache.getStats(),
    ttls: {
      default: config.CACHE_TTL_DEFAULT,
      static: config.CACHE_TTL_STATIC,
      dynamic: config.CACHE_TTL_DYNAMIC,
    },
  });
});

// Clear cache endpoint (for testing)
app.post('/cache/clear', (req, res) => {
  cache.flushAll();
  res.json({ message: 'Cache cleared' });
});

/**
 * Start the cache node
 */
async function start() {
  logger.info(`
╔══════════════════════════════════════════════════════════╗
║           WHISTLE Cache Node Starting                    ║
╠══════════════════════════════════════════════════════════╣
║  Node ID: ${config.NODE_ID.padEnd(47)}║
║  Port: ${config.NODE_PORT.toString().padEnd(50)}║
║  Wallet: ${(config.WALLET_ADDRESS.substring(0, 44) || 'Not configured').padEnd(48)}║
╚══════════════════════════════════════════════════════════╝
  `);
  
  // Validate configuration
  if (!config.WALLET_ADDRESS) {
    logger.warn('⚠️  No wallet address configured - earnings will not be tracked');
  }
  
  // Initialize smart contract integration
  if (config.WALLET_ADDRESS) {
    try {
      contractIntegration = new ContractIntegration(
        config.RPC_ENDPOINTS[0],
        config.NODE_ID,
        config.WALLET_ADDRESS
      );
      await contractIntegration.initialize();
      
      // Get initial stats from chain
      const stats = await contractIntegration.getCacheNodeStats();
      logger.info('📊 On-chain stats:', stats);
      
      // Update local metrics with chain data
      metrics.totalEarnings = stats.totalEarned;
      
    } catch (error) {
      logger.warn('Could not initialize contract integration:', error);
    }
  }
  
  // Connect to coordinator
  try {
    await connectToCoordinator();
  } catch (error) {
    logger.warn('Could not connect to coordinator, running standalone');
  }
  
  // Start Express server
  const server = app.listen(config.NODE_PORT, () => {
    logger.info(`✅ Cache node listening on port ${config.NODE_PORT}`);
    logger.info('📊 Metrics available at /metrics');
    logger.info('💰 Start earning by serving cached RPC responses!');
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('Shutting down gracefully...');
    
    if (coordinatorWs) {
      coordinatorWs.close();
    }
    
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
  
  // Report metrics periodically
  setInterval(() => {
    const metrics = getMetrics();
    logger.info('📈 Node metrics:', metrics);
  }, 60000); // Every minute
}

// Start the node
start().catch((error) => {
  logger.error('Failed to start cache node:', error);
  process.exit(1);
});

export { app, cache, metrics };


