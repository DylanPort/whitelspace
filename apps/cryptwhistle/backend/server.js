import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const app = express();
const PORT = process.env.PORT || 3002;

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for WebAssembly/WebGPU
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: '*', // Configure appropriately in production
  credentials: true
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      cryptwhistle: 'active',
      whistlenet: 'active'
    },
    mode: 'client-side-ai',
    privacy: 'maximum'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'WHISTLE Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      cryptwhistle: '/api/models',
      providers: '/api/providers',
      network: '/api/network/stats',
      credits: '/api/credits/:wallet'
    }
  });
});

// Get available models
app.get('/api/models', (req, res) => {
  res.json({
    models: [
      {
        id: 'sentiment-analysis',
        name: 'DistilBERT Sentiment',
        type: 'client-side',
        privacy: 'maximum',
        size: '67MB',
        tasks: ['sentiment-analysis'],
        description: 'Analyze sentiment locally in browser'
      },
      {
        id: 'text-classification',
        name: 'DistilBERT Classifier',
        type: 'client-side',
        privacy: 'maximum',
        size: '67MB',
        tasks: ['text-classification'],
        description: 'Classify text locally in browser'
      },
      {
        id: 'feature-extraction',
        name: 'BERT Feature Extractor',
        type: 'client-side',
        privacy: 'maximum',
        size: '110MB',
        tasks: ['feature-extraction'],
        description: 'Extract text features locally'
      },
      {
        id: 'question-answering',
        name: 'DistilBERT QA',
        type: 'client-side',
        privacy: 'maximum',
        size: '67MB',
        tasks: ['question-answering'],
        description: 'Answer questions based on context locally'
      },
      {
        id: 'zero-shot-classification',
        name: 'BART Zero-Shot',
        type: 'client-side',
        privacy: 'maximum',
        size: '407MB',
        tasks: ['zero-shot-classification'],
        description: 'Classify without training data locally'
      }
    ],
    info: {
      execution: 'All models run client-side in browser',
      privacy: 'Data never leaves your device',
      technology: 'Transformers.js + WebGPU + WebAssembly'
    }
  });
});

// Model info endpoint
app.get('/api/models/:modelId', (req, res) => {
  const { modelId } = req.params;
  
  const models = {
    'sentiment-analysis': {
      id: 'sentiment-analysis',
      name: 'DistilBERT Sentiment',
      type: 'client-side',
      huggingface: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      size: '67MB',
      format: 'ONNX',
      quantized: true,
      capabilities: ['sentiment-analysis'],
      languages: ['en'],
      privacy: {
        level: 'maximum',
        dataLocation: 'client-device',
        execution: 'browser',
        logging: 'none'
      }
    },
    'text-classification': {
      id: 'text-classification',
      name: 'DistilBERT Classifier',
      type: 'client-side',
      huggingface: 'Xenova/distilbert-base-uncased',
      size: '67MB',
      format: 'ONNX',
      quantized: true,
      capabilities: ['text-classification'],
      languages: ['en'],
      privacy: {
        level: 'maximum',
        dataLocation: 'client-device',
        execution: 'browser',
        logging: 'none'
      }
    }
  };

  const model = models[modelId];
  if (!model) {
    return res.status(404).json({ error: 'Model not found' });
  }

  res.json(model);
});

// Client capabilities check
app.post('/api/capabilities', (req, res) => {
  const { userAgent, webgpu, webgl, wasm } = req.body;
  
  res.json({
    recommended: {
      execution: webgpu ? 'webgpu' : (webgl ? 'webgl' : 'wasm'),
      models: webgpu ? 'all' : 'quantized-only'
    },
    features: {
      webgpu: webgpu || false,
      webgl: webgl || false,
      wasm: wasm || true
    },
    privacy: {
      level: 'maximum',
      reason: 'All computation happens client-side'
    }
  });
});

// Query metadata (for analytics, no actual processing)
app.post('/api/query/metadata', (req, res) => {
  const { task, modelId, clientId } = req.body;
  
  // Server doesn't process queries - just logs metadata for analytics
  // No actual data is sent to server
  res.json({
    acknowledged: true,
    timestamp: new Date().toISOString(),
    message: 'Query will be processed client-side',
    privacy: 'Data never sent to server'
  });
});

// WebSocket for model loading progress (optional)
const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'model-loading') {
        // Client reporting model loading progress
        // Server just acknowledges, doesn't process
        ws.send(JSON.stringify({
          type: 'acknowledged',
          message: 'Loading progress received'
        }));
      }
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  });

  ws.send(JSON.stringify({
    type: 'connected',
    message: 'WebSocket connected',
    privacy: 'All AI processing happens client-side'
  }));
});

// Serve static files (client-side AI library)
app.use('/static', express.static('public'));

// Serve CryptWhistle documentation and playground
// Serve docs-site directory
app.use('/cryptwhistle/docs-site', express.static(join(__dirname, '../docs-site')));

// Serve the redirect index.html at /cryptwhistle
app.get('/cryptwhistle', (req, res) => {
  res.sendFile(join(__dirname, '../index.html'));
});

// =============================================================================
// WHISTLENET PROVIDER API ROUTES
// =============================================================================

// In-memory storage for provider data (in production, use a database)
const providerData = {
  nodes: new Map(),
  providers: new Map(),
  metrics: {
    totalRequests: 0,
    cacheHits: 0,
    totalBandwidthSaved: 0,
    lastHourRequests: 0
  },
  epoch: {
    current: 9,
    rewardPool: 100
  }
};

// Provider registration (off-chain fallback)
app.post('/api/providers/register', async (req, res) => {
  try {
    const { providerWallet, name, endpoint, signature } = req.body;
    
    if (!providerWallet || !endpoint) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Store provider (in production, verify signature)
    const provider = {
      wallet: providerWallet,
      name: name || `Provider-${providerWallet.slice(0, 8)}`,
      endpoint,
      registeredAt: Date.now(),
      isActive: true,
      totalEarned: 0,
      queriesServed: 0,
      nodeType: 'server',
      tier: 1
    };
    
    providerData.providers.set(providerWallet, provider);
    
    res.json({ 
      success: true, 
      message: 'Provider registered off-chain',
      provider 
    });
  } catch (error) {
    console.error('Provider registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Get provider by wallet
app.get('/api/providers/:wallet', (req, res) => {
  const { wallet } = req.params;
  const provider = providerData.providers.get(wallet);
  
  if (provider) {
    res.json({ provider });
  } else {
    res.status(404).json({ error: 'Provider not found' });
  }
});

// Get all providers
app.get('/api/providers', (req, res) => {
  const providers = Array.from(providerData.providers.values());
  res.json({ 
    providers,
    total: providers.length,
    online: providers.filter(p => p.isActive).length
  });
});

// Node registration
app.post('/api/nodes/register', (req, res) => {
  try {
    const { nodeId, wallet, name, endpoint, nodeType = 'server' } = req.body;
    
    const node = {
      id: nodeId || `node-${Date.now()}`,
      wallet,
      name: name || `Node-${wallet?.slice(0, 8) || 'anon'}`,
      endpoint,
      nodeType,
      tier: nodeType === 'server' ? 1 : 2,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      status: 'active',
      totalRequests: 0,
      totalHits: 0,
      bytesSaved: 0
    };
    
    providerData.nodes.set(node.id, node);
    
    res.json({ success: true, node });
  } catch (error) {
    res.status(500).json({ error: 'Node registration failed' });
  }
});

// Node metrics submission
app.post('/api/nodes/:nodeId/metrics', (req, res) => {
  try {
    const { nodeId } = req.params;
    const { requests, hits, misses, bytesSaved } = req.body;
    
    const node = providerData.nodes.get(nodeId);
    if (node) {
      node.totalRequests += requests || 0;
      node.totalHits += hits || 0;
      node.bytesSaved += bytesSaved || 0;
      node.lastSeen = Date.now();
      
      // Update global metrics
      providerData.metrics.totalRequests += requests || 0;
      providerData.metrics.cacheHits += hits || 0;
      providerData.metrics.totalBandwidthSaved += bytesSaved || 0;
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Metrics submission failed' });
  }
});

// Get network stats
app.get('/api/network/stats', (req, res) => {
  const nodes = Array.from(providerData.nodes.values());
  const activeNodes = nodes.filter(n => Date.now() - n.lastSeen < 120000);
  
  const totalHits = nodes.reduce((sum, n) => sum + n.totalHits, 0);
  const totalRequests = nodes.reduce((sum, n) => sum + n.totalRequests, 0);
  
  res.json({
    nodes: {
      total: nodes.length,
      active: activeNodes.length,
      server: nodes.filter(n => n.nodeType === 'server').length,
      browser: nodes.filter(n => n.nodeType === 'browser').length
    },
    metrics: {
      totalRequests,
      cacheHits: totalHits,
      hitRate: totalRequests > 0 ? ((totalHits / totalRequests) * 100).toFixed(2) : 0,
      bandwidthSaved: providerData.metrics.totalBandwidthSaved,
      lastHourRequests: providerData.metrics.lastHourRequests
    },
    epoch: providerData.epoch
  });
});

// Get active nodes list
app.get('/api/nodes', (req, res) => {
  const nodes = Array.from(providerData.nodes.values())
    .filter(n => Date.now() - n.lastSeen < 120000)
    .map(n => ({
      id: n.id,
      name: n.name,
      wallet: n.wallet,
      nodeType: n.nodeType,
      tier: n.tier,
      status: 'active',
      totalRequests: n.totalRequests,
      hitRate: n.totalRequests > 0 ? ((n.totalHits / n.totalRequests) * 100).toFixed(1) : 0
    }));
    
  res.json({ nodes, total: nodes.length });
});

// Credit account endpoints
app.get('/api/credits/deposit-info', (req, res) => {
  res.json({
    paymentVault: 'CU1ZcHccCbQT8iA6pcb3ZyTjog8ckmDHH8gaAmKfC73G',
    queryCostLamports: 10000,
    minDeposit: 1000000,
    network: 'mainnet-beta'
  });
});

app.get('/api/credits/stats', (req, res) => {
  res.json({
    totalDeposited: 0,
    totalQueries: providerData.metrics.totalRequests,
    activeUsers: providerData.providers.size
  });
});

app.get('/api/credits/:wallet', (req, res) => {
  const { wallet } = req.params;
  
  // Return mock credit data (in production, query database)
  res.json({
    wallet,
    balance: {
      lamports: 0,
      sol: 0,
      queries: 0
    },
    stats: {
      totalDeposited: 0,
      totalSpent: 0,
      queriesMade: 0
    }
  });
});

app.post('/api/credits/record-payment', (req, res) => {
  const { wallet, queryCost, txSignature } = req.body;
  
  // In production, verify the transaction and update database
  res.json({
    success: true,
    message: 'Payment recorded',
    queries: Math.floor((queryCost || 0) / 10000)
  });
});

// Leaderboard
app.get('/api/leaderboard', (req, res) => {
  const providers = Array.from(providerData.providers.values())
    .sort((a, b) => b.queriesServed - a.queriesServed)
    .slice(0, 10)
    .map((p, idx) => ({
      rank: idx + 1,
      wallet: p.wallet,
      name: p.name,
      queriesServed: p.queriesServed,
      totalEarned: p.totalEarned,
      isActive: p.isActive
    }));
    
  res.json({ leaderboard: providers });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'WHISTLE Backend API - Check /health for status'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║       🔐 WHISTLE Backend API 🔐                                ║
║       Privacy-Preserving AI + Provider Network                 ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

✅ Server running on: http://localhost:${PORT}
✅ Health check: http://localhost:${PORT}/health

📡 CryptWhistle AI:
   • Models API: /api/models
   • Capabilities: /api/capabilities

🌐 Whistlenet Provider Network:
   • Providers: /api/providers
   • Nodes: /api/nodes
   • Network Stats: /api/network/stats
   • Credits: /api/credits/:wallet
   • Leaderboard: /api/leaderboard

🔒 Privacy Mode: MAXIMUM
🚀 Ready to serve!
  `);
});

export default app;

