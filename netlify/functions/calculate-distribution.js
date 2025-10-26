const { Connection, PublicKey } = require('@solana/web3.js');

// Configuration
const PROGRAM_ID = '2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq';
const WHISTLE_MINT = '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump';
const FEE_COLLECTOR = 'G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba';

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🔄 Starting distribution calculation...');
    
    const connection = new Connection(RPC_URL, 'confirmed');
    const programId = new PublicKey(PROGRAM_ID);
    
    // 1. Fetch pool data
    const [poolPda] = await PublicKey.findProgramAddress(
      [Buffer.from('pool')],
      programId
    );
    
    const poolAccountInfo = await connection.getAccountInfo(poolPda);
    if (!poolAccountInfo) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'pool_not_found' })
      };
    }
    
    const poolDataBuffer = poolAccountInfo.data;
    const poolData = {
      authority: new PublicKey(poolDataBuffer.slice(8, 40)).toBase58(),
      whistleMint: new PublicKey(poolDataBuffer.slice(40, 72)).toBase58(),
      totalStaked: Number(new DataView(poolDataBuffer.buffer).getBigUint64(72, true)) / 1e9,
      totalNodes: Number(new DataView(poolDataBuffer.buffer).getBigUint64(80, true)),
      totalReputation: Number(new DataView(poolDataBuffer.buffer).getBigUint64(88, true)),
      feePool: Number(new DataView(poolDataBuffer.buffer).getBigUint64(96, true)) / 1e9,
      baseReward: Number(new DataView(poolDataBuffer.buffer).getBigUint64(104, true)) / 1e9,
      bonusPerPoint: Number(new DataView(poolDataBuffer.buffer).getBigUint64(112, true)) / 1e9,
      totalRelayRequests: Number(new DataView(poolDataBuffer.buffer).getBigUint64(120, true))
    };
    
    console.log(`📊 Pool: ${poolData.totalStaked.toLocaleString()} staked, ${poolData.feePool.toLocaleString()} in fee pool`);
    
    // 2. Fetch all node accounts (filter by size = 136 bytes)
    const accounts = await connection.getProgramAccounts(programId, {
      filters: [
        {
          dataSize: 136 // NodeAccount size
        }
      ]
    });
    
    console.log(`👥 Found ${accounts.length} node accounts`);
    
    const currentTime = Date.now() / 1000;
    const distributions = [];
    let totalWeight = 0;
    
    // 3. First pass: decode accounts and calculate weights
    for (const { pubkey, account } of accounts) {
      try {
        const buffer = account.data;
        const nodeData = {
          address: pubkey.toBase58(),
          owner: new PublicKey(buffer.slice(8, 40)).toBase58(),
          stakedAmount: Number(new DataView(buffer.buffer).getBigUint64(40, true)) / 1e9,
          reputationScore: Number(new DataView(buffer.buffer).getBigUint64(48, true)),
          totalRelays: Number(new DataView(buffer.buffer).getBigUint64(56, true)),
          successfulRelays: Number(new DataView(buffer.buffer).getBigUint64(64, true)),
          failedRelays: Number(new DataView(buffer.buffer).getBigUint64(72, true)),
          totalEarned: Number(new DataView(buffer.buffer).getBigUint64(80, true)) / 1e9,
          pendingRewards: Number(new DataView(buffer.buffer).getBigUint64(88, true)) / 1e9,
          totalClaimed: Number(new DataView(buffer.buffer).getBigUint64(96, true)) / 1e9,
          createdAt: Number(new DataView(buffer.buffer).getBigInt64(104, true)),
          lastRelay: Number(new DataView(buffer.buffer).getBigInt64(112, true))
        };
        
        // Only include nodes with staked amount
        if (nodeData.stakedAmount <= 0) continue;
        
        // Calculate weights for fair distribution
        const stakeWeight = nodeData.stakedAmount / poolData.totalStaked;
        const stakeDays = nodeData.createdAt > 0 ? (currentTime - nodeData.createdAt) / 86400 : 0;
        const timeWeight = Math.min(stakeDays / 30, 1); // Max weight at 30 days
        const repWeight = nodeData.reputationScore / 100000; // Normalize reputation
        
        // Combined weight: 60% stake, 20% time, 20% reputation
        const weight = (stakeWeight * 0.6) + (timeWeight * 0.2) + (repWeight * 0.2);
        totalWeight += weight;
        
        distributions.push({
          owner: nodeData.owner,
          nodePda: nodeData.address,
          stakedAmount: nodeData.stakedAmount,
          stakeDays: Math.floor(stakeDays),
          reputationScore: nodeData.reputationScore,
          totalRelays: nodeData.totalRelays,
          successfulRelays: nodeData.successfulRelays,
          pendingRewards: nodeData.pendingRewards,
          totalClaimed: nodeData.totalClaimed,
          weight,
          share: 0 // Calculate in second pass
        });
      } catch (err) {
        console.error('Error decoding node account:', pubkey.toBase58(), err);
      }
    }
    
    // 4. Second pass: calculate actual shares from fee pool
    const distributionAmount = poolData.feePool * 0.9; // 90% of fee pool
    for (const dist of distributions) {
      dist.share = totalWeight > 0 ? (dist.weight / totalWeight) * distributionAmount : 0;
      dist.sharePercentage = totalWeight > 0 ? (dist.weight / totalWeight) * 100 : 0;
    }
    
    // Sort by share descending
    distributions.sort((a, b) => b.share - a.share);
    
    console.log(`✅ Distribution calculated: ${distributionAmount.toLocaleString()} $WHISTLE to distribute`);
    
    // 5. Return distribution data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        epoch: Math.floor(Date.now() / 86400000), // Daily epoch
        poolData: {
          totalStaked: poolData.totalStaked,
          totalNodes: poolData.totalNodes,
          feePool: poolData.feePool,
          distributionAmount
        },
        distributions,
        summary: {
          totalStakers: distributions.length,
          totalDistributing: distributionAmount,
          averageShare: distributionAmount / distributions.length,
          topShare: distributions[0]?.share || 0,
          totalWeight
        }
      })
    };
  } catch (e) {
    console.error('❌ Error calculating distribution:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'calculation_failed', 
        detail: String(e),
        message: e.message 
      })
    };
  }
};

