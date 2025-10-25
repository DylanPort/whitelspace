// x402 client helper for Ghost Whistle - Simple SPL Transfer Version
// No smart contract calls - just direct token transfers to fee collector!

(function () {
  const WHISTLE_MINT = '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump';
  const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
  const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
  const RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba';
  const RPC_ENDPOINTS = [
    RPC_URL,
    'https://rpc.ankr.com/solana',
    'https://api.mainnet-beta.solana.com'
  ];
  
  // Fee collector wallet - receives all x402 fees
  const FEE_COLLECTOR_WALLET = 'G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg';

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

    // 2) Simple SPL token transfer to fee collector
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
    const feeCollector = new solanaWeb3.PublicKey(FEE_COLLECTOR_WALLET);
    
    console.log('💳 Payment details:', {
      amount: quote.pricing.totalAmount,
      collector: FEE_COLLECTOR_WALLET,
      quoteId: quote.quoteId
    });

    // Get user's WHISTLE token account
    const userTokenAccount = await getOrCreateTokenAccount(connection, wallet.publicKey, whistleMint);
    
    // Calculate fee collector's WHISTLE token account (ATA)
    // Don't look it up - just calculate the address. It will be auto-created on first transfer.
    const TOKEN_PROGRAM = new solanaWeb3.PublicKey(TOKEN_PROGRAM_ID);
    const ASSOCIATED_TOKEN_PROGRAM = new solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
    
    const [collectorTokenAccount] = await solanaWeb3.PublicKey.findProgramAddress(
      [
        feeCollector.toBuffer(),
        TOKEN_PROGRAM.toBuffer(),
        whistleMint.toBuffer()
      ],
      ASSOCIATED_TOKEN_PROGRAM
    );
    
    console.log('📍 Collector ATA (calculated):', collectorTokenAccount.toString());

    // Check if collector ATA exists, if not create it
    const collectorAccountInfo = await connection.getAccountInfo(collectorTokenAccount);
    
    const tx = new solanaWeb3.Transaction();
    
    if (!collectorAccountInfo) {
      console.log('🔨 Creating ATA for fee collector...');
      // Create Associated Token Account instruction
      const createATAIx = new solanaWeb3.TransactionInstruction({
        programId: ASSOCIATED_TOKEN_PROGRAM,
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },        // payer
          { pubkey: collectorTokenAccount, isSigner: false, isWritable: true },  // associatedToken
          { pubkey: feeCollector, isSigner: false, isWritable: false },          // owner
          { pubkey: whistleMint, isSigner: false, isWritable: false },           // mint
          { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false }
        ],
        data: Buffer.from([])
      });
      tx.add(createATAIx);
    } else {
      console.log('✅ Collector ATA already exists');
    }

    // Create memo with quote reference
    const memoIx = new solanaWeb3.TransactionInstruction({
      programId: new solanaWeb3.PublicKey(MEMO_PROGRAM_ID),
      keys: [],
      data: Buffer.from(`x402:${quote.quoteId}`, 'utf8')
    });

    // Create SPL token transfer instruction
    const transferIx = new solanaWeb3.TransactionInstruction({
      programId: new solanaWeb3.PublicKey(TOKEN_PROGRAM_ID),
      keys: [
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },          // source
        { pubkey: collectorTokenAccount, isSigner: false, isWritable: true },     // destination
        { pubkey: wallet.publicKey, isSigner: true, isWritable: false }           // authority
      ],
      data: Buffer.from(
        Uint8Array.of(
          3, // Transfer instruction
          ...new Uint8Array(new BigUint64Array([BigInt(quote.pricing.totalAmount)]).buffer)
        )
      )
    });

    tx.add(memoIx);
    tx.add(transferIx);
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


