require('dotenv').config();

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const { Connection, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddressSync } = require('@solana/spl-token');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS middleware MUST be first (before any other middleware)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Serve static files with cache control for x402-client.js
app.use((req, res, next) => {
  if (req.url.includes('x402-client.js')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});
app.use(express.static('.'));
app.use(express.static('apps/web')); // Serve web app files (privacy.html, terms.html, etc.)
app.use(express.json());

// Redirect root to Whistlenet Dashboard (main homepage)
app.get('/', (req, res) => {
  // Only redirect in development, serve health check in production
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
  res.redirect('http://localhost:3000');
  } else {
    // In production, serve health check or API info
    res.json({
      service: 'WHISTLE Backend API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        nlx402: '/api/nlx402/*',
        rpc: '/api/rpc/*'
      }
    });
  }
});

// Main website still accessible at /main.html
app.get('/main', (req, res) => {
  res.sendFile(path.join(__dirname, 'main.html'));
});

// ===== x402: Config =====
const FEE_COLLECTOR_WALLET = 'G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg'; // Collects all x402 fees
const WHISTLE_MINT = '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

const connection = new Connection(RPC_URL, 'confirmed');

let collectorTokenAccount = null;
const pendingQuotes = new Map(); // quoteId -> { amount, expiresAt }
const issuedTokens = new Map();  // accessToken -> expiresAt

async function getFeeCollectorTokenAccount() {
  try {
    const collectorPubkey = new PublicKey(FEE_COLLECTOR_WALLET);
    const whistleMint = new PublicKey(WHISTLE_MINT);
    
    collectorTokenAccount = getAssociatedTokenAddressSync(
      whistleMint,
      collectorPubkey,
      false
    );
    console.log('💰 Fee Collector Wallet:', FEE_COLLECTOR_WALLET);
    console.log('💰 Fee Collector Token Account:', collectorTokenAccount.toBase58());
  } catch (e) {
    console.error('❌ Failed to get collector token account:', e);
  }
}
getFeeCollectorTokenAccount();

// Route for the howto page
app.get('/howto', (req, res) => {
    res.sendFile(path.join(__dirname, 'apps/web/howto.html'));
});

// Serve other web app pages
app.get('/privacy', (req, res) => res.sendFile(path.join(__dirname, 'apps/web/privacy.html')));
app.get('/terms', (req, res) => res.sendFile(path.join(__dirname, 'apps/web/terms.html')));
app.get('/whitepaper', (req, res) => res.sendFile(path.join(__dirname, 'apps/web/whitepaper.html')));

// Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ===== x402: Quote endpoint =====
app.post('/x402/quote', async (req, res) => {
  try {
    const { hops = 3 } = req.body || {};
    if (!collectorTokenAccount) {
      await getFeeCollectorTokenAccount();
    }
    // 🔥 PREMIUM PRICING: 10,000 WHISTLE flat fee per use
    const flatFee = 10_000_000_000; // 10,000 WHISTLE (6 decimals)
    const totalAmount = String(flatFee);
    const quoteId = 'q_' + crypto.randomBytes(8).toString('hex');
    const expiresAt = Math.floor(Date.now() / 1000) + 5 * 60;

    pendingQuotes.set(quoteId, { amount: totalAmount, expiresAt });

    const quote = {
      protocol: 'x402',
      version: '1',
      quoteId,
      resource: '/relay/open',
      pricing: { unit: 'flat-fee', amount: String(flatFee), totalAmount },
      chain: {
        chainId: 'solana:mainnet',
        mint: WHISTLE_MINT,
        feeCollector: FEE_COLLECTOR_WALLET,
        collectorTokenAccount: collectorTokenAccount?.toBase58()
      },
      method: {
        type: 'spl-transfer',
        destination: FEE_COLLECTOR_WALLET,
        amount: totalAmount,
        memo: `x402:${quoteId}`
      },
      expiresAt,
      confirmUrl: `/x402/confirm?quoteId=${quoteId}`
    };

    res
      .status(402)
      .set('WWW-Authenticate', 'X402 realm="GhostWhistle"')
      .json(quote);
  } catch (e) {
    console.error('❌ /x402/quote error:', e);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ===== x402: Confirm endpoint =====
app.post('/x402/confirm', async (req, res) => {
  try {
    const { quoteId, txSig, payer } = req.body || {};
    if (!quoteId || !txSig || !payer) {
      return res.status(400).json({ error: 'missing_params' });
    }
    const q = pendingQuotes.get(quoteId);
    if (!q) return res.status(400).json({ error: 'unknown_quote' });
    if (q.expiresAt < Math.floor(Date.now() / 1000)) {
      pendingQuotes.delete(quoteId);
      return res.status(400).json({ error: 'quote_expired' });
    }

    const tx = await connection.getParsedTransaction(txSig, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed'
    });
    if (!tx || tx.meta?.err) return res.status(400).json({ error: 'tx_not_confirmed' });

    // Verify SPL token transfer to fee collector
    const postBalances = tx.meta.postTokenBalances || [];
    const preBalances = tx.meta.preTokenBalances || [];
    
    // Find collector's token account changes
    let amountReceived = 0;
    for (const post of postBalances) {
      if (post.owner === FEE_COLLECTOR_WALLET && post.mint === WHISTLE_MINT) {
        const pre = preBalances.find(p => p.accountIndex === post.accountIndex);
        const preAmount = pre ? BigInt(pre.uiTokenAmount.amount) : 0n;
        const postAmount = BigInt(post.uiTokenAmount.amount);
        amountReceived = Number(postAmount - preAmount);
        break;
      }
    }

    // Verify amount matches quote
    if (amountReceived < Number(q.amount)) {
      return res.status(400).json({ 
        error: 'insufficient_payment',
        expected: q.amount,
        received: amountReceived 
      });
    }

    // Optional: check memo presence
    const memoOk = (tx.transaction.message.instructions || []).some(ix => {
      return (ix.programId?.toBase58?.() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr') || false;
    });

    pendingQuotes.delete(quoteId);
    const accessToken = 'atk_' + crypto.randomBytes(16).toString('hex');
    const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60; // 15 min
    issuedTokens.set(accessToken, expiresAt);
    
    console.log(`✅ x402 payment verified: ${amountReceived} WHISTLE from ${payer}`);
    return res.json({ ok: true, accessToken, ttlSeconds: 900, memoOk, amountReceived });
  } catch (e) {
    console.error('❌ /x402/confirm error:', e);
    res.status(400).json({ error: 'verify_failed', detail: String(e) });
  }
});

// ===== x402: Simple protected test endpoint =====
app.get('/x402/protected-test', (req, res) => {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_token' });
  const exp = issuedTokens.get(token);
  if (!exp) return res.status(401).json({ error: 'invalid_token' });
  if (exp < Math.floor(Date.now() / 1000)) {
    issuedTokens.delete(token);
    return res.status(401).json({ error: 'expired_token' });
  }
  return res.json({ ok: true, message: 'x402 token valid', expiresAt: exp });
});

// ===== x402: Token validation endpoint (for other services) =====
app.post('/x402/validate', (req, res) => {
  const { accessToken } = req.body || {};
  if (!accessToken) return res.status(400).json({ ok: false, error: 'missing_token' });
  
  // Allow FREE_ACCESS token for node/staking operations
  if (accessToken === 'FREE_ACCESS') {
    return res.json({ ok: true, expiresAt: 9999999999 }); // Never expires
  }
  
  const exp = issuedTokens.get(accessToken);
  if (!exp) return res.status(200).json({ ok: false, error: 'invalid_token' });
  if (exp < Math.floor(Date.now() / 1000)) {
    issuedTokens.delete(accessToken);
    return res.status(200).json({ ok: false, error: 'expired_token' });
  }
  return res.json({ ok: true, expiresAt: exp });
});

// ===== NLx402 RPC Integration =====
const WhistleNLx402Integration = require('./lib/nlx402-rpc-integration');
const axios = require('axios');

// Initialize NLx402 for RPC protection
const nlx402RPC = new WhistleNLx402Integration({
  apiKey: process.env.NLX402_API_KEY,
  perQueryPrice: 0.0001, // 0.0001 SOL per query
});

// ===== NLx402 General Access Integration (for all x402 features) =====
const WhistleNLx402GeneralAccess = require('./lib/nlx402-general-access');

// Initialize NLx402 for general x402 feature protection
const nlx402General = new WhistleNLx402GeneralAccess({
  accessDuration: 3600, // 1 hour
  x402Wallet: 'BMiSBoT5aPCrFcxaTrHuzXMkfrtzCLMcDYqrPTVymNbU', // X402 PDA (receives 0.019 SOL)
  facilitatorWallet: 'GwtbzDh6QHwVan4DVyUR11gzBVcBT92KjnaPdk43fMG5' // Facilitator (receives 0.001 SOL)
});

// Upstream RPC endpoints for fallback
const UPSTREAM_RPCS = [
  process.env.HELIUS_RPC_URL,
  process.env.QUICKNODE_RPC_URL,
  'https://api.mainnet-beta.solana.com',
].filter(Boolean);

// ===== NLx402 RPC Endpoints =====

// Get RPC pricing and metadata
app.get('/api/rpc/metadata', (req, res) => {
  res.json({
    network: 'solana-mainnet',
    pricing: {
      perQuery: 0.0001,
      currency: 'SOL',
      bulkDiscounts: {
        '100': '5% off',
        '1000': '10% off',
        '10000': '15% off'
      }
    },
    supportedMethods: [
      'getAccountInfo', 'getBalance', 'getTransaction',
      'getBlock', 'getLatestBlockhash', 'sendTransaction'
    ],
    paymentMethods: ['SOL', 'WHISTLE'],
    version: '1.0.0'
  });
});

// Generate RPC quote with NLx402
app.post('/api/rpc/quote', async (req, res) => {
  try {
    const { walletAddress, queryCount = 1, rpcMethod } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'walletAddress required' });
    }
    
    if (queryCount < 1 || queryCount > 100000) {
      return res.status(400).json({ success: false, error: 'queryCount must be 1-100000' });
    }
    
    const result = await nlx402RPC.generateRPCQuote({
      walletAddress,
      queryCount,
      rpcMethod
    });
    
    res.json(result);
  } catch (error) {
    console.error('RPC quote error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify RPC quote
app.post('/api/rpc/verify', async (req, res) => {
  try {
    const { quote, nonce, walletAddress } = req.body;
    
    if (!quote || !nonce || !walletAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'quote, nonce, and walletAddress required' 
      });
    }
    
    const result = await nlx402RPC.verifyRPCQuote({
      quote,
      nonce,
      walletAddress
    });
    
    res.json(result);
  } catch (error) {
    console.error('RPC verify error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Unlock RPC access after payment
app.post('/api/rpc/unlock', async (req, res) => {
  try {
    const { tx, nonce, walletAddress } = req.body;
    
    if (!tx || !nonce || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'tx, nonce, and walletAddress required'
      });
    }
    
    const result = await nlx402RPC.unlockRPCAccess({
      tx,
      nonce,
      walletAddress
    });
    
    res.json(result);
  } catch (error) {
    console.error('RPC unlock error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Protected RPC endpoint with NLx402
app.post('/api/rpc', async (req, res) => {
  try {
    const accessToken = req.headers['x-access-token'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!accessToken) {
      return res.status(402).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Payment required. Get a quote at /api/rpc/quote'
        },
        id: req.body.id
      });
    }
    
    // Validate access token
    const validation = nlx402RPC.validateRPCRequest(accessToken, req.body.method);
    
    if (!validation.valid) {
      return res.status(402).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: validation.error
        },
        id: req.body.id
      });
    }
    
    // Log request
    console.log(`RPC: ${req.body.method} | Wallet: ${validation.walletAddress} | ${validation.queriesUsed}/${validation.queriesRemaining + validation.queriesUsed}`);
    
    // Forward to upstream RPC
    let lastError = null;
    for (const rpcUrl of UPSTREAM_RPCS) {
      try {
        const response = await axios.post(rpcUrl, req.body, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        
        const result = response.data;
        if (!result.error) {
          result.whistle = {
            queriesUsed: validation.queriesUsed,
            queriesRemaining: validation.queriesRemaining
          };
        }
        
        return res.json(result);
      } catch (error) {
        lastError = error;
        // Try next upstream
      }
    }
    
    // All upstreams failed
    res.status(503).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'All upstream RPC nodes unavailable'
      },
      id: req.body.id
    });
  } catch (error) {
    console.error('RPC error:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Internal server error'
      },
      id: req.body.id
    });
  }
});

// RPC stats endpoint
app.get('/api/rpc/stats', (req, res) => {
  const stats = nlx402RPC.getStats();
  res.json({
    success: true,
    stats: {
      ...stats,
      upstreamNodes: UPSTREAM_RPCS.length,
      pricing: {
        perQuery: 0.0001,
        currency: 'SOL'
      }
    }
  });
});

// ===== NLx402 General X402 Access Endpoints =====

// Generate quote for x402 access (Vanishing Payments, Ghost Identity, etc.)
app.post('/api/nlx402/quote', async (req, res) => {
  try {
    const { walletAddress, feature, amount, duration } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'walletAddress required' });
    }

    const result = await nlx402General.generateX402Quote({
      walletAddress,
      feature: feature || 'x402-access',
      amount,
      duration
    });

    res.json(result);
  } catch (error) {
    console.error('NLx402 quote error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify x402 quote
app.post('/api/nlx402/verify', async (req, res) => {
  try {
    const { quote, nonce, walletAddress } = req.body;

    if (!quote || !nonce || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'quote, nonce, and walletAddress required'
      });
    }

    const result = await nlx402General.verifyX402Quote({
      quote,
      nonce,
      walletAddress
    });

    res.json(result);
  } catch (error) {
    console.error('NLx402 verify error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Unlock x402 access after payment
app.post('/api/nlx402/unlock', async (req, res) => {
  try {
    const { tx, nonce, walletAddress, feature } = req.body;

    if (!tx || !nonce || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'tx, nonce, and walletAddress required'
      });
    }

    const result = await nlx402General.unlockX402Access({
      tx,
      nonce,
      walletAddress,
      feature
    });

    res.json(result);
  } catch (error) {
    console.error('NLx402 unlock error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Validate x402 access token
app.post('/api/nlx402/validate', async (req, res) => {
  try {
    const { accessToken, feature } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'accessToken required'
      });
    }

    const result = nlx402General.validateAccessToken(accessToken, feature);

    res.json({
      success: result.valid,
      ...result
    });
  } catch (error) {
    console.error('NLx402 validate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get NLx402 general access stats
app.get('/api/nlx402/stats', (req, res) => {
  const stats = nlx402General.getStats();
  res.json({
    success: true,
    stats
  });
});

// ===== HaveIBeenPwned API Proxy (to avoid CORS) =====
// Get your API key at: https://haveibeenpwned.com/API/Key
// Set HIBP_API_KEY in your .env file
const HIBP_API_KEY = process.env.HIBP_API_KEY || '';

// Helper function to make HIBP API requests
function makeHibpRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'haveibeenpwned.com',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'hibp-api-key': HIBP_API_KEY,
        'user-agent': 'Ghost-Whistle-Privacy-Monitor'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve({ success: true, data: JSON.parse(data), statusCode: res.statusCode });
          } catch (e) {
            resolve({ success: true, data: data, statusCode: res.statusCode });
          }
        } else if (res.statusCode === 404) {
          resolve({ success: true, data: null, statusCode: res.statusCode });
        } else {
          resolve({ success: false, error: `HTTP ${res.statusCode}`, statusCode: res.statusCode });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
}

// Get latest breach
app.get('/api/hibp/latest-breach', async (req, res) => {
  try {
    const result = await makeHibpRequest('/api/v3/latestbreach');
    
    if (result.success) {
      return res.json(result.data);
    } else {
      return res.status(result.statusCode || 500).json({ error: result.error });
    }
  } catch (error) {
    console.error('HIBP API Error:', error);
    return res.status(500).json({ error: 'Failed to fetch from HaveIBeenPwned' });
  }
});

// Check if email has been breached
app.get('/api/hibp/breach/:email', async (req, res) => {
  try {
    const email = encodeURIComponent(req.params.email);
    const result = await makeHibpRequest(`/api/v3/breachedaccount/${email}`);
    
    if (result.statusCode === 404) {
      // No breaches found
      return res.status(404).json({ breaches: [] });
    }
    
    if (result.success) {
      return res.json(result.data);
    } else {
      return res.status(result.statusCode || 500).json({ error: result.error });
    }
  } catch (error) {
    console.error('HIBP API Error:', error);
    return res.status(500).json({ error: 'Failed to fetch from HaveIBeenPwned' });
  }
});

// ===== CryptWhistle Routes =====
// Serve CryptWhistle documentation and playground
app.use('/cryptwhistle/docs-site', express.static(path.join(__dirname, 'apps/cryptwhistle/docs-site')));

// Serve the redirect index.html at /cryptwhistle
app.get('/cryptwhistle', (req, res) => {
  res.sendFile(path.join(__dirname, 'apps/cryptwhistle/index.html'));
});

// Health check endpoint (required for Render)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime(),
    service: 'WHISTLE Backend API',
    version: '1.0.0'
  });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📖 How It Works page: http://localhost:${PORT}/howto`);
    console.log(`🏠 Main app: http://localhost:${PORT}`);
    console.log(`🤖 CryptWhistle AI: http://localhost:${PORT}/cryptwhistle`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
});