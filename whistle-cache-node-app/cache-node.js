const EventEmitter = require('events');
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const os = require('os');

class CacheNode extends EventEmitter {
  constructor(config) {
    super();
    
    this.config = {
      port: config.port || 8545,
      walletAddress: config.walletAddress || '',
      primaryRpc: config.primaryRpc || 'https://api.mainnet-beta.solana.com',
      coordinatorUrl: 'https://whitelspace-1.onrender.com',
      cacheTtlDefault: 10,
      cacheTtlStatic: 60,
      cacheTtlDynamic: 2,
      maxCacheSize: 50000,  // Increased for disk cache
      requestTimeout: 5000,
    };

    this.rpcEndpoints = [
      this.config.primaryRpc,
      'https://solana-api.projectserum.com',
      'https://rpc.ankr.com/solana',
    ];

    this.nodeId = this.generateNodeId();
    this.server = null;
    this.app = null;
    this.isRegistered = false;
    this.heartbeatInterval = null;
    this.db = null;
    this.cleanupInterval = null;

    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      totalRequests: 0,
      totalEarnings: 0,
      startTime: null,
      errors: 0,
      responseTimes: [],
    };

    this.logs = [];
    
    // Initialize persistent disk cache (must be after this.logs is set)
    this.initDiskCache();
  }

  initDiskCache() {
    try {
      const Database = require('better-sqlite3');
      
      // Store cache in user's app data folder
      const cacheDir = path.join(os.homedir(), '.whistle-cache-node');
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      
      this.cachePath = path.join(cacheDir, 'cache.db');
      this.db = new Database(this.cachePath);
      
      // Create cache table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cache (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_expires ON cache(expires_at);
      `);
      
      // Prepare statements for performance
      this.stmtGet = this.db.prepare('SELECT value, expires_at FROM cache WHERE key = ?');
      this.stmtSet = this.db.prepare('INSERT OR REPLACE INTO cache (key, value, expires_at, created_at) VALUES (?, ?, ?, ?)');
      this.stmtDelete = this.db.prepare('DELETE FROM cache WHERE key = ?');
      this.stmtCleanup = this.db.prepare('DELETE FROM cache WHERE expires_at < ?');
      this.stmtCount = this.db.prepare('SELECT COUNT(*) as count FROM cache');
      this.stmtSize = this.db.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()');
      
      // Get initial stats
      const count = this.stmtCount.get();
      this.log('info', `📁 Disk cache initialized: ${this.cachePath}`);
      this.log('info', `📊 Loaded ${count.count.toLocaleString()} cached entries from disk`);
      
      // Start cleanup interval (every 60 seconds)
      this.cleanupInterval = setInterval(() => {
        this.cleanupExpiredCache();
      }, 60000);
      
    } catch (error) {
      this.log('warn', `Could not initialize disk cache: ${error.message}`);
      this.log('info', 'Falling back to in-memory cache');
      this.db = null;
      
      // Fallback to in-memory cache
      const NodeCache = require('node-cache');
      this.memCache = new NodeCache({
        stdTTL: this.config.cacheTtlDefault,
        checkperiod: 60,
        maxKeys: this.config.maxCacheSize,
        useClones: false,
      });
    }
  }

  cleanupExpiredCache() {
    if (!this.db) return;
    
    try {
      const result = this.stmtCleanup.run(Date.now());
      if (result.changes > 0) {
        this.log('info', `🧹 Cleaned up ${result.changes} expired cache entries`);
      }
    } catch (error) {
      // Silently fail cleanup
    }
  }

  cacheGet(key) {
    if (this.db) {
      try {
        const row = this.stmtGet.get(key);
        if (row && row.expires_at > Date.now()) {
          return JSON.parse(row.value);
        }
        // Expired or not found
        if (row) {
          this.stmtDelete.run(key);
        }
        return undefined;
      } catch (error) {
        return undefined;
      }
    } else if (this.memCache) {
      return this.memCache.get(key);
    }
    return undefined;
  }

  cacheSet(key, value, ttlSeconds) {
    if (this.db) {
      try {
        const expiresAt = Date.now() + (ttlSeconds * 1000);
        this.stmtSet.run(key, JSON.stringify(value), expiresAt, Date.now());
      } catch (error) {
        // Silently fail
      }
    } else if (this.memCache) {
      this.memCache.set(key, value, ttlSeconds);
    }
  }

  getCacheStats() {
    if (this.db) {
      try {
        const count = this.stmtCount.get();
        const size = this.stmtSize.get();
        return {
          entries: count.count,
          sizeBytes: size.size,
          sizeMB: (size.size / 1024 / 1024).toFixed(2),
          path: this.cachePath,
        };
      } catch (error) {
        return { entries: 0, sizeBytes: 0, sizeMB: '0', path: this.cachePath };
      }
    } else if (this.memCache) {
      return {
        entries: this.memCache.keys().length,
        sizeBytes: 0,
        sizeMB: 'N/A (memory)',
        path: 'In-memory',
      };
    }
    return { entries: 0, sizeBytes: 0, sizeMB: '0', path: 'None' };
  }

  generateNodeId() {
    return 'node_' + crypto.createHash('sha256')
      .update(this.config.walletAddress || '')
      .update(Date.now().toString())
      .digest('hex')
      .substring(0, 16);
  }

  log(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };
    
    this.logs.push(logEntry);
    if (this.logs.length > 500) {
      this.logs.shift();
    }
    
    this.emit('log', logEntry);
  }

  getCacheKey(method, params) {
    return crypto.createHash('sha256')
      .update(JSON.stringify({ method, params }))
      .digest('hex');
  }

  getCacheTTL(method) {
    const staticMethods = ['getAccountInfo', 'getTransaction', 'getBlock', 'getSignaturesForAddress'];
    const dynamicMethods = ['getSlot', 'getBlockHeight', 'getRecentBlockhash', 'getLatestBlockhash'];

    if (staticMethods.includes(method)) return this.config.cacheTtlStatic;
    if (dynamicMethods.includes(method)) return this.config.cacheTtlDynamic;
    return this.config.cacheTtlDefault;
  }

  async forwardToRPC(method, params, rpcIndex = 0) {
    if (rpcIndex >= this.rpcEndpoints.length) {
      throw new Error('All RPC endpoints failed');
    }

    const rpcUrl = this.rpcEndpoints[rpcIndex];

    try {
      const response = await axios.post(
        rpcUrl,
        { jsonrpc: '2.0', id: 1, method, params },
        { timeout: this.config.requestTimeout, headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result;
    } catch (error) {
      this.log('warn', `RPC endpoint ${rpcUrl} failed: ${error.message}`);
      return this.forwardToRPC(method, params, rpcIndex + 1);
    }
  }

  async reportCacheHit() {
    // Estimate earnings (70% of 0.0001 SOL per hit)
    this.metrics.totalEarnings += 0.00007;
    
    // Report to coordinator via HTTP (batched - every 10 hits)
    if (this.isRegistered && this.metrics.cacheHits % 10 === 0) {
      try {
        await axios.post(`${this.config.coordinatorUrl}/api/cache-hit`, {
          nodeId: this.nodeId,
          wallet: this.config.walletAddress,
          hits: 10,
          timestamp: Date.now(),
        }, { timeout: 5000 });
      } catch (error) {
        // Silently fail - don't spam logs
      }
    }
  }

  getMetrics() {
    const uptime = this.metrics.startTime ? Date.now() - this.metrics.startTime : 0;
    const hitRate = this.metrics.totalRequests > 0
      ? ((this.metrics.cacheHits / this.metrics.totalRequests) * 100).toFixed(2)
      : '0.00';
    
    const avgResponseTime = this.metrics.responseTimes.length > 0
      ? Math.round(this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length)
      : 0;

    const cacheStats = this.getCacheStats();

    return {
      nodeId: this.nodeId,
      cacheHits: this.metrics.cacheHits,
      cacheMisses: this.metrics.cacheMisses,
      totalRequests: this.metrics.totalRequests,
      hitRate: hitRate + '%',
      totalEarnings: this.metrics.totalEarnings.toFixed(6),
      uptime,
      uptimeFormatted: this.formatUptime(uptime),
      errors: this.metrics.errors,
      avgResponseTime,
      cacheSize: cacheStats.entries,
      cacheSizeMB: cacheStats.sizeMB,
      cachePath: cacheStats.path,
      walletAddress: this.config.walletAddress,
      port: this.config.port,
    };
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  emitCacheActivity(type, method, params) {
    const time = new Date().toLocaleTimeString();
    let paramsStr = '';
    
    try {
      if (params && params.length > 0) {
        // Truncate params for display
        paramsStr = JSON.stringify(params).substring(0, 60);
        if (paramsStr.length >= 60) paramsStr += '...';
      }
    } catch (e) {
      paramsStr = '';
    }
    
    this.emit('cache-activity', { type, method, params: paramsStr, time });
  }

  async connectToCoordinator() {
    this.log('info', 'Connecting to coordinator network...');
    
    try {
      // Register with coordinator via HTTP
      const response = await axios.post(`${this.config.coordinatorUrl}/api/register`, {
        nodeId: this.nodeId,
        wallet: this.config.walletAddress,
        endpoint: `http://localhost:${this.config.port}`,
        capabilities: {
          cacheSize: this.config.maxCacheSize,
          ttl: this.config.cacheTtlDefault,
        },
        version: '1.0.0',
      }, { timeout: 10000 });

      if (response.data && response.data.success) {
        this.isRegistered = true;
        this.log('info', '✅ Successfully registered with coordinator');
        
        // Start heartbeat interval
        this.startHeartbeat();
      } else {
        this.log('warn', 'Coordinator registration response: ' + JSON.stringify(response.data));
        this.isRegistered = true; // Continue anyway
        this.startHeartbeat();
      }
    } catch (error) {
      // If coordinator doesn't have /api/register, just run standalone
      this.log('warn', `Coordinator: ${error.message} - Running standalone mode`);
      this.isRegistered = true; // Run standalone
    }
  }

  startHeartbeat() {
    // Send heartbeat every 30 seconds
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(async () => {
      if (!this.server) return;
      
      try {
        await axios.post(`${this.config.coordinatorUrl}/api/heartbeat`, {
          nodeId: this.nodeId,
          wallet: this.config.walletAddress,
          metrics: this.getMetrics(),
        }, { timeout: 5000 });
      } catch (error) {
        // Silently fail heartbeat
      }
    }, 30000);
  }

  setupExpress() {
    this.app = express();
    this.app.use(express.json({ limit: '50mb' }));

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        nodeId: this.nodeId,
        registered: this.isRegistered,
        metrics: this.getMetrics(),
      });
    });

    // Main RPC endpoint
    this.app.post('/', async (req, res) => {
      const startTime = Date.now();
      this.metrics.totalRequests++;

      try {
        const { method, params = [], id = 1 } = req.body;
        const cacheKey = this.getCacheKey(method, params);

        // Check cache (persistent disk cache)
        const cachedResult = this.cacheGet(cacheKey);
        if (cachedResult !== undefined) {
          this.metrics.cacheHits++;
          this.reportCacheHit();
          this.emitCacheActivity('hit', method, params);

          const responseTime = Date.now() - startTime;
          this.metrics.responseTimes.push(responseTime);
          if (this.metrics.responseTimes.length > 100) {
            this.metrics.responseTimes.shift();
          }

          return res.json({
            jsonrpc: '2.0',
            id,
            result: cachedResult,
            cached: true,
            servedBy: this.nodeId,
          });
        }

        // Cache miss
        this.metrics.cacheMisses++;
        this.emitCacheActivity('miss', method, params);
        const result = await this.forwardToRPC(method, params);

        // Cache result to disk
        const ttl = this.getCacheTTL(method);
        this.cacheSet(cacheKey, result, ttl);
        this.emitCacheActivity('store', method, params);

        const responseTime = Date.now() - startTime;
        this.metrics.responseTimes.push(responseTime);
        if (this.metrics.responseTimes.length > 100) {
          this.metrics.responseTimes.shift();
        }

        res.json({
          jsonrpc: '2.0',
          id,
          result,
          cached: false,
          servedBy: this.nodeId,
        });
      } catch (error) {
        this.metrics.errors++;
        this.log('error', `Request error: ${error.message}`);

        res.json({
          jsonrpc: '2.0',
          id: req.body.id || 1,
          error: { code: -32603, message: error.message },
        });
      }
    });

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      res.json(this.getMetrics());
    });
  }

  async start() {
    this.log('info', '🚀 Starting WHISTLE Cache Node...');
    this.metrics.startTime = Date.now();

    if (!this.config.walletAddress) {
      this.log('warn', '⚠️ No wallet address configured - earnings will not be tracked');
    }

    this.setupExpress();

    // Connect to coordinator
    await this.connectToCoordinator();

    // Start server
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, () => {
          this.log('info', `✅ Cache node listening on port ${this.config.port}`);
          this.log('info', '💰 Start earning by serving cached RPC responses!');
          this.emit('started');

          // Emit metrics every 5 seconds
          this.metricsInterval = setInterval(() => {
            this.emit('metrics', this.getMetrics());
          }, 5000);

          resolve();
        });

        this.server.on('error', (error) => {
          this.log('error', `Server error: ${error.message}`);
          this.emit('error', error.message);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  stop() {
    this.log('info', '⏹ Stopping cache node...');

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close database connection
    if (this.db) {
      try {
        this.db.close();
        this.log('info', '💾 Cache database saved to disk');
      } catch (error) {
        // Ignore close errors
      }
      this.db = null;
    }

    if (this.server) {
      this.server.close(() => {
        this.log('info', 'Server stopped');
        this.emit('stopped');
      });
      this.server = null;
    }

    this.isRegistered = false;
  }
}

module.exports = CacheNode;

