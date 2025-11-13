// Quick API test without database
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());

// Mock data for testing
const mockTransactions = [
  {
    signature: '5J7zk3qQ9X8...',
    slot: 250000000,
    block_time: Math.floor(Date.now() / 1000) - 3600,
    from_address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    to_address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    amount: 1000000,
    status: 'success',
    fee: 5000,
    program_id: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
  },
  {
    signature: '2K9pL4mR8Y7...',
    slot: 250000100,
    block_time: Math.floor(Date.now() / 1000) - 1800,
    from_address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    to_address: 'So11111111111111111111111111111111111111112',
    amount: 500000,
    status: 'success',
    fee: 5000,
    program_id: 'So11111111111111111111111111111111111111112'
  }
];

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mode: 'mock-data-testing',
    database: 'disabled',
  });
});

// Stats
app.get('/api/stats', (req, res) => {
  res.json({
    provider: {
      status: 'active',
      uptime: process.uptime(),
      queries_served: 42,
      cache_hit_rate: 0.65,
    },
    blockchain: {
      latest_slot: 250000200,
      transactions_indexed: mockTransactions.length,
      blocks_indexed: 200,
      last_update: new Date().toISOString(),
    },
  });
});

// Transactions query
app.get('/api/transactions', (req, res) => {
  const { wallet, limit = '10', status, from, to } = req.query;
  
  let results = [...mockTransactions];
  
  // Filter by wallet
  if (wallet) {
    results = results.filter(tx => 
      tx.from_address === wallet || tx.to_address === wallet
    );
  }
  
  // Filter by status
  if (status) {
    results = results.filter(tx => tx.status === status);
  }
  
  // Filter by time
  if (from) {
    const fromTime = parseInt(from as string);
    results = results.filter(tx => tx.block_time >= fromTime);
  }
  if (to) {
    const toTime = parseInt(to as string);
    results = results.filter(tx => tx.block_time <= toTime);
  }
  
  // Limit
  const limitNum = parseInt(limit as string);
  results = results.slice(0, limitNum);
  
  res.json({
    data: results,
    count: results.length,
    query: { wallet, limit, status, from, to },
    cached: false,
  });
});

// Single transaction
app.get('/api/transaction/:signature', (req, res) => {
  const { signature } = req.params;
  const tx = mockTransactions.find(t => t.signature === signature);
  
  if (!tx) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  
  res.json({
    data: tx,
    cached: false,
  });
});

// Balance (mock)
app.get('/api/balance/:address', (req, res) => {
  res.json({
    address: req.params.address,
    balance: 1234567890,
    token_accounts: [],
    last_update: new Date().toISOString(),
  });
});

// NFTs (mock)
app.get('/api/nfts/:owner', (req, res) => {
  res.json({
    owner: req.params.owner,
    nfts: [],
    count: 0,
  });
});

// Metrics (Prometheus format)
app.get('/metrics', (req, res) => {
  res.type('text/plain').send(`
# HELP whistle_queries_total Total number of queries
# TYPE whistle_queries_total counter
whistle_queries_total 42

# HELP whistle_cache_hits_total Cache hits
# TYPE whistle_cache_hits_total counter
whistle_cache_hits_total 27

# HELP whistle_response_time_seconds Response time in seconds
# TYPE whistle_response_time_seconds histogram
whistle_response_time_seconds_bucket{le="0.05"} 35
whistle_response_time_seconds_bucket{le="0.1"} 40
whistle_response_time_seconds_bucket{le="0.5"} 42
whistle_response_time_seconds_bucket{le="+Inf"} 42
whistle_response_time_seconds_sum 1.234
whistle_response_time_seconds_count 42
`);
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 WHISTLE API Test Server (Mock Data)\n');
  console.log(`   Status: Running`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   Mode: Mock Data Testing`);
  console.log(`   Database: Disabled\n`);
  console.log('📋 Available Endpoints:\n');
  console.log(`   GET /api/health`);
  console.log(`   GET /api/stats`);
  console.log(`   GET /api/transactions?wallet=ADDRESS&limit=10`);
  console.log(`   GET /api/transaction/:signature`);
  console.log(`   GET /api/balance/:address`);
  console.log(`   GET /api/nfts/:owner`);
  console.log(`   GET /metrics\n`);
  console.log('🧪 Test with: curl http://localhost:8080/api/health\n');
});

