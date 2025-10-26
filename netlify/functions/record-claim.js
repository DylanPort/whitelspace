/**
 * Netlify Function: Record Claim Timestamp
 * 
 * Records when a wallet claimed rewards to enforce 24h cooldown
 */

const { getStore } = require('@netlify/blobs');

const COOLDOWN_HOURS = 24;

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
    const store = getStore('claim-timestamps');
    
    if (event.httpMethod === 'POST') {
      // Record a claim
      const { walletAddress, signature } = JSON.parse(event.body);
      
      if (!walletAddress) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'walletAddress required' })
        };
      }

      const timestamp = Date.now();
      await store.set(walletAddress, JSON.stringify({
        lastClaim: timestamp,
        signature: signature || null
      }));

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

      const data = await store.get(walletAddress);
      
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

      const claimData = JSON.parse(data);
      const now = Date.now();
      const timeSinceClaim = now - claimData.lastClaim;
      const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
      const canClaim = timeSinceClaim >= cooldownMs;
      const timeUntilNextClaim = canClaim ? 0 : cooldownMs - timeSinceClaim;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          canClaim,
          lastClaim: claimData.lastClaim,
          lastClaimDate: new Date(claimData.lastClaim).toISOString(),
          timeSinceClaim,
          timeUntilNextClaim,
          nextClaimAvailable: claimData.lastClaim + cooldownMs,
          hoursUntilNextClaim: Math.ceil(timeUntilNextClaim / (60 * 60 * 1000)),
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

