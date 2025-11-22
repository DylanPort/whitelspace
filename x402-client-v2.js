// x402 client helper for Ghost Whistle - SOL payments to WHTT X402 wallet
// Sends 0.02 SOL for 1 hour access directly to smart contract x402 wallet

(function () {
  const WHTT_PROGRAM_ID = 'whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr';
  const AUTHORITY = '6BNdVMgx2JZJPvkRCLyV2LLxft4S1cwuqoX2BS9eFyvh';
  const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
  const SYSTEM_PROGRAM = '11111111111111111111111111111111';
  const RPC_URL = 'https://rpc.whistle.ninja';
  
  // Payment configuration
  const PAYMENT_AMOUNT_SOL = 0.02; // 0.02 SOL for 1 hour access
  const ACCESS_DURATION_HOURS = 1;
  
  // Derive X402 wallet PDA from WHTT program
  function deriveX402WalletPDA() {
    const seeds = [
      Buffer.from('x402_payment_wallet'),
      new solanaWeb3.PublicKey(AUTHORITY).toBuffer()
    ];
    const [pda] = solanaWeb3.PublicKey.findProgramAddressSync(
      seeds,
      new solanaWeb3.PublicKey(WHTT_PROGRAM_ID)
    );
    return pda;
  }

  async function requestX402AndPay({ wallet, feature = null }) {
    // Free features bypass payment
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

    // Get X402 wallet address
    const X402_WALLET_PDA = deriveX402WalletPDA();
    console.log('💳 X402 Wallet PDA:', X402_WALLET_PDA.toBase58());
    
    // Connect to RPC
    const connection = new solanaWeb3.Connection(RPC_URL, 'confirmed');
    
    // Check wallet SOL balance
    const balance = await connection.getBalance(wallet.publicKey);
    const requiredLamports = PAYMENT_AMOUNT_SOL * solanaWeb3.LAMPORTS_PER_SOL;
    
    if (balance < requiredLamports) {
      throw new Error(`Insufficient SOL: need ${PAYMENT_AMOUNT_SOL} SOL but have ${balance / solanaWeb3.LAMPORTS_PER_SOL} SOL`);
    }
    
    console.log(`💰 Sending ${PAYMENT_AMOUNT_SOL} SOL for ${ACCESS_DURATION_HOURS} hour access...`);
    
    // Create transaction
    const transaction = new solanaWeb3.Transaction();
    
    // Add memo for tracking
    const memoIx = new solanaWeb3.TransactionInstruction({
      programId: new solanaWeb3.PublicKey(MEMO_PROGRAM_ID),
      keys: [],
      data: Buffer.from(`x402_payment:${Date.now()}`, 'utf8')
    });
    
    // Add SOL transfer to X402 wallet
    const transferIx = solanaWeb3.SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: X402_WALLET_PDA,
      lamports: requiredLamports
    });
    
    transaction.add(memoIx);
    transaction.add(transferIx);
    
    // Get latest blockhash
    const { blockhash } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;
    
    // Sign and send transaction
    let txSig;
    try {
      const signed = await wallet.signTransaction(transaction);
      txSig = await connection.sendRawTransaction(signed.serialize());
      console.log('✅ Transaction sent:', txSig);
      
      // Wait for confirmation
      await connection.confirmTransaction(txSig, 'confirmed');
      console.log('✅ Payment confirmed!');
      
    } catch (error) {
      console.error('❌ Transaction failed:', error);
      throw error;
    }
    
    // Generate access token
    const accessToken = btoa(JSON.stringify({
      wallet: wallet.publicKey.toBase58(),
      txSig,
      timestamp: Date.now(),
      validUntil: Date.now() + (ACCESS_DURATION_HOURS * 60 * 60 * 1000)
    }));
    
    // Store in localStorage for persistence
    localStorage.setItem('x402_access', JSON.stringify({
      token: accessToken,
      expires: Date.now() + (ACCESS_DURATION_HOURS * 60 * 60 * 1000),
      txSig
    }));
    
    return {
      accessToken,
      ttlSeconds: ACCESS_DURATION_HOURS * 60 * 60,
      txSig,
      message: `Access granted for ${ACCESS_DURATION_HOURS} hour!`
    };
  }
  
  // Check if user has valid access
  function hasValidAccess() {
    try {
      const stored = localStorage.getItem('x402_access');
      if (!stored) return false;
      
      const access = JSON.parse(stored);
      return access.expires > Date.now();
    } catch {
      return false;
    }
  }
  
  // Clear expired access
  function clearExpiredAccess() {
    try {
      const stored = localStorage.getItem('x402_access');
      if (!stored) return;
      
      const access = JSON.parse(stored);
      if (access.expires <= Date.now()) {
        localStorage.removeItem('x402_access');
      }
    } catch {
      localStorage.removeItem('x402_access');
    }
  }

  // Export to window
  window.x402 = {
    requestAndPay: requestX402AndPay,
    hasValidAccess,
    clearExpiredAccess,
    PAYMENT_AMOUNT_SOL,
    ACCESS_DURATION_HOURS,
    X402_WALLET: deriveX402WalletPDA().toBase58()
  };
  
  console.log('✅ X402 Client v2 loaded - SOL payments to WHTT contract');
  console.log(`   Price: ${PAYMENT_AMOUNT_SOL} SOL for ${ACCESS_DURATION_HOURS} hour`);
  console.log(`   X402 Wallet: ${deriveX402WalletPDA().toBase58()}`);
})();
