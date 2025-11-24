// x402 Client v3 - NLx402 Based Implementation
// Enhanced security with nonce-locked, hash-bound, single-use payment quotes
// Provides the same API as v2 but with NLx402 security underneath

(function () {
  // Wait for Solana Web3 to load
  function waitForSolanaWeb3() {
    return new Promise((resolve) => {
      if (window.solanaWeb3) {
        console.log('✅ Found solanaWeb3');
        resolve(window.solanaWeb3);
        return;
      }
      
      console.log('🔍 Waiting for Solana Web3...');
      
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
          resolve(null);
        }
      }, 100);
    });
  }
  
  const WHTT_PROGRAM_ID = 'whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr';
  const RPC_URL = 'https://rpc.whistle.ninja';
  
  // NLx402 Configuration
  const NLX402_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001'
    : 'https://whistle-backend.onrender.com';
  
  // Payment configuration - same as v2 for compatibility
  const PAYMENT_AMOUNT_SOL = 0.02; // 0.02 SOL total (user pays)
  const FACILITATOR_FEE_SOL = 0.001; // 0.001 SOL goes to facilitator
  const X402_AMOUNT_SOL = 0.019; // 0.019 SOL goes to X402 wallet
  const ACCESS_DURATION_HOURS = 1;
  
  // Facilitator wallet (receives 0.001 SOL per payment)
  const FACILITATOR_WALLET = 'GwtbzDh6QHwVan4DVyUR11gzBVcBT92KjnaPdk43fMG5';
  
  let solanaWeb3 = null;
  
  // Derive X402 wallet PDA from WHTT program
  function deriveX402WalletPDA() {
    if (!solanaWeb3) {
      throw new Error('Solana Web3.js not loaded');
    }
    const seeds = [Buffer.from('x402_payment_wallet')];
    const [pda] = solanaWeb3.PublicKey.findProgramAddressSync(
      seeds,
      new solanaWeb3.PublicKey(WHTT_PROGRAM_ID)
    );
    return pda;
  }

  // Generate a random nonce for NLx402
  function generateNonce() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // NLx402-based payment flow
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
    
    // Determine which wallet to use (desktop extension or mobile)
    let actualWallet = wallet;
    let walletAddress;
    let usesMobileWallet = false;
    
    // PRIORITY: Desktop extension wallet first (if connected)
    if (actualWallet && actualWallet.publicKey) {
      console.log('🖥️ Desktop extension wallet detected - using this');
      walletAddress = actualWallet.publicKey.toBase58();
      usesMobileWallet = false;
    } else {
      // Fallback to mobile wallet
      const mobilePrivateKey = localStorage.getItem('ghost_mobile_wallet');
      const mobileAddress = localStorage.getItem('ghost_mobile_address');
      
      if (mobilePrivateKey && mobileAddress) {
        console.log('📱 Mobile in-app wallet detected - using this');
        walletAddress = mobileAddress;
        usesMobileWallet = true;
      } else {
        throw new Error('No wallet connected');
      }
    }
    
    console.log('🔐 Starting NLx402 payment flow for:', feature || 'x402 access');
    console.log('👛 Using wallet:', walletAddress);
    
    try {
      // Step 1: Check for cached valid access first
      const cached = localStorage.getItem('nlx402_x402_access');
      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (data.expiresAt > Date.now()) {
            console.log('✅ Using cached NLx402 access token');
            return {
              accessToken: data.token,
              ttlSeconds: Math.floor((data.expiresAt - Date.now()) / 1000),
              txSig: data.txSig,
              message: 'Using cached access',
              cached: true
            };
          } else {
            localStorage.removeItem('nlx402_x402_access');
          }
        } catch (e) {
          console.warn('Failed to parse cached access:', e);
          localStorage.removeItem('nlx402_x402_access');
        }
      }

      // Step 2: Generate NLx402 Quote
      console.log('📋 Generating NLx402 quote...');
      const quoteResponse = await fetch(`${NLX402_BASE_URL}/api/nlx402/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          feature: feature || 'x402-access',
          amount: PAYMENT_AMOUNT_SOL,
          duration: ACCESS_DURATION_HOURS
        })
      });

      if (!quoteResponse.ok) {
        const error = await quoteResponse.json();
        throw new Error(error.error || 'Failed to generate quote');
      }

      const quoteData = await quoteResponse.json();
      const { quote, nonce } = quoteData;

      console.log(`💳 NLx402 Quote: ${PAYMENT_AMOUNT_SOL} SOL for ${ACCESS_DURATION_HOURS}h access`);
      console.log('🔑 Nonce:', nonce.substring(0, 16) + '...');

      // Step 3: Verify Quote
      console.log('✅ Verifying quote...');
      const verifyResponse = await fetch(`${NLX402_BASE_URL}/api/nlx402/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote,
          nonce,
          walletAddress
        })
      });

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json();
        throw new Error(error.error || 'Quote verification failed');
      }

      console.log('✅ Quote verified - proceeding with payment');

      // Step 4: Make Payment
      const connection = new solanaWeb3.Connection(RPC_URL, 'confirmed');
      
      // Get the actual wallet public key for balance check
      let walletPublicKey;
      if (usesMobileWallet) {
        walletPublicKey = new solanaWeb3.PublicKey(walletAddress);
      } else {
        walletPublicKey = actualWallet.publicKey;
      }
      
      // Check balance
      console.log('💰 Checking balance for:', walletPublicKey.toBase58());
      const balance = await connection.getBalance(walletPublicKey);
      const requiredLamports = Math.floor(parseFloat(quote.amount) * 1e9);
      
      console.log(`   Balance: ${balance / 1e9} SOL | Required: ${quote.amount} SOL`);
      
      if (balance < requiredLamports) {
        throw new Error(`Insufficient SOL: need ${quote.amount} SOL but have ${balance / 1e9} SOL`);
      }

      console.log(`💸 Sending ${quote.amount} SOL split payment:`);
      console.log(`   - ${X402_AMOUNT_SOL} SOL → X402 Wallet (${quote.recipient})`);
      console.log(`   - ${FACILITATOR_FEE_SOL} SOL → Facilitator (${FACILITATOR_WALLET})`);

      // Create transaction with memo
      const transaction = new solanaWeb3.Transaction();
      
      // Add memo with nonce
      const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
      const memoIx = new solanaWeb3.TransactionInstruction({
        programId: new solanaWeb3.PublicKey(MEMO_PROGRAM_ID),
        keys: [],
        data: Buffer.from(`nlx402:${nonce}:${feature || 'x402'}`, 'utf8')
      });
      
      // Add transfer to X402 wallet (0.019 SOL)
      const x402TransferIx = solanaWeb3.SystemProgram.transfer({
        fromPubkey: walletPublicKey,
        toPubkey: new solanaWeb3.PublicKey(quote.recipient),
        lamports: Math.floor(X402_AMOUNT_SOL * 1e9)
      });
      
      // Add transfer to Facilitator wallet (0.001 SOL)
      const facilitatorTransferIx = solanaWeb3.SystemProgram.transfer({
        fromPubkey: walletPublicKey,
        toPubkey: new solanaWeb3.PublicKey(FACILITATOR_WALLET),
        lamports: Math.floor(FACILITATOR_FEE_SOL * 1e9)
      });
      
      transaction.add(memoIx);
      transaction.add(x402TransferIx);
      transaction.add(facilitatorTransferIx);
      
      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash('finalized');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletPublicKey;
      
      // Sign and send based on wallet type
      let txSig;
      if (usesMobileWallet) {
        console.log('📱 Signing with mobile wallet keypair...');
        const keypair = solanaWeb3.Keypair.fromSecretKey(
          Uint8Array.from(atob(mobilePrivateKey).split('').map(c => c.charCodeAt(0)))
        );
        transaction.sign(keypair);
        txSig = await connection.sendRawTransaction(transaction.serialize());
      } else {
        console.log('🖥️ Signing with desktop extension wallet...');
        const signed = await actualWallet.signTransaction(transaction);
        txSig = await connection.sendRawTransaction(signed.serialize());
      }
      
      console.log('✅ Transaction sent:', txSig);
      
      // Wait for confirmation with timeout
      try {
        await Promise.race([
          connection.confirmTransaction(txSig, 'confirmed'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Confirmation timeout')), 15000))
        ]);
        console.log('✅ Payment confirmed!');
      } catch (confirmError) {
        console.warn('⚠️ Confirmation timeout, checking status...');
        const status = await connection.getSignatureStatus(txSig);
        if (!status || !status.value || !['confirmed', 'finalized'].includes(status.value.confirmationStatus)) {
          throw new Error('Transaction failed to confirm');
        }
      }

      // Step 5: Unlock Access with NLx402
      console.log('🔓 Unlocking access...');
      const unlockResponse = await fetch(`${NLX402_BASE_URL}/api/nlx402/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx: txSig,
          nonce,
          walletAddress,
          feature: feature || 'x402-access'
        })
      });

      if (!unlockResponse.ok) {
        const error = await unlockResponse.json();
        throw new Error(error.error || 'Failed to unlock access');
      }

      const unlockData = await unlockResponse.json();
      
      if (!unlockData.success || !unlockData.accessToken) {
        throw new Error('Failed to obtain access token');
      }

      console.log('✅ NLx402 access granted!');

      // Cache the access token
      const accessData = {
        token: unlockData.accessToken,
        txSig,
        expiresAt: Date.now() + (ACCESS_DURATION_HOURS * 60 * 60 * 1000),
        nonce,
        feature: feature || 'x402-access'
      };
      
      localStorage.setItem('nlx402_x402_access', JSON.stringify(accessData));
      
      // Also store in legacy format for backward compatibility
      const ttlSeconds = ACCESS_DURATION_HOURS * 60 * 60;
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + ttlSeconds;
      
      localStorage.setItem('x402_token', unlockData.accessToken);
      localStorage.setItem('x402_exp', String(expiresAt));
      localStorage.setItem('x402_access', JSON.stringify({
        token: unlockData.accessToken,
        expires: accessData.expiresAt,
        txSig
      }));

      return {
        accessToken: unlockData.accessToken,
        ttlSeconds,
        txSig,
        nonce,
        message: `NLx402 access granted for ${ACCESS_DURATION_HOURS} hour!`,
        nlx402: true
      };
      
    } catch (error) {
      console.error('❌ NLx402 payment flow failed:', error);
      throw error;
    }
  }
  
  // Check if user has valid access
  function hasValidAccess() {
    try {
      // Check NLx402 access first
      const nlx402Access = localStorage.getItem('nlx402_x402_access');
      if (nlx402Access) {
        const data = JSON.parse(nlx402Access);
        if (data.expiresAt > Date.now()) {
          return true;
        }
        localStorage.removeItem('nlx402_x402_access');
      }
      
      // Fallback to legacy format
      const token = localStorage.getItem('x402_token');
      const exp = parseInt(localStorage.getItem('x402_exp') || '0', 10);
      const now = Math.floor(Date.now() / 1000);
      
      if (token && exp > now + 30) {
        return true;
      }
      
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
  
  // Clear expired access
  function clearExpiredAccess() {
    try {
      // Clear NLx402 format
      const nlx402Access = localStorage.getItem('nlx402_x402_access');
      if (nlx402Access) {
        const data = JSON.parse(nlx402Access);
        if (data.expiresAt <= Date.now()) {
          localStorage.removeItem('nlx402_x402_access');
        }
      }
      
      // Clear legacy formats
      const exp = parseInt(localStorage.getItem('x402_exp') || '0', 10);
      const now = Math.floor(Date.now() / 1000);
      if (exp <= now) {
        localStorage.removeItem('x402_token');
        localStorage.removeItem('x402_exp');
      }
      
      const stored = localStorage.getItem('x402_access');
      if (stored) {
        const access = JSON.parse(stored);
        if (access.expires <= Date.now()) {
          localStorage.removeItem('x402_access');
        }
      }
    } catch {
      // Clear all on error
      localStorage.removeItem('nlx402_x402_access');
      localStorage.removeItem('x402_token');
      localStorage.removeItem('x402_exp');
      localStorage.removeItem('x402_access');
    }
  }

  // Get access token stats
  function getAccessStats() {
    try {
      const nlx402Access = localStorage.getItem('nlx402_x402_access');
      if (nlx402Access) {
        const data = JSON.parse(nlx402Access);
        return {
          hasAccess: data.expiresAt > Date.now(),
          expiresAt: data.expiresAt,
          timeRemaining: Math.max(0, data.expiresAt - Date.now()),
          txSig: data.txSig,
          nonce: data.nonce?.substring(0, 16) + '...',
          feature: data.feature,
          nlx402: true
        };
      }
      
      const token = localStorage.getItem('x402_token');
      const exp = parseInt(localStorage.getItem('x402_exp') || '0', 10);
      if (token && exp) {
        return {
          hasAccess: exp > Math.floor(Date.now() / 1000),
          expiresAt: exp * 1000,
          timeRemaining: Math.max(0, (exp * 1000) - Date.now()),
          nlx402: false
        };
      }
      
      return {
        hasAccess: false,
        expiresAt: 0,
        timeRemaining: 0,
        nlx402: false
      };
    } catch {
      return {
        hasAccess: false,
        expiresAt: 0,
        timeRemaining: 0,
        nlx402: false
      };
    }
  }

  // Detect which wallet is available (prioritizes extension wallet)
  function getAvailableWallet() {
    // Check extension wallet first (priority)
    if (window.solana && window.solana.publicKey) {
      return {
        type: 'extension',
        address: window.solana.publicKey.toBase58(),
        available: true,
        priority: 1
      };
    }
    
    // Fallback to mobile wallet
    const mobilePrivateKey = localStorage.getItem('ghost_mobile_wallet');
    const mobileAddress = localStorage.getItem('ghost_mobile_address');
    
    if (mobilePrivateKey && mobileAddress) {
      return {
        type: 'mobile',
        address: mobileAddress,
        available: true,
        priority: 2,
        warning: 'Extension wallet not detected, using mobile wallet'
      };
    }
    
    return {
      type: 'none',
      address: null,
      available: false,
      priority: 0
    };
  }

  // Initialize and export to window
  async function init() {
    // Wait for Solana Web3 to load
    solanaWeb3 = await waitForSolanaWeb3();
    
    if (!solanaWeb3) {
      console.error('❌ X402 Client v3: Solana Web3.js not found');
      window.x402 = {
        requestAndPay: async () => { throw new Error('Solana Web3.js not loaded'); },
        hasValidAccess,
        clearExpiredAccess,
        getAccessStats,
        PAYMENT_AMOUNT_SOL,
        ACCESS_DURATION_HOURS,
        X402_WALLET: null,
        version: '3.0-nlx402'
      };
      return;
    }
    
    // Export to window
    window.x402 = {
      requestAndPay: requestX402AndPay,
      hasValidAccess,
      clearExpiredAccess,
      getAccessStats,
      getAvailableWallet,
      PAYMENT_AMOUNT_SOL,
      ACCESS_DURATION_HOURS,
      X402_WALLET: deriveX402WalletPDA().toBase58(),
      version: '3.0-nlx402'
    };
    
    console.log('✅ X402 Client v3 (NLx402-based) loaded');
    console.log(`   🔐 Enhanced security: nonce-locked, hash-bound payments`);
    console.log(`   💰 Price: ${PAYMENT_AMOUNT_SOL} SOL for ${ACCESS_DURATION_HOURS} hour`);
    console.log(`   📍 X402 Wallet: ${deriveX402WalletPDA().toBase58()}`);
    console.log(`   🌐 NLx402 API: ${NLX402_BASE_URL}`);
    
    // Log wallet detection
    const walletInfo = getAvailableWallet();
    console.log(`   👛 Wallet: ${walletInfo.type} | ${walletInfo.address || 'Not connected'}`);
  }
  
  // Initialize immediately if DOM is ready, otherwise wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

