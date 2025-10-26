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
    
    // Get WHISTLE token decimals first
    const whistleMint = new PublicKey(WHISTLE_MINT);
    const mintInfo = await connection.getParsedAccountInfo(whistleMint);
    const decimals = mintInfo.value?.data?.parsed?.info?.decimals || 9;
    const divisor = Math.pow(10, decimals);
    console.log(`🪙 $WHISTLE token decimals: ${decimals}`);
    
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
      totalStaked: Number(new DataView(poolDataBuffer.buffer).getBigUint64(72, true)) / divisor,
      totalNodes: Number(new DataView(poolDataBuffer.buffer).getBigUint64(80, true)),
      totalReputation: Number(new DataView(poolDataBuffer.buffer).getBigUint64(88, true)),
      feePool: Number(new DataView(poolDataBuffer.buffer).getBigUint64(96, true)) / divisor,
      baseReward: Number(new DataView(poolDataBuffer.buffer).getBigUint64(104, true)) / divisor,
      bonusPerPoint: Number(new DataView(poolDataBuffer.buffer).getBigUint64(112, true)) / divisor,
      totalRelayRequests: Number(new DataView(poolDataBuffer.buffer).getBigUint64(120, true))
    };
    
    console.log(`📊 Pool: ${poolData.totalStaked.toLocaleString()} staked, ${poolData.feePool.toLocaleString()} in contract fee pool`);
    
    // 1.5. Fetch ACTUAL fee balance from fee collector wallet
    const feeCollectorWallet = new PublicKey(FEE_COLLECTOR);
    const whistleMint = new PublicKey(WHISTLE_MINT);
    const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const ASSOCIATED_TOKEN_PROGRAM = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
    
    let actualFeePool = 0;
    try {
      // Get fee collector's WHISTLE token account
      const [feeCollectorAta] = await PublicKey.findProgramAddress(
        [
          feeCollectorWallet.toBuffer(),
          TOKEN_PROGRAM.toBuffer(),
          whistleMint.toBuffer()
        ],
        ASSOCIATED_TOKEN_PROGRAM
      );
      
      const feeTokenAccount = await connection.getTokenAccountBalance(feeCollectorAta);
      actualFeePool = Number(feeTokenAccount.value.amount) / divisor;
      console.log(`💰 Actual fee collector balance: ${actualFeePool.toLocaleString()} $WHISTLE`);
    } catch (e) {
      console.warn('Could not fetch fee collector balance:', e.message);
    }
    
    // 2. Fetch all node accounts (filter by size = 128 bytes)
    // NodeAccount: 128 bytes (8-byte aligned structure)
    const accounts = await connection.getProgramAccounts(programId, {
      filters: [
        {
          dataSize: 128 // NodeAccount actual size
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
          stakedAmount: Number(new DataView(buffer.buffer).getBigUint64(40, true)) / divisor,
          reputationScore: Number(new DataView(buffer.buffer).getBigUint64(48, true)),
          totalRelays: Number(new DataView(buffer.buffer).getBigUint64(56, true)),
          successfulRelays: Number(new DataView(buffer.buffer).getBigUint64(64, true)),
          failedRelays: Number(new DataView(buffer.buffer).getBigUint64(72, true)),
          totalEarned: Number(new DataView(buffer.buffer).getBigUint64(80, true)) / divisor,
          pendingRewards: Number(new DataView(buffer.buffer).getBigUint64(88, true)) / divisor,
          totalClaimed: Number(new DataView(buffer.buffer).getBigUint64(96, true)) / divisor,
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
    const distributionAmount = actualFeePool * 0.9; // 90% of actual fee pool
    for (const dist of distributions) {
      dist.share = totalWeight > 0 ? (dist.weight / totalWeight) * distributionAmount : 0;
      dist.sharePercentage = totalWeight > 0 ? (dist.weight / totalWeight) * 100 : 0;
    }
    
    // Sort by share descending
    distributions.sort((a, b) => b.share - a.share);
    
    console.log(`✅ Distribution calculated: ${distributionAmount.toLocaleString()} $WHISTLE to distribute from ${actualFeePool.toLocaleString()} fee pool`);
    
    // 5. Return distribution data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        epoch: Math.floor(Date.now() / 86400000), // Daily epoch
        feeCollectorWallet: FEE_COLLECTOR,
        poolData: {
          totalStaked: poolData.totalStaked,
          totalNodes: poolData.totalNodes,
          contractFeePool: poolData.feePool,
          actualFeePool: actualFeePool,
          distributionAmount
        },
        distributions,
        summary: {
          totalStakers: distributions.length,
          totalDistributing: distributionAmount,
          averageShare: distributions.length > 0 ? distributionAmount / distributions.length : 0,
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

