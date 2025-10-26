// x402 client helper for Ghost Whistle - Trustless Distribution via Smart Contract
// Sends fees to staking pool for automatic distribution to stakers!

(function () {
  const WHISTLE_MINT = '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump';
  const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
  const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
  const PROGRAM_ID = '2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq';
  const SYSTEM_PROGRAM = '11111111111111111111111111111111';
  const RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba';
  const RPC_ENDPOINTS = [
    RPC_URL,
    'https://rpc.ankr.com/solana',
    'https://api.mainnet-beta.solana.com'
  ];

  async function getOrCreateTokenAccount(connection, ownerPubkey, mintPubkey) {
    // Try multiple RPCs due to rate limiting
    const errors = [];
    for (let i = 0; i < RPC_ENDPOINTS.length; i++) {
      try {
        const rpcUrl = RPC_ENDPOINTS[i];
        const conn = new solanaWeb3.Connection(rpcUrl, 'confirmed');
        console.log(`🔍 RPC ${i + 1}/${RPC_ENDPOINTS.length}: ${rpcUrl.substring(0, 50)}...`);
        console.log(`   Wallet: ${ownerPubkey.toString()}`);
        console.log(`   Mint: ${mintPubkey.toString()}`);
        
        const tokenAccounts = await conn.getParsedTokenAccountsByOwner(ownerPubkey, {
          mint: mintPubkey
        });
        
        console.log(`   Found ${tokenAccounts.value.length} token accounts`);
        
        if (tokenAccounts.value.length > 0) {
          const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
          console.log(`✅ $WHISTLE balance: ${balance}`);
          if (balance === 0) {
            throw new Error('You have 0 $WHISTLE tokens. Please buy some $WHISTLE first!\n\nGet $WHISTLE at: https://pump.fun/coin/6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump');
          }
          return tokenAccounts.value[0].pubkey;
        }
        throw new Error('No $WHISTLE token account found.\n\nPlease buy $WHISTLE first at:\nhttps://pump.fun/coin/6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump');
      } catch (e) {
        console.error(`❌ RPC ${i + 1} failed:`, e.message, e);
        errors.push(`RPC ${i + 1}: ${e.message}`);
        if (i === RPC_ENDPOINTS.length - 1) {
          // Last RPC also failed
          console.error('All RPC errors:', errors);
          throw new Error(`All RPCs failed:\n${errors.join('\n')}`);
        }
        // Try next RPC
        console.log(`   Waiting 500ms before trying next RPC...`);
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  async function requestX402AndPay({ wallet, hops = 3 }) {
    if (!wallet || !wallet.publicKey) throw new Error('Wallet not connected');

    // 1) Request quote
    const gateway = (window.X402_GATEWAY || window.location.origin);
    const quoteResp = await fetch(`${gateway.replace(/\/$/, '')}/x402/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hops })
    });
    if (quoteResp.status !== 402) {
      const body = await quoteResp.text();
      throw new Error('Expected 402 quote, got ' + quoteResp.status + ': ' + body);
    }
    const quote = await quoteResp.json();

    // 2) Call deposit_fees() to send x402 fees to staking pool (trustless!)
    // Use fallback RPCs to avoid rate limiting
    let connection = null;
    console.log('🔌 Testing RPC connections...');
    for (let i = 0; i < RPC_ENDPOINTS.length; i++) {
      const rpcUrl = RPC_ENDPOINTS[i];
      try {
        console.log(`   Testing RPC ${i + 1}: ${rpcUrl.substring(0, 50)}...`);
        connection = new solanaWeb3.Connection(rpcUrl, 'confirmed');
        const blockHash = await connection.getLatestBlockhash('finalized');
        console.log(`✅ Connected to RPC ${i + 1}:`, rpcUrl.split('?')[0]);
        console.log(`   Latest blockhash: ${blockHash.blockhash.substring(0, 20)}...`);
        break;
      } catch (e) {
        console.error(`❌ RPC ${i + 1} connection failed:`, e.message);
        connection = null;
      }
    }
    if (!connection) {
      console.error('❌ All RPCs unavailable!');
      throw new Error('All RPCs unavailable. Please check your internet connection.');
    }
    
    const whistleMint = new solanaWeb3.PublicKey(WHISTLE_MINT);
    const programId = new solanaWeb3.PublicKey(PROGRAM_ID);
    const TOKEN_PROGRAM = new solanaWeb3.PublicKey(TOKEN_PROGRAM_ID);
    const ASSOCIATED_TOKEN_PROGRAM = new solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
    
    // Derive pool PDA
    const [poolPda, poolBump] = await solanaWeb3.PublicKey.findProgramAddress(
      [Buffer.from('pool')],
      programId
    );
    
    // Derive pool vault (ATA for pool PDA)
    const [poolVault] = await solanaWeb3.PublicKey.findProgramAddress(
      [
        poolPda.toBuffer(),
        TOKEN_PROGRAM.toBuffer(),
        whistleMint.toBuffer()
      ],
      ASSOCIATED_TOKEN_PROGRAM
    );
    
    console.log('💳 Payment details:', {
      amount: quote.pricing.totalAmount,
      poolPda: poolPda.toString(),
      poolVault: poolVault.toString(),
      quoteId: quote.quoteId
    });

    // Get user's WHISTLE token account
    const userTokenAccount = await getOrCreateTokenAccount(connection, wallet.publicKey, whistleMint);
    
    const tx = new solanaWeb3.Transaction();

    // Create memo with quote reference for tracking
    const memoIx = new solanaWeb3.TransactionInstruction({
      programId: new solanaWeb3.PublicKey(MEMO_PROGRAM_ID),
      keys: [],
      data: Buffer.from(`x402:${quote.quoteId}`, 'utf8')
    });

    // Create deposit_fees instruction
    // deposit_fees discriminator = first 8 bytes of sha256("global:deposit_fees")
    const discriminator = Buffer.from([0xf2, 0x23, 0xc6, 0x8b, 0x8f, 0x7c, 0x4e, 0x91]);
    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(BigInt(quote.pricing.totalAmount));
    
    const depositFeesIx = new solanaWeb3.TransactionInstruction({
      programId: programId,
      keys: [
        { pubkey: poolPda, isSigner: false, isWritable: true },              // pool
        { pubkey: wallet.publicKey, isSigner: true, isWritable: false },     // user
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },     // user_token_account
        { pubkey: poolVault, isSigner: false, isWritable: true },            // pool_vault
        { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false }        // token_program
      ],
      data: Buffer.concat([discriminator, amountBuffer])
    });

    tx.add(memoIx);
    tx.add(depositFeesIx);
    tx.feePayer = wallet.publicKey;
    
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;

    console.log('📤 Sending payment...');
    const signed = await wallet.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
    
    console.log('⏳ Confirming payment:', sig);
    await connection.confirmTransaction(sig, 'confirmed');
    console.log('✅ Payment confirmed!');

    // 3) Confirm with server for access token
    const confirm = await fetch(`${gateway.replace(/\/$/, '')}/x402/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        quoteId: quote.quoteId, 
        txSig: sig, 
        payer: wallet.publicKey.toBase58() 
      })
    }).then(r => r.json());

    if (!confirm.ok) throw new Error('Confirm failed: ' + JSON.stringify(confirm));
    return { accessToken: confirm.accessToken, ttlSeconds: confirm.ttlSeconds, txSig: sig };
  }

  window.requestX402AndPay = requestX402AndPay;
})();


