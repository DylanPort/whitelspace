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

  async function requestX402AndPay({ wallet, hops = 3, keypair = null }) {
    // 🆓 X402 DISABLED - ALL FEATURES ARE NOW FREE!
    console.log('🆓 X402 payment bypassed - Free access granted!');
    
    // Return a fake access token to satisfy any code expecting this structure
    return { 
      accessToken: 'FREE_ACCESS', 
      ttlSeconds: 999999999,  // Essentially unlimited
      txSig: 'no_payment_required',
      message: 'All features are free - no payment required!'
    };
  }

  window.requestX402AndPay = requestX402AndPay;
})();


