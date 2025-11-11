/**
 * Netlify Function: Record Claim Timestamp
 * 
 * Records when a wallet claimed rewards to enforce 24h cooldown
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://avhmgbkwfwlatykotxwv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2aG1nYmt3ZndsYXR5a290eHd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTIyMzE5OSwiZXhwIjoyMDc2Nzk5MTk5fQ.fX2d1rkjgAn7ZkjJXMjbd1cU0fNEEKB7LtfeWIgKQ4g';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const COOLDOWN_HOURS = 24;
const CLAIM_LOCK_MINUTES = 5;
const CLAIM_LOCK_MS = CLAIM_LOCK_MINUTES * 60 * 1000;
const BLOCKED_WALLETS = new Set([
  '7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF',
  'G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg'
]);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod === 'POST') {
      // Record a claim
      const { walletAddress, signature, amount } = JSON.parse(event.body);
      
      if (!walletAddress) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'walletAddress required' })
        };
      }

      if (BLOCKED_WALLETS.has(walletAddress)) {
        console.warn(`🚫 Blocked wallet attempted to record claim: ${walletAddress}`);
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            error: 'Wallet not eligible to claim rewards',
            message: 'This wallet is blocked from claiming rewards.'
          })
        };
      }

      const timestamp = Date.now();
      
      // Upsert claim record in Supabase
      const { data, error } = await supabase
        .from('claim_history')
        .upsert({
          wallet_address: walletAddress,
          last_claim_timestamp: timestamp,
          last_claim_date: new Date(timestamp).toISOString(),
          claim_amount: amount || 0,
          transaction_signature: signature || null,
          claim_status: 'completed',
          claim_lock: false,
          claim_lock_expires_at: null
        }, {
          onConflict: 'wallet_address'
        })
        .select();

      if (error) {
        console.error('❌ Supabase error recording claim:', error);
        throw error;
      }

      console.log(`✅ Recorded claim for ${walletAddress.slice(0, 8)}... at ${new Date(timestamp).toISOString()}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          timestamp,
          nextClaimAvailable: timestamp + (COOLDOWN_HOURS * 60 * 60 * 1000)
        })
      };
    } else if (event.httpMethod === 'GET') {
      // Check last claim time
      const walletAddress = event.queryStringParameters?.wallet;
      
      if (!walletAddress) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'wallet parameter required' })
        };
      }

      if (BLOCKED_WALLETS.has(walletAddress)) {
        console.warn(`🚫 Blocked wallet attempted to query claim history: ${walletAddress}`);
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            error: 'Wallet not eligible to claim rewards',
            message: 'This wallet is blocked from claiming rewards.'
          })
        };
      }

      // Query Supabase for claim history
      const { data, error } = await supabase
        .from('claim_history')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('❌ Supabase error fetching claim:', error);
        throw error;
      }
      
      if (!data) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            canClaim: true,
            message: 'No previous claim found'
          })
        };
      }

      const now = Date.now();
      const lastClaimTimestamp = data.last_claim_timestamp;
      const timeSinceClaim = now - lastClaimTimestamp;
      const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
      const canClaim = timeSinceClaim >= cooldownMs;
      const timeUntilNextClaim = canClaim ? 0 : cooldownMs - timeSinceClaim;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          canClaim,
          lastClaim: lastClaimTimestamp,
          lastClaimDate: new Date(lastClaimTimestamp).toISOString(),
          timeSinceClaim,
          timeUntilNextClaim,
          nextClaimAvailable: lastClaimTimestamp + cooldownMs,
          hoursUntilNextClaim: Math.ceil(timeUntilNextClaim / (60 * 60 * 1000)),
          claimLock: data.claim_lock || false,
          claimLockExpires: data.claim_lock_expires_at,
          claimAmount: data.claim_amount,
          message: canClaim ? 'Ready to claim' : `Please wait ${Math.ceil(timeUntilNextClaim / (60 * 60 * 1000))} hours before claiming again`
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('❌ Claim tracking error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to track claim',
        details: error.message
      })
    };
  }
};

