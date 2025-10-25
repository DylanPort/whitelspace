const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { Connection, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddressSync } = require('@solana/spl-token');

const app = express();
const PORT = 3001;

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
app.use(express.json());

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
    res.sendFile(path.join(__dirname, 'howto.html'));
});

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
  const exp = issuedTokens.get(accessToken);
  if (!exp) return res.status(200).json({ ok: false, error: 'invalid_token' });
  if (exp < Math.floor(Date.now() / 1000)) {
    issuedTokens.delete(accessToken);
    return res.status(200).json({ ok: false, error: 'expired_token' });
  }
  return res.json({ ok: true, expiresAt: exp });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📖 How It Works page: http://localhost:${PORT}/howto`);
    console.log(`🏠 Main app: http://localhost:${PORT}`);
});