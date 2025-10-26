const crypto = require('crypto');
const { Connection, PublicKey } = require('@solana/web3.js');

// Configuration
const PROGRAM_ID = '2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq';
const WHISTLE_MINT = '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump';
const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const ASSOCIATED_TOKEN_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba';
const EXPECTED_AMOUNT = 10_000_000_000; // 10,000 WHISTLE (6 decimals)

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

    // Derive pool PDA and pool vault (ATA) to verify deposit
    const programId = new PublicKey(PROGRAM_ID);
    const whistleMint = new PublicKey(WHISTLE_MINT);
    const tokenProgramId = new PublicKey(TOKEN_PROGRAM_ID);
    const associatedTokenProgramId = new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID);
    
    const [poolPda] = await PublicKey.findProgramAddress(
      [Buffer.from('pool')],
      programId
    );
    
    // Derive pool vault (ATA for pool PDA)
    const [poolVault] = await PublicKey.findProgramAddress(
      [
        poolPda.toBuffer(),
        tokenProgramId.toBuffer(),
        whistleMint.toBuffer()
      ],
      associatedTokenProgramId
    );
    
    console.log('🔍 Verifying payment to:', {
      poolPda: poolPda.toBase58(),
      poolVault: poolVault.toBase58(),
      txSig
    });
    
    // Verify deposit_fees instruction was called to pool vault
    const postBalances = tx.meta.postTokenBalances || [];
    const preBalances = tx.meta.preTokenBalances || [];
    
    let amountReceived = 0;
    
    // Find the pool vault in token balances
    for (const post of postBalances) {
      // Get the actual account address from transaction
      const accountKey = tx.transaction.message.accountKeys[post.accountIndex];
      const accountAddress = accountKey.pubkey?.toBase58() || accountKey.toBase58();
      
      console.log('📊 Checking token balance:', {
        account: accountAddress,
        mint: post.mint,
        owner: post.owner,
        amount: post.uiTokenAmount.amount
      });
      
      // Check if this is the pool vault and it's WHISTLE tokens
      if (accountAddress === poolVault.toBase58() && post.mint === WHISTLE_MINT) {
        const pre = preBalances.find(p => p.accountIndex === post.accountIndex);
        const preAmount = pre ? BigInt(pre.uiTokenAmount.amount) : 0n;
        const postAmount = BigInt(post.uiTokenAmount.amount);
        amountReceived = Number(postAmount - preAmount);
        
        console.log('✅ Found pool vault payment:', {
          preAmount: preAmount.toString(),
          postAmount: postAmount.toString(),
          received: amountReceived
        });
        break;
      }
    }

    // Verify amount matches expected (10,000 WHISTLE)
    if (amountReceived < EXPECTED_AMOUNT) {
      console.error('❌ Insufficient payment:', {
        expected: EXPECTED_AMOUNT,
        received: amountReceived,
        poolVault: poolVault.toBase58(),
        txSig,
        postBalances: postBalances.map(p => ({
          account: tx.transaction.message.accountKeys[p.accountIndex].pubkey?.toBase58() || tx.transaction.message.accountKeys[p.accountIndex].toBase58(),
          mint: p.mint,
          owner: p.owner,
          amount: p.uiTokenAmount.amount
        }))
      });
      
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'insufficient_payment',
          expected: EXPECTED_AMOUNT,
          received: amountReceived,
          poolPda: poolPda.toBase58(),
          poolVault: poolVault.toBase58(),
          txSig
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

