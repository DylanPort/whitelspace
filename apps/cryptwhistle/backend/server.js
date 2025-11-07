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
    mode: 'client-side-ai',
    privacy: 'maximum'
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'This is a privacy-preserving AI backend. All AI processing happens client-side.'
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
║       🔐 CryptWhistle Privacy-Preserving AI Backend 🔐        ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

✅ Server running on: http://localhost:${PORT}
✅ Health check: http://localhost:${PORT}/health
✅ Models API: http://localhost:${PORT}/api/models

🔒 Privacy Mode: MAXIMUM
📍 Execution: Client-Side (Browser)
🚀 Technology: Transformers.js + WebGPU + WASM

⚡ All AI processing happens in the user's browser
⚡ Data never leaves the user's device
⚡ Zero server-side computation on user data

Ready to serve client-side AI!
  `);
});

export default app;

