const crypto = require('crypto');
const { Connection, PublicKey } = require('@solana/web3.js');

// Configuration
const FEE_COLLECTOR_WALLET = 'G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg';
const WHISTLE_MINT = '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba';

// In-memory storage (in production, use Redis or DB)
const { pendingQuotes } = require('./x402-quote');
const issuedTokens = new Map();

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
    const { quoteId, txSig, payer } = JSON.parse(event.body || '{}');
    
    if (!quoteId || !txSig || !payer) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'missing_params' })
      };
    }

    const q = pendingQuotes.get(quoteId);
    if (!q) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'unknown_quote' })
      };
    }

    if (q.expiresAt < Math.floor(Date.now() / 1000)) {
      pendingQuotes.delete(quoteId);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'quote_expired' })
      };
    }

    // Verify transaction on-chain
    const connection = new Connection(RPC_URL, 'confirmed');
    const tx = await connection.getParsedTransaction(txSig, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed'
    });

    if (!tx || tx.meta?.err) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'tx_not_confirmed' })
      };
    }

    // Verify SPL token transfer to fee collector
    const postBalances = tx.meta.postTokenBalances || [];
    const preBalances = tx.meta.preTokenBalances || [];
    
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
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'insufficient_payment',
          expected: q.amount,
          received: amountReceived
        })
      };
    }

    // Check memo presence
    const memoOk = (tx.transaction.message.instructions || []).some(ix => {
      return (ix.programId?.toBase58?.() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr') || false;
    });

    // Issue access token
    pendingQuotes.delete(quoteId);
    const accessToken = 'atk_' + crypto.randomBytes(16).toString('hex');
    const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60; // 15 min
    issuedTokens.set(accessToken, expiresAt);

    console.log(`✅ x402 payment verified: ${amountReceived} WHISTLE from ${payer}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        accessToken,
        ttlSeconds: 900,
        memoOk,
        amountReceived
      })
    };
  } catch (e) {
    console.error('❌ /x402/confirm error:', e);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'verify_failed', detail: String(e) })
    };
  }
};

// Export issued tokens for validate function
exports.issuedTokens = issuedTokens;

