import { Connection, PublicKey } from '@solana/web3.js'
import { NextResponse } from 'next/server'

const WHISTLE_PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr')

// RPC endpoints to try
const RPC_URLS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-mainnet.g.alchemy.com/v2/demo',
]

// Parse provider account data based on ProviderAccount struct:
// provider: Pubkey, endpoint: String, registered_at: i64, is_active: bool,
// stake_bond: u64, total_earned: u64, pending_earnings: u64, queries_served: u64,
// reputation_score: u64, uptime_percentage: u64, response_time_avg: u64,
// accuracy_score: u64, last_heartbeat: i64, slashed_amount: u64
function parseProviderAccount(data) {
  try {
    // Native Solana program - NO discriminator
    let offset = 0
    
    // provider: Pubkey (32 bytes)
    const provider = new PublicKey(data.slice(offset, offset + 32))
    offset += 32
    
    // endpoint: String (4 bytes length + data)
    const endpointLen = data.readUInt32LE(offset)
    offset += 4
    
    // Check if endpoint length is reasonable
    if (endpointLen > 256 || endpointLen === 0) {
      return null
    }
    
    const endpoint = data.slice(offset, offset + endpointLen).toString('utf8')
    offset += endpointLen
    
    // registered_at: i64 (8 bytes)
    const registeredAt = Number(data.readBigInt64LE(offset))
    offset += 8
    
    // is_active: bool (1 byte)
    const isActive = data.readUInt8(offset) === 1
    offset += 1
    
    // stake_bond: u64 (8 bytes)
    const stakeBond = Number(data.readBigUInt64LE(offset))
    offset += 8
    
    // total_earned: u64 (8 bytes)
    const totalEarned = Number(data.readBigUInt64LE(offset))
    offset += 8
    
    // pending_earnings: u64 (8 bytes)
    const pendingEarnings = Number(data.readBigUInt64LE(offset))
    offset += 8
    
    // queries_served: u64 (8 bytes)
    const queriesServed = Number(data.readBigUInt64LE(offset))
    offset += 8
    
    // reputation_score: u64 (8 bytes)
    const reputationScore = Number(data.readBigUInt64LE(offset))
    offset += 8
    
    // uptime_percentage: u64 (8 bytes)
    const uptimePercentage = Number(data.readBigUInt64LE(offset))
    offset += 8
    
    // response_time_avg: u64 (8 bytes)
    const responseTimeAvg = Number(data.readBigUInt64LE(offset))
    offset += 8
    
    // accuracy_score: u64 (8 bytes)
    const accuracyScore = Number(data.readBigUInt64LE(offset))
    offset += 8
    
    // last_heartbeat: i64 (8 bytes)
    const lastHeartbeat = Number(data.readBigInt64LE(offset))
    offset += 8
    
    // slashed_amount: u64 (8 bytes)
    const slashedAmount = Number(data.readBigUInt64LE(offset))
    
    return {
      provider: provider.toBase58(),
      endpoint,
      registeredAt,
      isActive,
      stakeBond,
      totalEarned,
      pendingEarnings,
      queriesServed,
      reputationScore,
      uptimePercentage,
      responseTimeAvg,
      accuracyScore,
      lastHeartbeat,
      slashedAmount
    }
  } catch (e) {
    console.log('Parse error:', e.message)
    return null
  }
}

// Geolocation from endpoint URL
function getLocationFromEndpoint(endpoint) {
  const regionPatterns = [
    { pattern: /us-east|virginia|nyc|new-york/i, coords: [-74.006, 40.7128], name: 'US East', country: 'USA' },
    { pattern: /us-west|california|sfo|lax|los-angeles/i, coords: [-118.2437, 34.0522], name: 'US West', country: 'USA' },
    { pattern: /eu-west|london|uk\./i, coords: [-0.1276, 51.5074], name: 'London', country: 'UK' },
    { pattern: /eu-central|frankfurt|germany|de\./i, coords: [8.6821, 50.1109], name: 'Frankfurt', country: 'Germany' },
    { pattern: /ap-southeast|singapore|sg\./i, coords: [103.8198, 1.3521], name: 'Singapore', country: 'Singapore' },
    { pattern: /ap-northeast|tokyo|japan|jp\./i, coords: [139.6917, 35.6895], name: 'Tokyo', country: 'Japan' },
    { pattern: /sydney|australia|au\./i, coords: [151.2093, -33.8688], name: 'Sydney', country: 'Australia' },
    { pattern: /render\.com/i, coords: [-122.4194, 37.7749], name: 'San Francisco', country: 'USA' },
    { pattern: /vercel|netlify/i, coords: [-122.4194, 37.7749], name: 'San Francisco', country: 'USA' },
    { pattern: /whistle\.ninja/i, coords: [-74.006, 40.7128], name: 'WHISTLE HQ', country: 'USA' },
    { pattern: /rpc\.w\.ninja/i, coords: [-74.006, 40.7128], name: 'WHISTLE RPC', country: 'USA' },
  ]
  
  for (const region of regionPatterns) {
    if (region.pattern.test(endpoint)) {
      return { coords: region.coords, name: region.name, country: region.country }
    }
  }
  
  // Hash-based positioning for unknown endpoints
  const hash = endpoint.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const lat = ((hash % 120) - 60) * 0.8
  const lng = ((hash * 7) % 360) - 180
  
  return { coords: [lng, lat], name: 'Provider', country: 'Unknown' }
}

export async function GET() {
  let accounts = []
  let lastError = null
  
  // Try each RPC
  for (const rpcUrl of RPC_URLS) {
    try {
      console.log(`[API] Trying RPC: ${rpcUrl}`)
      const connection = new Connection(rpcUrl, 'confirmed')
      
      accounts = await connection.getProgramAccounts(WHISTLE_PROGRAM_ID)
      console.log(`[API] Found ${accounts.length} accounts via ${rpcUrl}`)
      break
    } catch (err) {
      console.warn(`[API] RPC ${rpcUrl} failed:`, err.message)
      lastError = err
    }
  }
  
  if (accounts.length === 0) {
    return NextResponse.json({
      success: false,
      error: lastError?.message || 'Failed to fetch providers',
      providers: []
    })
  }
  
  // Parse provider accounts
  const providers = []
  const now = Math.floor(Date.now() / 1000)
  let parseAttempts = 0
  let successfulParses = 0
  
  for (const { pubkey, account } of accounts) {
    parseAttempts++
    const data = Buffer.from(account.data)
    
    // Log first few bytes for debugging
    if (parseAttempts <= 3) {
      console.log(`[API] Account ${pubkey.toBase58().slice(0,8)}... size=${data.length}, first8bytes=${data.slice(0,8).toString('hex')}`)
    }
    
    const provider = parseProviderAccount(data)
    
    if (provider) {
      successfulParses++
      console.log(`[API] Parsed provider: ${provider.endpoint}, bond=${provider.stakeBond}`)
    }
    
    if (provider && provider.endpoint && provider.stakeBond > 0) {
      const location = getLocationFromEndpoint(provider.endpoint)
      const heartbeatAge = now - provider.lastHeartbeat
      const isRecentlyActive = heartbeatAge < 3600 // Active if heartbeat within 1 hour
      
      providers.push({
        id: pubkey.toBase58(),
        wallet: provider.provider,
        endpoint: provider.endpoint,
        name: location.name,
        coords: location.coords,
        country: location.country,
        status: provider.isActive && isRecentlyActive ? 'active' : 'inactive',
        bondAmount: provider.stakeBond / 1e9,
        queriesServed: provider.queriesServed,
        totalEarnings: provider.totalEarned / 1e9,
        pendingEarnings: provider.pendingEarnings / 1e9,
        reputation: provider.reputationScore,
        uptime: provider.uptimePercentage / 100, // Convert from basis points
        responseTime: provider.responseTimeAvg,
        lastHeartbeat: provider.lastHeartbeat,
        heartbeatAge,
        registeredAt: provider.registeredAt,
      })
    }
  }
  
  console.log(`[API] Parsed ${providers.length} valid providers`)
  
  return NextResponse.json({
    success: true,
    providers,
    total: providers.length,
    timestamp: Date.now()
  })
}

