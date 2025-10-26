const crypto = require('crypto');
const { Connection, PublicKey } = require('@solana/web3.js');

// Configuration (direct transfer verification)
const WHISTLE_MINT = '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump';
const FEE_COLLECTOR_WALLET = 'G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba';
const EXPECTED_AMOUNT = 10_000_000_000; // 10,000 WHISTLE (6 decimals = 10,000 * 1e6)

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
    
    if (!txSig || !payer) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'missing_params' })
      };
    }

    // Verify transaction on-chain (stateless - no quote storage needed)
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

    // Derive collector ATA to verify transfer
    const whistleMintPubkey = new PublicKey(WHISTLE_MINT);
    const feeCollector = new PublicKey(FEE_COLLECTOR_WALLET);
    const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const ASSOCIATED_TOKEN_PROGRAM = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
    const [collectorAta] = await PublicKey.findProgramAddress(
      [feeCollector.toBuffer(), TOKEN_PROGRAM.toBuffer(), whistleMintPubkey.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM
    );
    console.log('🔍 Verifying payment to collector ATA:', collectorAta.toBase58());
    
    // Verify deposit_fees instruction was called to pool
    const postBalances = tx.meta.postTokenBalances || [];
    const preBalances = tx.meta.preTokenBalances || [];
    
    console.log('📊 Token balances:', {
      pre: preBalances.map(p => ({ index: p.accountIndex, mint: p.mint, amount: p.uiTokenAmount.amount })),
      post: postBalances.map(p => ({ index: p.accountIndex, mint: p.mint, amount: p.uiTokenAmount.amount }))
    });
    
    let amountReceived = 0;
    for (const post of postBalances) {
      // Check if collector ATA received tokens by checking the account address
      const accountKeys = tx.transaction.message.accountKeys || [];
      const accountPubkey = accountKeys[post.accountIndex];
      const accountAddress = accountPubkey?.pubkey?.toBase58?.() || accountPubkey?.toBase58?.() || String(accountPubkey);
      
      console.log(`  Checking account ${post.accountIndex}: ${accountAddress} (mint: ${post.mint})`);
      
      if (accountAddress === collectorAta.toBase58() && post.mint === WHISTLE_MINT) {
        const pre = preBalances.find(p => p.accountIndex === post.accountIndex);
        const preAmount = pre ? BigInt(pre.uiTokenAmount.amount) : 0n;
        const postAmount = BigInt(post.uiTokenAmount.amount);
        amountReceived = Number(postAmount - preAmount);
        console.log(`✅ Found collector ATA! Pre: ${preAmount}, Post: ${postAmount}, Received: ${amountReceived}`);
        break;
      }
    }

    // Verify amount matches expected (10,000 WHISTLE)
    if (amountReceived < EXPECTED_AMOUNT) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'insufficient_payment',
          expected: EXPECTED_AMOUNT,
          received: amountReceived,
          collectorAta: collectorAta.toBase58()
        })
      };
    }

    // Check memo presence (optional - just for logging)
    const memoOk = (tx.transaction.message.instructions || []).some(ix => {
      return (ix.programId?.toBase58?.() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr') || false;
    });

    // Issue access token (stateless - could use JWT in production)
    const accessToken = 'atk_' + crypto.randomBytes(16).toString('hex');
    const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60; // 15 min

    console.log(`✅ x402 payment verified: ${amountReceived} WHISTLE sent to collector from ${payer}, tx: ${txSig}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        accessToken,
        ttlSeconds: 900,
        memoOk,
        amountReceived,
        txSig
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

