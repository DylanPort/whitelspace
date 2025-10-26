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
const { getStore } = require('@netlify/blobs');

// Configuration
const PROGRAM_ID = '2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq';
const WHISTLE_MINT = '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump';
const FEE_COLLECTOR_WALLET = 'G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg';
const RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba';
const EXCLUDED_WALLET = '7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF';
const COOLDOWN_HOURS = 24;

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

    console.log('💰 Calculating claimable reward for:', walletAddress);

    // Check 24h cooldown
    try {
      const store = getStore('claim-timestamps');
      const lastClaimData = await store.get(walletAddress);
      
      if (lastClaimData) {
        const claimInfo = JSON.parse(lastClaimData);
        const now = Date.now();
        const timeSinceClaim = now - claimInfo.lastClaim;
        const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
        
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
    } catch (cooldownError) {
      console.warn('⚠️ Error checking cooldown, allowing claim:', cooldownError.message);
      // If cooldown check fails, allow claim (fail open)
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
      if (owner === EXCLUDED_WALLET || stakedAmount === 0) continue;

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
        message: 'Ready to claim! Click the claim button to receive your rewards.'
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

