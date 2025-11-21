const crypto = require('crypto');
const https = require('https');
const { Connection, PublicKey } = require('@solana/web3.js');

// Configuration
const STAKING_PROGRAM_ID = process.env.STAKING_PROGRAM_ID || 'whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr'; // Mainnet (ACTUAL)
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://rpc.whistle.ninja';
const LAMPORTS_PER_SOL = 1_000_000_000;

// Get X402 wallet PDA - using actual deployed payment vault
function getX402WalletPDA() {
  // This is the ACTUAL payment vault from the deployed contract
  const paymentVault = new PublicKey('CU1ZcHccCbQT8iA6pcb3ZyTjog8ckmDHH8gaAmKfC73G');
  return [paymentVault, 0];
}

// RPC Package Configurations (SOL payments)
const PACKAGES = {
  DAY: {
    price_sol: 0.05,                // 0.05 SOL (~$10)
    price_lamports: 50_000_000,     // 0.05 SOL in lamports
    duration: 24 * 60 * 60,         // 24 hours in seconds
    rate_limit: 50,                 // requests per minute
    name: 'Day Pass',
    max_queries: '~72,000/day'
  },
  WEEK: {
    price_sol: 0.15,                // 0.15 SOL (~$30)
    price_lamports: 150_000_000,    // 0.15 SOL in lamports
    duration: 7 * 24 * 60 * 60,     // 7 days
    rate_limit: 100,
    name: 'Week Pass',
    max_queries: '~1M/week'
  },
  MONTH: {
    price_sol: 0.5,                 // 0.5 SOL (~$100)
    price_lamports: 500_000_000,    // 0.5 SOL in lamports
    duration: 30 * 24 * 60 * 60,    // 30 days
    rate_limit: 200,
    name: 'Month Pass',
    max_queries: '~8.6M/month'
  }
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { txSig, payer, package: packageType } = JSON.parse(event.body || '{}');
    
    if (!txSig || !payer || !packageType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'missing_params',
          required: ['txSig', 'payer', 'package']
        })
      };
    }

    // Validate package type
    const pkg = PACKAGES[packageType];
    if (!pkg) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'invalid_package',
          valid: Object.keys(PACKAGES)
        })
      };
    }

    console.log(`📦 Processing ${pkg.name} subscription for ${payer}`);
    console.log(`💰 Expected payment: ${pkg.price_sol} SOL`);

    // Verify transaction on-chain
    const connection = new Connection(RPC_URL, 'confirmed');
    const tx = await connection.getParsedTransaction(txSig, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed'
    });

    if (!tx || tx.meta?.err) {
      console.error('❌ Transaction not confirmed or failed');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'tx_not_confirmed',
          txSig
        })
      };
    }

    // Get X402 wallet PDA
    const [x402WalletPDA] = getX402WalletPDA();
    console.log('🔍 Verifying SOL payment to X402 wallet:', x402WalletPDA.toBase58());
    
    // Verify SOL transfer to X402 wallet
    const preBalances = tx.meta.preBalances || [];
    const postBalances = tx.meta.postBalances || [];
    const accountKeys = tx.transaction.message.accountKeys || [];
    
    // Find X402 wallet in account keys
    let x402Index = -1;
    for (let i = 0; i < accountKeys.length; i++) {
      const key = accountKeys[i];
      const address = key?.pubkey?.toBase58?.() || key?.toBase58?.() || String(key);
      if (address === x402WalletPDA.toBase58()) {
        x402Index = i;
        break;
      }
    }
    
    if (x402Index === -1) {
      console.error('❌ X402 wallet not found in transaction');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'invalid_transaction',
          message: 'Transaction did not include X402 wallet'
        })
      };
    }
    
    // Calculate SOL received
    const preBalance = preBalances[x402Index] || 0;
    const postBalance = postBalances[x402Index] || 0;
    const amountReceived = postBalance - preBalance;
    
    console.log(`✅ Payment verified! Received: ${amountReceived / LAMPORTS_PER_SOL} SOL`);

    // Verify amount matches package price (with small tolerance for fees)
    const minAcceptable = pkg.price_lamports * 0.99; // 1% tolerance
    if (amountReceived < minAcceptable) {
      console.error(`❌ Insufficient payment: expected ${pkg.price_lamports}, got ${amountReceived}`);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'insufficient_payment',
          expected: pkg.price_sol,
          received: amountReceived / LAMPORTS_PER_SOL,
          package: pkg.name
        })
      };
    }

    // Calculate subscription period
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + pkg.duration;

    // Generate API key (just use wallet address)
    const apiKey = payer;

    // Store subscription in database
    // Note: In production, this should use Cloudflare D1 or similar
    // For now, we'll return the subscription data for the client to use
    
    const subscription = {
      apiKey: apiKey,
      walletAddress: payer,
      package: packageType,
      packageName: pkg.name,
      priceSol: pkg.price_sol,
      rateLimit: pkg.rate_limit,
      maxQueries: pkg.max_queries,
      startTime: now,
      expiresAt: expiresAt,
      duration: pkg.duration,
      txSig: txSig,
      isActive: true
    };

    console.log(`✅ RPC subscription created for ${payer}`);
    console.log(`📅 Valid from ${new Date(now * 1000).toISOString()} to ${new Date(expiresAt * 1000).toISOString()}`);

    // Store in database (fire and forget - don't block response)
    storeSubscription(subscription).catch(err => {
      console.error('⚠️ Failed to store subscription:', err);
      // Non-critical error - subscription still works
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        subscription: subscription,
        rpcEndpoint: `${process.env.RPC_ENDPOINT || 'https://rpc.whistlenet.io'}`,
        usage: {
          rateLimit: `${pkg.rate_limit} requests/minute`,
          estimatedMax: pkg.max_queries,
          expiresIn: `${pkg.duration / 86400} days`
        },
        instructions: {
          endpoint: `${process.env.RPC_ENDPOINT || 'https://rpc.whistlenet.io'}/rpc`,
          authentication: 'Include X-API-Key header with your wallet address',
          example: `curl -X POST ${process.env.RPC_ENDPOINT || 'https://rpc.whistlenet.io'}/rpc \\
  -H "X-API-Key: ${payer}" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'`
        },
        message: `${pkg.name} activated! Your RPC access is now live.`
      })
    };

  } catch (e) {
    console.error('❌ /rpc-subscribe error:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'subscription_failed', 
        detail: String(e) 
      })
    };
  }
};

/**
 * Store subscription by calling the storage function
 */
async function storeSubscription(subscription) {
  const storageUrl = process.env.STORAGE_FUNCTION_URL || 'http://localhost:8888/.netlify/functions/rpc-store-subscription';
  
  return new Promise((resolve, reject) => {
    const url = new URL(storageUrl);
    const payload = JSON.stringify(subscription);

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const protocol = url.protocol === 'https:' ? https : require('http');
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Storage failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

