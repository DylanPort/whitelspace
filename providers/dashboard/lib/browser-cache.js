/**
 * Browser-based Cache Node
 * 
 * Runs in the browser, connects to coordinator via WebSocket,
 * caches RPC responses locally, and reports metrics.
 */

// Cache TTLs (in milliseconds)
const CACHE_TTL = {
  getSlot: 400,
  getBlockHeight: 400,
  getLatestBlockhash: 400,
  getHealth: 1000,
  getEpochInfo: 5000,
  getEpochSchedule: 60000,
  getRecentPerformanceSamples: 10000,
  getAccountInfo: 2000,
  getBalance: 2000,
  getTokenAccountBalance: 2000,
  getTransaction: 300000,
  getBlock: 3600000,
  getVersion: 300000,
  getGenesisHash: 86400000,
  getClusterNodes: 60000,
  getVoteAccounts: 30000,
  default: 1000
};

// Methods that should never be cached
const NO_CACHE_METHODS = [
  'sendTransaction',
  'simulateTransaction',
  'requestAirdrop',
  'getSignatureStatuses'
];

class BrowserCacheNode {
  constructor(options = {}) {
    this.coordinatorUrl = options.coordinatorUrl || 'ws://localhost:3003/ws';
    this.upstreamRpc = options.upstreamRpc || 'https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba';
    this.wallet = options.wallet || null;
    this.name = options.name || 'Browser Node';
    
    this.ws = null;
    this.nodeId = null;
    this.connected = false;
    this.registered = false;
    
    // Cache storage (in-memory)
    this.cache = new Map();
    
    // Metrics
    this.metrics = {
      requests: 0,
      hits: 0,
      misses: 0,
      errors: 0,
      bytesSaved: 0,
      bytesServed: 0,
      startTime: Date.now()
    };
    
    // Callbacks
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onMetricsUpdate = options.onMetricsUpdate || (() => {});
    this.onCacheUpdate = options.onCacheUpdate || (() => {});
    this.onError = options.onError || (() => {});
    
    // Metrics reporting interval
    this.reportInterval = null;
    
    // Cache cleanup interval
    this.cleanupInterval = null;
  }
  
  // Connect to coordinator
  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.coordinatorUrl);
        
        this.ws.onopen = () => {
          console.log('[BrowserCache] Connected to coordinator');
          this.connected = true;
          this.onStatusChange({ connected: true, registered: false });
          
          // Register with wallet if available
          if (this.wallet) {
            this.register(this.wallet, this.name);
          }
          
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (e) {
            console.error('[BrowserCache] Invalid message:', e);
          }
        };
        
        this.ws.onclose = () => {
          console.log('[BrowserCache] Disconnected from coordinator');
          this.connected = false;
          this.registered = false;
          this.onStatusChange({ connected: false, registered: false });
          
          // Stop intervals
          this.stopIntervals();
          
          // Attempt reconnect after 5 seconds
          setTimeout(() => {
            if (!this.connected) {
              console.log('[BrowserCache] Attempting reconnect...');
              this.connect().catch(() => {});
            }
          }, 5000);
        };
        
        this.ws.onerror = (error) => {
          console.error('[BrowserCache] WebSocket error:', error);
          this.onError(error);
          reject(error);
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  // Register with coordinator
  register(wallet, name) {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected to coordinator');
    }
    
    this.wallet = wallet;
    this.name = name;
    
    this.ws.send(JSON.stringify({
      type: 'register',
      wallet,
      name
    }));
  }
  
  // Handle messages from coordinator
  handleMessage(message) {
    switch (message.type) {
      case 'welcome':
        this.nodeId = message.nodeId;
        console.log('[BrowserCache] Received node ID:', this.nodeId);
        break;
        
      case 'registered':
        this.registered = true;
        this.onStatusChange({ 
          connected: true, 
          registered: true,
          nodeId: this.nodeId,
          tier: message.tier,
          multiplier: message.multiplier
        });
        
        // Start metrics reporting
        this.startIntervals();
        
        console.log('[BrowserCache] Registered as Tier', message.tier, 'node');
        break;
        
      case 'pong':
        // Coordinator is alive
        break;
        
      case 'cache_request':
        // Coordinator asking us to cache something
        this.handleCacheRequest(message);
        break;
        
      default:
        console.log('[BrowserCache] Unknown message:', message.type);
    }
  }
  
  // Start background intervals
  startIntervals() {
    // Report metrics every 30 seconds
    this.reportInterval = setInterval(() => {
      this.reportMetrics();
    }, 30000);
    
    // Clean expired cache entries every 10 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupCache();
    }, 10000);
  }
  
  // Stop intervals
  stopIntervals() {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  
  // Report metrics to coordinator
  reportMetrics() {
    if (!this.connected || !this.ws || !this.registered) return;
    
    this.ws.send(JSON.stringify({
      type: 'metrics',
      ...this.metrics,
      uptime: Math.floor((Date.now() - this.metrics.startTime) / 1000),
      cacheSize: this.cache.size
    }));
    
    this.onMetricsUpdate(this.getMetrics());
  }
  
  // Get current metrics
  getMetrics() {
    const hitRate = this.metrics.requests > 0
      ? ((this.metrics.hits / this.metrics.requests) * 100).toFixed(2)
      : 0;
    
    return {
      nodeId: this.nodeId,
      requests: this.metrics.requests,
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      errors: this.metrics.errors,
      hitRate: parseFloat(hitRate),
      bytesSaved: this.metrics.bytesSaved,
      bytesServed: this.metrics.bytesServed,
      cacheSize: this.cache.size,
      uptime: Math.floor((Date.now() - this.metrics.startTime) / 1000),
      connected: this.connected,
      registered: this.registered
    };
  }
  
  // Clean expired cache entries
  cleanupCache() {
    const now = Date.now();
    let cleaned = 0;
    
    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      console.log(`[BrowserCache] Cleaned ${cleaned} expired entries`);
    }
  }
  
  // Generate cache key
  getCacheKey(method, params) {
    return `${method}:${JSON.stringify(params || [])}`;
  }
  
  // Get TTL for method
  getTTL(method) {
    return CACHE_TTL[method] || CACHE_TTL.default;
  }
  
  // Check if method should be cached
  shouldCache(method) {
    return !NO_CACHE_METHODS.includes(method);
  }
  
  // Make RPC request (with caching)
  async rpcRequest(method, params = []) {
    this.metrics.requests++;
    
    // Check if cacheable
    if (!this.shouldCache(method)) {
      return this.fetchFromUpstream(method, params);
    }
    
    const cacheKey = this.getCacheKey(method, params);
    const cached = this.cache.get(cacheKey);
    
    // Check cache
    if (cached && Date.now() < cached.expiresAt) {
      this.metrics.hits++;
      this.metrics.bytesSaved += cached.size;
      this.metrics.bytesServed += cached.size;
      this.onMetricsUpdate(this.getMetrics());
      return cached.result;
    }
    
    // Cache miss - fetch from upstream
    this.metrics.misses++;
    
    try {
      const result = await this.fetchFromUpstream(method, params);
      
      // Cache the result
      const resultStr = JSON.stringify(result);
      const size = resultStr.length;
      
      const cacheEntry = {
        method,
        params,
        result,
        size,
        cachedAt: Date.now(),
        expiresAt: Date.now() + this.getTTL(method),
        ttl: this.getTTL(method)
      };
      
      this.cache.set(cacheKey, cacheEntry);
      
      this.metrics.bytesServed += size;
      this.onMetricsUpdate(this.getMetrics());
      this.onCacheUpdate(this.getCacheEntries());
      
      return result;
      
    } catch (error) {
      this.metrics.errors++;
      this.onMetricsUpdate(this.getMetrics());
      throw error;
    }
  }
  
  // Fetch from upstream RPC
  async fetchFromUpstream(method, params) {
    const response = await fetch(this.upstreamRpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'RPC Error');
    }
    
    return data.result;
  }
  
  // Handle cache request from coordinator (future: distributed caching)
  async handleCacheRequest(message) {
    const { requestId, method, params } = message;
    
    try {
      const result = await this.rpcRequest(method, params);
      
      this.ws.send(JSON.stringify({
        type: 'cache_result',
        requestId,
        result,
        success: true
      }));
    } catch (error) {
      this.ws.send(JSON.stringify({
        type: 'cache_result',
        requestId,
        error: error.message,
        success: false
      }));
    }
  }
  
  // Disconnect
  disconnect() {
    this.stopIntervals();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connected = false;
    this.registered = false;
    this.onStatusChange({ connected: false, registered: false });
  }
  
  // Clear cache
  clearCache() {
    this.cache.clear();
    this.onCacheUpdate([]);
    console.log('[BrowserCache] Cache cleared');
  }
  
  // Get all cache entries for display
  getCacheEntries() {
    const entries = [];
    const now = Date.now();
    
    this.cache.forEach((entry, key) => {
      const timeRemaining = Math.max(0, entry.expiresAt - now);
      entries.push({
        key,
        method: entry.method,
        params: entry.params,
        size: entry.size,
        cachedAt: entry.cachedAt,
        expiresAt: entry.expiresAt,
        ttl: entry.ttl,
        timeRemaining,
        isExpired: timeRemaining === 0,
        // Truncate result for display
        preview: this.getResultPreview(entry.result)
      });
    });
    
    // Sort by most recent first
    return entries.sort((a, b) => b.cachedAt - a.cachedAt);
  }
  
  // Get a preview of the result for display
  getResultPreview(result) {
    if (result === null || result === undefined) return 'null';
    if (typeof result === 'number') return result.toLocaleString();
    if (typeof result === 'string') return result.slice(0, 50) + (result.length > 50 ? '...' : '');
    if (typeof result === 'boolean') return result.toString();
    if (typeof result === 'object') {
      const str = JSON.stringify(result);
      return str.slice(0, 80) + (str.length > 80 ? '...' : '');
    }
    return String(result).slice(0, 50);
  }
  
  // Get cacheable methods info
  static getCacheableMethods() {
    return Object.entries(CACHE_TTL)
      .filter(([method]) => method !== 'default')
      .map(([method, ttl]) => ({
        method,
        ttl,
        ttlFormatted: ttl >= 60000 ? `${(ttl / 60000).toFixed(0)}m` : ttl >= 1000 ? `${(ttl / 1000).toFixed(1)}s` : `${ttl}ms`,
        cacheable: !NO_CACHE_METHODS.includes(method)
      }));
  }
  
  // Get non-cacheable methods
  static getNonCacheableMethods() {
    return NO_CACHE_METHODS;
  }
}

// Export cache TTLs and methods for external use
export { CACHE_TTL, NO_CACHE_METHODS };

// Export for use in React
export { BrowserCacheNode };
export default BrowserCacheNode;

