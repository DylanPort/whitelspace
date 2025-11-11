/**
 * Netlify Function: Calculate and Sign Reward Claim
 * 
 * This function:
 * 1. Calculates the user's share of fees
 * 2. Creates a partial transaction signed by fee collector
 * 3. Returns it to frontend for user to sign and pay tx fee
 */

const { Connection, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const { getAssociatedTokenAddressSync, createTransferInstruction } = require('@solana/spl-token');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://avhmgbkwfwlatykotxwv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2aG1nYmt3ZndsYXR5a290eHd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTIyMzE5OSwiZXhwIjoyMDc2Nzk5MTk5fQ.fX2d1rkjgAn7ZkjJXMjbd1cU0fNEEKB7LtfeWIgKQ4g';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configuration
const PROGRAM_ID = '2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq';
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
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
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
    const { walletAddress } = JSON.parse(event.body);

    if (!walletAddress) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'walletAddress required' })
      };
    }

    if (BLOCKED_WALLETS.has(walletAddress)) {
      console.warn(`🚫 Blocked wallet attempted reward claim: ${walletAddress}`);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Wallet not eligible to claim rewards',
          message: 'This wallet is blocked from claiming rewards.'
        })
      };
    }

    console.log('💰 Calculating claimable reward for:', walletAddress);

    // Check 24h cooldown from Supabase
    let claimInfo = null;

    try {
      const { data, error } = await supabase
        .from('claim_history')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.warn('⚠️ Error loading claim metadata:', error.message);
      } else if (data) {
        claimInfo = {
          lastClaim: data.last_claim_timestamp,
          claimLock: data.claim_lock,
          claimLockExpires: data.claim_lock_expires_at
        };
      }
    } catch (cooldownError) {
      console.warn('⚠️ Error loading claim metadata, allowing claim:', cooldownError.message);
    }

    const now = Date.now();
    const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;

    if (claimInfo?.lastClaim) {
      const timeSinceClaim = now - claimInfo.lastClaim;
      if (timeSinceClaim < cooldownMs) {
        const timeUntilNextClaim = cooldownMs - timeSinceClaim;
        const hoursRemaining = Math.ceil(timeUntilNextClaim / (60 * 60 * 1000));
        const nextClaimDate = new Date(claimInfo.lastClaim + cooldownMs);

        console.log(`⏰ Wallet ${walletAddress.slice(0, 8)}... on cooldown. ${hoursRemaining}h remaining`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            claimable: 0,
            claimableFormatted: '0',
            onCooldown: true,
            lastClaim: claimInfo.lastClaim,
            lastClaimDate: new Date(claimInfo.lastClaim).toISOString(),
            timeUntilNextClaim,
            hoursRemaining,
            nextClaimAvailable: nextClaimDate.toISOString(),
            message: `You can claim again in ${hoursRemaining} hours (${nextClaimDate.toLocaleString()})`
          })
        };
      }
    }

    if (claimInfo?.claimLock && claimInfo.claimLockExpires) {
      if (now < claimInfo.claimLockExpires) {
        const minutesRemaining = Math.ceil((claimInfo.claimLockExpires - now) / (60 * 1000));
        console.log(`🔒 Wallet ${walletAddress.slice(0, 8)}... has an active claim lock (${minutesRemaining}m remaining)`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            claimable: 0,
            claimableFormatted: '0',
            onCooldown: true,
            claimInProgress: true,
            lockExpiresAt: new Date(claimInfo.claimLockExpires).toISOString(),
            message: `Claim already in progress. Please wait up to ${minutesRemaining} minute(s) before trying again.`
          })
        };
      }
    }

    const connection = new Connection(RPC_URL, 'confirmed');
    const programId = new PublicKey(PROGRAM_ID);
    const whistleMint = new PublicKey(WHISTLE_MINT);
    const feeCollectorWallet = new PublicKey(FEE_COLLECTOR_WALLET);

    // Get pool data
    const [poolPda] = await PublicKey.findProgramAddress(
      [Buffer.from('pool')],
      programId
    );

    const poolAccountInfo = await connection.getAccountInfo(poolPda);
    if (!poolAccountInfo) {
      throw new Error('Pool account not found');
    }

    const poolData = poolAccountInfo.data;
    const totalStaked = Number(new DataView(poolData.buffer, poolData.byteOffset + 72, 8).getBigUint64(0, true));

    // Fetch $WHISTLE token decimals
    const mintInfo = await connection.getParsedAccountInfo(whistleMint);
    const decimals = mintInfo.value?.data?.parsed?.info?.decimals || 6;
    const divisor = Math.pow(10, decimals);

    // Get fee collector balance
    const feeCollectorAta = getAssociatedTokenAddressSync(whistleMint, feeCollectorWallet);
    const feeBalance = await connection.getTokenAccountBalance(feeCollectorAta);
    const totalFees = Number(feeBalance.value.amount);
    const distributionAmount = totalFees * 0.9; // 90% to stakers

    if (distributionAmount === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          claimable: 0,
          message: 'No fees available to distribute yet'
        })
      };
    }

    // Fetch all stakers
    const accounts = await connection.getProgramAccounts(programId, {
      filters: [{ dataSize: 128 }] // NodeAccount size
    });

    const stakers = [];
    const currentTime = Date.now() / 1000;
    let totalWeight = 0;

    for (const account of accounts) {
      const buffer = account.account.data;

      // Decode NodeAccount
      const owner = new PublicKey(buffer.slice(8, 40)).toBase58();
      const stakedAmount = Number(new DataView(buffer.buffer, buffer.byteOffset + 40, 8).getBigUint64(0, true)) / divisor;
      const reputationScore = Number(new DataView(buffer.buffer, buffer.byteOffset + 48, 8).getBigUint64(0, true));
      const createdAt = Number(new DataView(buffer.buffer, buffer.byteOffset + 96, 8).getBigInt64(0, true));

      // Filter out excluded wallet and zero stakes
      if (BLOCKED_WALLETS.has(owner) || stakedAmount === 0) continue;

      // Calculate weights (60% stake, 20% time, 20% reputation)
      const stakeWeight = stakedAmount / (totalStaked / divisor);
      const stakeDays = createdAt > 0 ? (currentTime - createdAt) / 86400 : 0;
      const timeWeight = Math.min(stakeDays / 30, 1);
      const repWeight = reputationScore / 100000;
      const weight = (stakeWeight * 0.6) + (timeWeight * 0.2) + (repWeight * 0.2);

      totalWeight += weight;

      stakers.push({
        owner,
        stakedAmount,
        reputationScore,
        stakeDays,
        weight,
        share: 0
      });
    }

    if (stakers.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          claimable: 0,
          message: 'No eligible stakers found'
        })
      };
    }

    // Calculate shares
    for (const staker of stakers) {
      staker.share = (staker.weight / totalWeight) * distributionAmount;
    }

    // Find this user's share
    const userStaker = stakers.find(s => s.owner === walletAddress);

    if (!userStaker) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          claimable: 0,
          message: 'You are not currently staking or not eligible'
        })
      };
    }

    const claimableAmount = Math.floor(userStaker.share);

    if (claimableAmount === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          claimable: 0,
          claimableFormatted: '0',
          message: 'Your share is too small to claim (< 0.000001 $WHISTLE)'
        })
      };
    }

    console.log(`✅ User ${walletAddress.slice(0, 8)}... can claim: ${(claimableAmount / divisor).toFixed(4)} $WHISTLE`);

    // Set claim lock in Supabase to prevent concurrent claims
    try {
      await supabase
        .from('claim_history')
        .upsert({
          wallet_address: walletAddress,
          last_claim_timestamp: claimInfo?.lastClaim || 0,
          claim_lock: true,
          claim_lock_expires_at: now + CLAIM_LOCK_MS,
          claim_status: 'pending'
        }, {
          onConflict: 'wallet_address'
        });
      console.log(`🔒 Claim lock set for ${walletAddress.slice(0, 8)}... until ${new Date(now + CLAIM_LOCK_MS).toISOString()}`);
    } catch (lockError) {
      console.error('⚠️ Failed to set claim lock (continuing):', lockError);
    }

    // Return claimable amount
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        claimable: claimableAmount,
        claimableFormatted: (claimableAmount / divisor).toLocaleString(undefined, { maximumFractionDigits: 4 }),
        decimals: decimals,
        totalDistributing: distributionAmount,
        yourShare: userStaker.share,
        yourWeight: userStaker.weight,
        totalWeight: totalWeight,
        stakedAmount: userStaker.stakedAmount,
        stakeDays: Math.floor(userStaker.stakeDays),
        reputationScore: userStaker.reputationScore,
        feeCollectorWallet: FEE_COLLECTOR_WALLET,
        claimLockExpiresAt: new Date(claimLockPayload.claimLockExpires).toISOString(),
        message: `Ready to claim! Complete within ${CLAIM_LOCK_MINUTES} minute(s) to avoid losing your slot.`
      })
    };

  } catch (error) {
    console.error('❌ Error calculating claimable:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to calculate claimable amount',
        details: error.message
      })
    };
  }
};

