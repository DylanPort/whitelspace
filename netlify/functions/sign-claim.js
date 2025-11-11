/**
 * Netlify Function: Sign Claim Transaction
 * 
 * This creates and partially signs a transaction for the user to claim rewards
 * User adds their signature and pays the transaction fee
 * 
 * Store FEE_COLLECTOR_PRIVATE_KEY in Netlify environment variables (encrypted)
 */

const { Connection, PublicKey, Transaction, Keypair } = require('@solana/web3.js');
const { getAssociatedTokenAddressSync, createTransferInstruction } = require('@solana/spl-token');
const { createClient } = require('@supabase/supabase-js');
const bs58 = require('bs58');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://avhmgbkwfwlatykotxwv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2aG1nYmt3ZndsYXR5a290eHd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTIyMzE5OSwiZXhwIjoyMDc2Nzk5MTk5fQ.fX2d1rkjgAn7ZkjJXMjbd1cU0fNEEKB7LtfeWIgKQ4g';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const WHISTLE_MINT = '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump';
const FEE_COLLECTOR_WALLET = 'G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg';
const RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba';
const BLOCKED_WALLETS = new Set([
  '7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF',
  'G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg'
]);
const COOLDOWN_HOURS = 24;
const CLAIM_LOCK_MINUTES = 5;
const CLAIM_LOCK_MS = CLAIM_LOCK_MINUTES * 60 * 1000;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { userWallet, claimableAmount } = JSON.parse(event.body);

    if (!userWallet || !claimableAmount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userWallet and claimableAmount required' })
      };
    }

    if (BLOCKED_WALLETS.has(userWallet)) {
      console.warn(`🚫 Blocked wallet attempted to request claim signature: ${userWallet}`);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Wallet not eligible to claim rewards',
          message: 'This wallet is blocked from claiming rewards.'
        })
      };
    }

    let claimInfo = null;
    const now = Date.now();
    const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;

    try {
      const { data, error } = await supabase
        .from('claim_history')
        .select('*')
        .eq('wallet_address', userWallet)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.warn('⚠️ Unable to load claim state:', error.message);
      } else if (data) {
        claimInfo = {
          lastClaim: data.last_claim_timestamp,
          claimLock: data.claim_lock,
          claimLockExpires: data.claim_lock_expires_at
        };
      }
    } catch (storeError) {
      console.warn('⚠️ Unable to load claim state (continuing):', storeError.message);
    }

    if (claimInfo?.lastClaim) {
      const elapsed = now - claimInfo.lastClaim;
      if (elapsed < cooldownMs) {
        const waitMs = cooldownMs - elapsed;
        const hoursRemaining = Math.ceil(waitMs / (60 * 60 * 1000));
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({
            error: 'Claim cooldown active',
            message: `Please wait ${hoursRemaining} hour(s) before claiming again.`,
            onCooldown: true,
            hoursRemaining
          })
        };
      }
    }

    if (claimInfo?.claimLock && claimInfo.claimLockExpires) {
      if (now < claimInfo.claimLockExpires) {
        const minutesRemaining = Math.ceil((claimInfo.claimLockExpires - now) / (60 * 1000));
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({
            error: 'Claim already in progress',
            message: `A claim is already in progress. Please wait up to ${minutesRemaining} minute(s).`,
            claimInProgress: true,
            minutesRemaining
          })
        };
      }
    }

    // Load private key from environment variable
    const PRIVATE_KEY = process.env.FEE_COLLECTOR_PRIVATE_KEY;
    if (!PRIVATE_KEY) {
      throw new Error('FEE_COLLECTOR_PRIVATE_KEY not configured');
    }

    const keypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));

    if (keypair.publicKey.toBase58() !== FEE_COLLECTOR_WALLET) {
      throw new Error('Private key mismatch');
    }

    console.log(`🔐 Signing claim for ${userWallet.slice(0, 8)}... Amount: ${claimableAmount}`);

    const connection = new Connection(RPC_URL, 'confirmed');
    const whistleMint = new PublicKey(WHISTLE_MINT);
    const userPubkey = new PublicKey(userWallet);

    // Get token accounts
    const fromAta = getAssociatedTokenAddressSync(whistleMint, keypair.publicKey);
    const toAta = getAssociatedTokenAddressSync(whistleMint, userPubkey);

    // Check if user has token account
    const toAtaInfo = await connection.getAccountInfo(toAta);
    if (!toAtaInfo) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'You need to create a $WHISTLE token account first',
          message: 'Please visit pump.fun and buy at least 0.000001 $WHISTLE to create your token account'
        })
      };
    }

    // Create transfer instruction
    const transferIx = createTransferInstruction(
      fromAta,
      toAta,
      keypair.publicKey,
      BigInt(claimableAmount)
    );

    // Create transaction
    const transaction = new Transaction();
    transaction.add(transferIx);
    transaction.feePayer = userPubkey; // User pays the fee!

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;

    // Fee collector signs first
    transaction.partialSign(keypair);

    // Serialize the partially signed transaction
    console.log('🔐 Serializing partially signed transaction...');
    const serialized = transaction.serialize({
      requireAllSignatures: false, // Not all signatures yet
      verifySignatures: false
    });

    const base64Transaction = serialized.toString('base64');
    console.log(`✅ Partially signed transaction for ${userWallet.slice(0, 8)}... (${serialized.length} bytes)`);

    // Set claim lock in Supabase
    try {
      await supabase
        .from('claim_history')
        .upsert({
          wallet_address: userWallet,
          last_claim_timestamp: claimInfo?.lastClaim || 0,
          transaction_signature: null,
          claim_lock: true,
          claim_lock_expires_at: now + CLAIM_LOCK_MS,
          claim_status: 'pending'
        }, {
          onConflict: 'wallet_address'
        });
      console.log(`🔒 Claim lock set for ${userWallet.slice(0, 8)}...`);
    } catch (lockError) {
      console.error('⚠️ Failed to persist claim lock (continuing):', lockError);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transaction: base64Transaction,
        amount: claimableAmount,
        lockExpiresAt: new Date(now + CLAIM_LOCK_MS).toISOString(),
        message: `Transaction ready for your signature. Complete within ${CLAIM_LOCK_MINUTES} minute(s). You will pay the transaction fee (~0.000005 SOL)`
      })
    };

  } catch (error) {
    console.error('❌ Signing error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create claim transaction',
        details: error.message
      })
    };
  }
};

