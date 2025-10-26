const crypto = require('crypto');
const { Connection, PublicKey } = require('@solana/web3.js');

// Configuration
const PROGRAM_ID = '2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq';
const WHISTLE_MINT = '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump';
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

    // Derive pool PDA and pool vault to verify deposit
    const programIdPubkey = new PublicKey(PROGRAM_ID);
    const whistleMintPubkey = new PublicKey(WHISTLE_MINT);
    const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const ASSOCIATED_TOKEN_PROGRAM = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
    
    const [poolPda] = await PublicKey.findProgramAddress(
      [Buffer.from('pool')],
      programIdPubkey
    );
    
    // Derive pool vault (ATA for pool PDA)
    const [poolVault] = await PublicKey.findProgramAddress(
      [
        poolPda.toBuffer(),
        TOKEN_PROGRAM.toBuffer(),
        whistleMintPubkey.toBuffer()
      ],
      ASSOCIATED_TOKEN_PROGRAM
    );
    
    console.log('🔍 Verifying payment to pool vault:', poolVault.toBase58());
    
    // Verify deposit_fees instruction was called to pool
    const postBalances = tx.meta.postTokenBalances || [];
    const preBalances = tx.meta.preTokenBalances || [];
    
    console.log('📊 Token balances:', {
      pre: preBalances.map(p => ({ index: p.accountIndex, mint: p.mint, amount: p.uiTokenAmount.amount })),
      post: postBalances.map(p => ({ index: p.accountIndex, mint: p.mint, amount: p.uiTokenAmount.amount }))
    });
    
    let amountReceived = 0;
    for (const post of postBalances) {
      // Check if pool vault received tokens by checking the account address
      const accountKeys = tx.transaction.message.accountKeys || [];
      const accountPubkey = accountKeys[post.accountIndex];
      const accountAddress = accountPubkey?.pubkey?.toBase58?.() || accountPubkey?.toBase58?.() || String(accountPubkey);
      
      console.log(`  Checking account ${post.accountIndex}: ${accountAddress} (mint: ${post.mint})`);
      
      if (accountAddress === poolVault.toBase58() && post.mint === WHISTLE_MINT) {
        const pre = preBalances.find(p => p.accountIndex === post.accountIndex);
        const preAmount = pre ? BigInt(pre.uiTokenAmount.amount) : 0n;
        const postAmount = BigInt(post.uiTokenAmount.amount);
        amountReceived = Number(postAmount - preAmount);
        console.log(`✅ Found pool vault! Pre: ${preAmount}, Post: ${postAmount}, Received: ${amountReceived}`);
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
          poolPda: poolPda.toBase58()
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

    console.log(`✅ x402 payment verified: ${amountReceived} WHISTLE deposited to pool from ${payer}, tx: ${txSig}`);

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

