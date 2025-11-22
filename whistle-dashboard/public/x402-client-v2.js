// x402 client helper for Ghost Whistle - SOL payments to WHTT X402 wallet
// Sends 0.02 SOL for 1 hour access directly to smart contract x402 wallet

(function () {
  // Wait for Solana Web3 to load
  function waitForSolanaWeb3() {
    return new Promise((resolve) => {
      // Check immediately
      if (window.solanaWeb3) {
        console.log('✅ Found solanaWeb3');
        resolve(window.solanaWeb3);
        return;
      }
      
      // Debug: log what's available
      console.log('🔍 Waiting for Solana Web3... Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('solana')));
      
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        if (window.solanaWeb3) {
          clearInterval(checkInterval);
          console.log('✅ Solana Web3.js loaded after', attempts * 100, 'ms');
          resolve(window.solanaWeb3);
        } else if (attempts > 100) { // 10 seconds
          clearInterval(checkInterval);
          console.error('❌ Solana Web3.js not found after 10 seconds');
          console.error('Available:', Object.keys(window).filter(k => k.toLowerCase().includes('solana')));
          resolve(null);
        }
      }, 100);
    });
  }
  
  const WHTT_PROGRAM_ID = 'whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr';
  const AUTHORITY = '6BNdVMgx2JZJPvkRCLyV2LLxft4S1cwuqoX2BS9eFyvh';
  const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
  const SYSTEM_PROGRAM = '11111111111111111111111111111111';
  const RPC_URL = 'https://rpc.whistle.ninja';
  
  // Payment configuration
  const PAYMENT_AMOUNT_SOL = 0.02; // 0.02 SOL for 1 hour access
  const ACCESS_DURATION_HOURS = 1;
  
  let solanaWeb3 = null;
  
  // Derive X402 wallet PDA from WHTT program
  function deriveX402WalletPDA() {
    if (!solanaWeb3) {
      throw new Error('Solana Web3.js not loaded');
    }
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
    // Ensure Solana Web3 is loaded
    if (!solanaWeb3) {
      solanaWeb3 = await waitForSolanaWeb3();
      if (!solanaWeb3) {
        throw new Error('Solana Web3.js failed to load');
      }
    }
    
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
    const requiredLamports = PAYMENT_AMOUNT_SOL * 1e9; // LAMPORTS_PER_SOL = 1e9
    
    if (balance < requiredLamports) {
      throw new Error(`Insufficient SOL: need ${PAYMENT_AMOUNT_SOL} SOL but have ${balance / 1e9} SOL`);
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
    let confirmed = false;
    try {
      const signed = await wallet.signTransaction(transaction);
      txSig = await connection.sendRawTransaction(signed.serialize());
      console.log('✅ Transaction sent:', txSig);
      
      // Try to confirm with timeout handling
      try {
        await Promise.race([
          connection.confirmTransaction(txSig, 'confirmed'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Confirmation timeout')), 15000))
        ]);
        confirmed = true;
        console.log('✅ Payment confirmed!');
      } catch (confirmError) {
        console.warn('⚠️ Confirmation timeout/error, checking transaction status...', confirmError.message);
        
        // Check if transaction actually succeeded by polling
        try {
          const status = await connection.getSignatureStatus(txSig);
          if (status && status.value && (status.value.confirmationStatus === 'confirmed' || status.value.confirmationStatus === 'finalized')) {
            confirmed = true;
            console.log('✅ Transaction confirmed via status check!');
          } else {
            console.warn('⚠️ Transaction status unknown, but granting access (transaction was sent)');
            // Grant access anyway since transaction was sent successfully
            confirmed = true;
          }
        } catch (statusError) {
          console.warn('⚠️ Could not check transaction status, but granting access (transaction was sent)');
          // Grant access anyway since transaction was sent successfully
          confirmed = true;
        }
      }
      
    } catch (error) {
      // Only throw if transaction wasn't sent
      if (!txSig) {
        console.error('❌ Transaction failed to send:', error);
        throw error;
      } else {
        // Transaction was sent, grant access even if confirmation failed
        console.warn('⚠️ Transaction sent but confirmation failed, granting access anyway');
        confirmed = true;
      }
    }
    
    if (!txSig) {
      throw new Error('Transaction was not sent');
    }
    
    // Generate access token
    const accessToken = btoa(JSON.stringify({
      wallet: wallet.publicKey.toBase58(),
      txSig,
      timestamp: Date.now(),
      validUntil: Date.now() + (ACCESS_DURATION_HOURS * 60 * 60 * 1000)
    }));
    
    const ttlSeconds = ACCESS_DURATION_HOURS * 60 * 60;
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + ttlSeconds;
    
    // Store in localStorage in format expected by main.html
    localStorage.setItem('x402_token', accessToken);
    localStorage.setItem('x402_exp', String(expiresAt));
    
    // Also store in x402_access format for backward compatibility
    localStorage.setItem('x402_access', JSON.stringify({
      token: accessToken,
      expires: Date.now() + (ACCESS_DURATION_HOURS * 60 * 60 * 1000),
      txSig
    }));
    
    console.log('✅ Access token stored:', { accessToken, expiresAt, ttlSeconds });
    
    return {
      accessToken,
      ttlSeconds,
      txSig,
      message: `Access granted for ${ACCESS_DURATION_HOURS} hour!`
    };
  }
  
  // Check if user has valid access (checks both storage formats)
  function hasValidAccess() {
    try {
      // Check main.html format first (x402_token + x402_exp)
      const token = localStorage.getItem('x402_token');
      const exp = parseInt(localStorage.getItem('x402_exp') || '0', 10);
      const now = Math.floor(Date.now() / 1000);
      
      if (token && exp > now + 30) {
        return true;
      }
      
      // Fallback to x402_access format
      const stored = localStorage.getItem('x402_access');
      if (stored) {
        const access = JSON.parse(stored);
        return access.expires > Date.now();
      }
      
      return false;
    } catch {
      return false;
    }
  }
  
  // Clear expired access (clears both storage formats)
  function clearExpiredAccess() {
    try {
      // Check and clear main.html format
      const exp = parseInt(localStorage.getItem('x402_exp') || '0', 10);
      const now = Math.floor(Date.now() / 1000);
      if (exp <= now) {
        localStorage.removeItem('x402_token');
        localStorage.removeItem('x402_exp');
      }
      
      // Check and clear x402_access format
      const stored = localStorage.getItem('x402_access');
      if (stored) {
        const access = JSON.parse(stored);
        if (access.expires <= Date.now()) {
          localStorage.removeItem('x402_access');
        }
      }
    } catch {
      localStorage.removeItem('x402_token');
      localStorage.removeItem('x402_exp');
      localStorage.removeItem('x402_access');
    }
  }

  // Initialize and export to window
  async function init() {
    // Wait for Solana Web3 to load
    solanaWeb3 = await waitForSolanaWeb3();
    
    if (!solanaWeb3) {
      console.error('❌ X402 Client: Solana Web3.js not found');
      // Still expose API but it will fail gracefully
      window.x402 = {
        requestAndPay: async () => { throw new Error('Solana Web3.js not loaded'); },
        hasValidAccess,
        clearExpiredAccess,
        PAYMENT_AMOUNT_SOL,
        ACCESS_DURATION_HOURS,
        X402_WALLET: null
      };
      return;
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
  }
  
  // Initialize immediately if DOM is ready, otherwise wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
