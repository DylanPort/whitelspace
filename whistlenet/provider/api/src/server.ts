/**
 * WHISTLE Provider API Server
 * Production-ready RPC API for serving Solana blockchain data
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { Pool } from 'pg';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../config/config.env' });

// ============= CONFIGURATION =============

const PORT = parseInt(process.env.API_PORT || '8080');
const HOST = process.env.API_HOST || '0.0.0.0';
const MAX_QUERY_LIMIT = parseInt(process.env.MAX_QUERY_LIMIT || '1000');
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '60');

// ============= DATABASE CONNECTION =============

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  min: parseInt(process.env.DB_POOL_MIN || '5'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    process.exit(1);
  }
  console.log('✅ Database connected');
  release();
});

// ============= CACHE SETUP =============

const cache = new NodeCache({
  stdTTL: CACHE_TTL,
  checkperiod: CACHE_TTL * 0.2,
  useClones: false,
});

// ============= EXPRESS APP SETUP =============

const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Response compression
app.use(cors({
  origin: process.env.CORS_ORIGINS || '*',
  credentials: true,
}));
app.use(express.json());
app.use(morgan('combined')); // Logging

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT || '60'),
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// ============= UTILITY FUNCTIONS =============

/**
 * Log query for analytics
 */
async function logQuery(
  endpoint: string,
  params: any,
  responseTime: number,
  statusCode: number,
  error?: string,
  clientIp?: string
) {
  try {
    await pool.query(
      `INSERT INTO query_logs (endpoint, params, response_time_ms, status_code, error, client_ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [endpoint, JSON.stringify(params), responseTime, statusCode, error, clientIp]
    );
    
    // Update provider stats
    await pool.query(
      `UPDATE provider_stats 
       SET queries_served = queries_served + 1,
           avg_response_time_ms = (avg_response_time_ms * queries_served + $1) / (queries_served + 1),
           updated_at = NOW()`,
      [responseTime]
    );
  } catch (err) {
    console.error('Error logging query:', err);
  }
}

/**
 * Generate cache key
 */
function getCacheKey(endpoint: string, params: any): string {
  return `${endpoint}:${JSON.stringify(params)}`;
}

// ============= API ENDPOINTS =============

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const dbResult = await pool.query('SELECT NOW()');
    const stats = await pool.query('SELECT * FROM provider_stats LIMIT 1');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime(),
      stats: stats.rows[0] || {},
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

/**
 * GET /api/transactions
 * Get transactions for a wallet
 */
app.get('/api/transactions', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { wallet, from, to, limit = 100, offset = 0, program, status } = req.query;

  try {
    if (!wallet) {
      return res.status(400).json({ error: 'wallet parameter required' });
    }

    const queryLimit = Math.min(parseInt(limit as string), MAX_QUERY_LIMIT);
    const cacheKey = getCacheKey('transactions', { wallet, from, to, limit: queryLimit, offset, program, status });
    
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      const responseTime = Date.now() - startTime;
      await logQuery('/api/transactions', req.query, responseTime, 200, undefined, req.ip);
      return res.json({ data: cached, cached: true, responseTime });
    }

    // Build query
    let query = `
      SELECT signature, slot, block_time, from_address, to_address, 
             amount, fee, program_id, status, logs
      FROM transactions
      WHERE (from_address = $1 OR to_address = $1)
    `;
    const params: any[] = [wallet];
    let paramCount = 1;

    if (from) {
      paramCount++;
      query += ` AND block_time >= $${paramCount}`;
      params.push(parseInt(from as string));
    }

    if (to) {
      paramCount++;
      query += ` AND block_time <= $${paramCount}`;
      params.push(parseInt(to as string));
    }

    if (program) {
      paramCount++;
      query += ` AND program_id = $${paramCount}`;
      params.push(program);
    }

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY block_time DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(queryLimit, parseInt(offset as string));

    const result = await pool.query(query, params);
    const responseTime = Date.now() - startTime;

    // Cache result
    cache.set(cacheKey, result.rows);

    await logQuery('/api/transactions', req.query, responseTime, 200, undefined, req.ip);

    res.json({
      data: result.rows,
      count: result.rows.length,
      cached: false,
      responseTime,
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    await logQuery('/api/transactions', req.query, responseTime, 500, error.message, req.ip);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/balances
 * Get token balances for a wallet
 */
app.get('/api/balances', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { wallet } = req.query;

  try {
    if (!wallet) {
      return res.status(400).json({ error: 'wallet parameter required' });
    }

    const cacheKey = getCacheKey('balances', { wallet });
    const cached = cache.get(cacheKey);
    if (cached) {
      const responseTime = Date.now() - startTime;
      await logQuery('/api/balances', req.query, responseTime, 200, undefined, req.ip);
      return res.json({ data: cached, cached: true, responseTime });
    }

    const result = await pool.query(
      `SELECT mint, amount, decimals, ui_amount, last_updated
       FROM token_accounts
       WHERE owner = $1 AND amount > 0
       ORDER BY ui_amount DESC`,
      [wallet]
    );

    const responseTime = Date.now() - startTime;
    cache.set(cacheKey, result.rows);
    await logQuery('/api/balances', req.query, responseTime, 200, undefined, req.ip);

    res.json({
      data: result.rows,
      count: result.rows.length,
      cached: false,
      responseTime,
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    await logQuery('/api/balances', req.query, responseTime, 500, error.message, req.ip);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/nfts
 * Get NFTs for a wallet
 */
app.get('/api/nfts', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { wallet, verified, collection } = req.query;

  try {
    if (!wallet) {
      return res.status(400).json({ error: 'wallet parameter required' });
    }

    const cacheKey = getCacheKey('nfts', { wallet, verified, collection });
    const cached = cache.get(cacheKey);
    if (cached) {
      const responseTime = Date.now() - startTime;
      await logQuery('/api/nfts', req.query, responseTime, 200, undefined, req.ip);
      return res.json({ data: cached, cached: true, responseTime });
    }

    let query = `
      SELECT n.mint, n.name, n.symbol, n.uri, n.image, 
             n.description, n.attributes, n.collection, n.verified
      FROM nft_metadata n
      JOIN token_accounts t ON n.mint = t.mint
      WHERE t.owner = $1 AND t.amount > 0
    `;
    const params: any[] = [wallet];
    let paramCount = 1;

    if (verified === 'true') {
      query += ` AND n.verified = true`;
    }

    if (collection) {
      paramCount++;
      query += ` AND n.collection = $${paramCount}`;
      params.push(collection);
    }

    query += ` ORDER BY n.name`;

    const result = await pool.query(query, params);
    const responseTime = Date.now() - startTime;
    cache.set(cacheKey, result.rows);
    await logQuery('/api/nfts', req.query, responseTime, 200, undefined, req.ip);

    res.json({
      data: result.rows,
      count: result.rows.length,
      cached: false,
      responseTime,
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    await logQuery('/api/nfts', req.query, responseTime, 500, error.message, req.ip);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/transaction/:signature
 * Get single transaction by signature
 */
app.get('/api/transaction/:signature', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { signature } = req.params;

  try {
    const cacheKey = getCacheKey('transaction', { signature });
    const cached = cache.get(cacheKey);
    if (cached) {
      const responseTime = Date.now() - startTime;
      await logQuery('/api/transaction/:signature', req.params, responseTime, 200, undefined, req.ip);
      return res.json({ data: cached, cached: true, responseTime });
    }

    const result = await pool.query(
      `SELECT * FROM transactions WHERE signature = $1`,
      [signature]
    );

    const responseTime = Date.now() - startTime;
    
    if (result.rows.length === 0) {
      await logQuery('/api/transaction/:signature', req.params, responseTime, 404, 'Not found', req.ip);
      return res.status(404).json({ error: 'Transaction not found' });
    }

    cache.set(cacheKey, result.rows[0]);
    await logQuery('/api/transaction/:signature', req.params, responseTime, 200, undefined, req.ip);

    res.json({
      data: result.rows[0],
      cached: false,
      responseTime,
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    await logQuery('/api/transaction/:signature', req.params, responseTime, 500, error.message, req.ip);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stats
 * Get provider statistics
 */
app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const stats = await pool.query('SELECT * FROM provider_stats LIMIT 1');
    const txCount = await pool.query('SELECT COUNT(*) as total FROM transactions');
    const blockCount = await pool.query('SELECT COUNT(*) as total FROM blocks WHERE processed = true');
    const latestBlock = await pool.query('SELECT MAX(slot) as latest FROM blocks');

    res.json({
      provider: stats.rows[0] || {},
      blockchain: {
        transactions_indexed: parseInt(txCount.rows[0].total),
        blocks_processed: parseInt(blockCount.rows[0].total),
        latest_block: parseInt(latestBlock.rows[0].latest) || 0,
      },
      cache: {
        keys: cache.keys().length,
        hits: cache.getStats().hits,
        misses: cache.getStats().misses,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /metrics
 * Prometheus-style metrics
 */
app.get('/metrics', async (req: Request, res: Response) => {
  try {
    const stats = await pool.query('SELECT * FROM provider_stats LIMIT 1');
    const data = stats.rows[0] || {};

    const metrics = `
# HELP whistle_queries_total Total number of queries served
# TYPE whistle_queries_total counter
whistle_queries_total ${data.queries_served || 0}

# HELP whistle_uptime_percentage Provider uptime percentage
# TYPE whistle_uptime_percentage gauge
whistle_uptime_percentage ${data.uptime_percentage || 100}

# HELP whistle_response_time_ms Average response time in milliseconds
# TYPE whistle_response_time_ms gauge
whistle_response_time_ms ${data.avg_response_time_ms || 0}

# HELP whistle_cache_size Current cache size
# TYPE whistle_cache_size gauge
whistle_cache_size ${cache.keys().length}
    `.trim();

    res.type('text/plain').send(metrics);
  } catch (error: any) {
    res.status(500).send('Error generating metrics');
  }
});

// ============= ERROR HANDLING =============

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============= START SERVER =============

const server = app.listen(PORT, HOST, () => {
  console.log('');
  console.log('⚡ WHISTLE Provider API Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🌐 Listening on http://${HOST}:${PORT}`);
  console.log(`📊 Health: http://${HOST}:${PORT}/api/health`);
  console.log(`📈 Stats: http://${HOST}:${PORT}/api/stats`);
  console.log(`📉 Metrics: http://${HOST}:${PORT}/metrics`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /api/health');
  console.log('  GET  /api/transactions?wallet=...&from=...&to=...&limit=...');
  console.log('  GET  /api/balances?wallet=...');
  console.log('  GET  /api/nfts?wallet=...&verified=...&collection=...');
  console.log('  GET  /api/transaction/:signature');
  console.log('  GET  /api/stats');
  console.log('  GET  /metrics');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});

export default app;





