const crypto = require('crypto');
const { Connection, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddressSync } = require('@solana/spl-token');

// Configuration
const FEE_COLLECTOR_WALLET = 'G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg';
const WHISTLE_MINT = '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

// In-memory storage (will be replaced by proper DB in production)
const pendingQuotes = new Map();

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'WWW-Authenticate': 'X402 realm="GhostWhistle"'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { hops = 3 } = JSON.parse(event.body || '{}');
    
    // Calculate collector token account
    const collectorPubkey = new PublicKey(FEE_COLLECTOR_WALLET);
    const whistleMint = new PublicKey(WHISTLE_MINT);
    const collectorTokenAccount = getAssociatedTokenAddressSync(
      whistleMint,
      collectorPubkey,
      false
    );
    
    // 🔥 PREMIUM PRICING: 10,000 WHISTLE flat fee per use
    const flatFee = 10_000_000_000; // 10,000 WHISTLE (6 decimals)
    const totalAmount = String(flatFee);
    const quoteId = 'q_' + crypto.randomBytes(8).toString('hex');
    const expiresAt = Math.floor(Date.now() / 1000) + 5 * 60;

    // Store quote (in production, use Redis or DB)
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
        collectorTokenAccount: collectorTokenAccount.toBase58()
      },
      method: {
        type: 'spl-transfer',
        destination: FEE_COLLECTOR_WALLET,
        amount: totalAmount,
        memo: `x402:${quoteId}`
      },
      expiresAt,
      confirmUrl: `/.netlify/functions/x402-confirm?quoteId=${quoteId}`
    };

    return {
      statusCode: 402,
      headers,
      body: JSON.stringify(quote)
    };
  } catch (e) {
    console.error('❌ /x402/quote error:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'internal_error' })
    };
  }
};

// Export pending quotes for confirm function (in production, use shared storage)
exports.pendingQuotes = pendingQuotes;

