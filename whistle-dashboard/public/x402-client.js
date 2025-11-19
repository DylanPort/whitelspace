// x402 client helper for Ghost Whistle - Trustless Distribution via Smart Contract
// Sends fees to staking pool for automatic distribution to stakers!

(function () {
  const WHISTLE_MINT = '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump';
  const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
  const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
  const PROGRAM_ID = '2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq';
  const SYSTEM_PROGRAM = '11111111111111111111111111111111';
  // Direct transfer mode: send fees to this fee collector wallet (not a program)
  const FEE_COLLECTOR_WALLET = 'G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg';
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

  async function requestX402AndPay({ wallet, hops = 3, keypair = null, feature = null }) {
    // 🆓 BYPASS PAYMENT FOR STAKING AND NODE OPERATIONS ONLY
    const freeFeatures = ['stake', 'unstake', 'run-node', 'staking', 'node'];
    if (feature && freeFeatures.some(f => feature.toLowerCase().includes(f))) {
      console.log(`🆓 X402 bypassed for ${feature} - Free access granted!`);
      return { 
        accessToken: 'FREE_ACCESS', 
        ttlSeconds: 999999999,
        txSig: 'no_payment_required',
        message: `${feature} is free - no payment required!`
      };
    }
    
    if (!wallet || !wallet.publicKey) throw new Error('Wallet not connected');

    // Detect wallet type: mobile in-app (has keypair) vs desktop extension (needs signTransaction)
    const isMobileWallet = !!keypair;
    console.log(`💼 Wallet type: ${isMobileWallet ? 'Mobile In-App' : 'Desktop Extension'}`);

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
    const TOKEN_PROGRAM = new solanaWeb3.PublicKey(TOKEN_PROGRAM_ID);
    const ASSOCIATED_TOKEN_PROGRAM = new solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
    const feeCollector = new solanaWeb3.PublicKey(FEE_COLLECTOR_WALLET);
    
    // Derive fee collector associated token account
    const [collectorAta] = await solanaWeb3.PublicKey.findProgramAddress(
      [
        feeCollector.toBuffer(),
        TOKEN_PROGRAM.toBuffer(),
        whistleMint.toBuffer()
      ],
      ASSOCIATED_TOKEN_PROGRAM
    );
    
    console.log('💳 Payment details:', {
      amount: quote.pricing.totalAmount,
      collector: feeCollector.toString(),
      collectorAta: collectorAta.toString(),
      quoteId: quote.quoteId,
      walletType: isMobileWallet ? 'mobile' : 'desktop'
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

    // Before building the instruction, ensure user has enough $WHISTLE
    try {
      const balResp = await connection.getTokenAccountBalance(userTokenAccount);
      const userBalanceRaw = BigInt(balResp?.value?.amount || '0');
      const requiredRaw = BigInt(quote.pricing.totalAmount);
      if (userBalanceRaw < requiredRaw) {
        throw new Error(`Insufficient $WHISTLE: need ${Number(requiredRaw) / 1e6} but have ${Number(userBalanceRaw) / 1e6}`);
      }
    } catch (balErr) {
      console.error('❌ Balance check failed:', balErr);
      throw balErr;
    }

    // Create SPL Token transfer to the fee collector ATA (no CPI)
    let transferIx;
    if (window.splToken?.createTransferCheckedInstruction) {
      transferIx = window.splToken.createTransferCheckedInstruction(
        userTokenAccount,
        whistleMint,
        collectorAta,
        wallet.publicKey,
        BigInt(quote.pricing.totalAmount),
        6 // WHISTLE has 6 decimals
      );
    } else {
      const data = Buffer.alloc(1 + 8);
      data.writeUInt8(3, 0); // Token Program Transfer instruction
      data.writeBigUInt64LE(BigInt(quote.pricing.totalAmount), 1);
      transferIx = new solanaWeb3.TransactionInstruction({
        programId: TOKEN_PROGRAM,
        keys: [
          { pubkey: userTokenAccount, isSigner: false, isWritable: true },
          { pubkey: collectorAta, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: false }
        ],
        data
      });
    }

    tx.add(memoIx);
    tx.add(transferIx);
    tx.feePayer = wallet.publicKey;
    
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;

    console.log('📤 Sending payment...');
    let sig;
    
    // MOBILE IN-APP WALLET: Sign and send with keypair (no user interaction needed)
    if (isMobileWallet) {
      console.log('📱 Using mobile in-app wallet (auto-signing)...');
      sig = await connection.sendTransaction(tx, [keypair], { 
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
    }
    // DESKTOP EXTENSION WALLET: Request signature from user via wallet popup
    else {
      console.log('🖥️ Using desktop extension wallet (requesting signature)...');
      const signed = await wallet.signTransaction(tx);
      sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
    }
    
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


