'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Trophy, 
  ExternalLink, 
  RefreshCw, 
  Server, 
  Zap, 
  Clock,
  Heart,
  Award,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff
} from 'lucide-react'
import {
  fetchAllProviders,
  WHISTLE_PROGRAM_ID,
  connection,
} from '../lib/whistle-contract'

export function OnChainLeaderboard() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [sortBy, setSortBy] = useState('queriesServed')

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Try direct on-chain fetch first (more reliable when coordinator isn't running)
      try {
        const directProviders = await fetchProvidersDirectly()
        if (directProviders.length > 0) {
          setProviders(directProviders)
          return
        }
      } catch (e) {
        console.log('Direct fetch failed, trying coordinator:', e.message)
      }
      
      // Fallback to coordinator API
      const coordinatorUrl = process.env.NEXT_PUBLIC_COORDINATOR_HTTP || 'http://localhost:3003'
      const response = await fetch(`${coordinatorUrl}/api/leaderboard/onchain`)
      
      if (!response.ok) {
        throw new Error('No providers found on-chain yet')
      }
      
      const data = await response.json()
      setProviders(data.providers || [])
      
    } catch (err) {
      console.log('Provider fetch info:', err.message)
      // Not an error - just no providers registered yet
      setProviders([])
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Direct on-chain fetch (fallback)
  async function fetchProvidersDirectly() {
    const accounts = await connection.getProgramAccounts(WHISTLE_PROGRAM_ID, {
      filters: [
        { dataSize: 256 }
      ]
    })
    
    const providers = []
    
    for (const { pubkey, account } of accounts) {
      try {
        const data = account.data
        const provider = new (await import('@solana/web3.js')).PublicKey(data.slice(0, 32))
        
        const endpointLen = data.readUInt32LE(32)
        const endpoint = new TextDecoder().decode(data.slice(36, 36 + endpointLen))
        
        let offset = 36 + endpointLen
        
        const registeredAt = Number(data.readBigInt64LE(offset))
        const isActive = data.readUInt8(offset + 8) === 1
        const stakeBond = Number(data.readBigUInt64LE(offset + 9))
        const totalEarned = Number(data.readBigUInt64LE(offset + 17))
        const queriesServed = Number(data.readBigUInt64LE(offset + 33))
        const reputationScore = Number(data.readBigUInt64LE(offset + 41))
        const lastHeartbeat = Number(data.readBigInt64LE(offset + 73))
        
        const now = Math.floor(Date.now() / 1000)
        const isOnline = (now - lastHeartbeat) < 300
        
        providers.push({
          address: provider.toBase58(),
          endpoint,
          isActive,
          isOnline,
          stakeBond: stakeBond / 1e6,
          totalEarned: totalEarned / 1e9,
          queriesServed,
          reputationScore,
          lastHeartbeat,
          lastHeartbeatAgo: now - lastHeartbeat
        })
      } catch (e) {
        // Skip malformed
      }
    }
    
    return providers.sort((a, b) => b.queriesServed - a.queriesServed)
  }

  useEffect(() => {
    fetchProviders()
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchProviders, 60000)
    return () => clearInterval(interval)
  }, [fetchProviders])

  const sortedProviders = [...providers].sort((a, b) => {
    switch (sortBy) {
      case 'queriesServed':
        return b.queriesServed - a.queriesServed
      case 'totalEarned':
        return b.totalEarned - a.totalEarned
      case 'stakeBond':
        return b.stakeBond - a.stakeBond
      case 'reputationScore':
        return b.reputationScore - a.reputationScore
      default:
        return b.queriesServed - a.queriesServed
    }
  })

  const formatNumber = (num) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
    return num.toLocaleString()
  }

  const formatTimeAgo = (seconds) => {
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const getRankBadge = (index) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `#${index + 1}`
  }

  const activeProviders = providers.filter(p => p.isActive)
  const onlineProviders = providers.filter(p => p.isOnline)
  const totalQueries = providers.reduce((sum, p) => sum + p.queriesServed, 0)
  const totalEarned = providers.reduce((sum, p) => sum + p.totalEarned, 0)

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-whistle-accent/20 rounded-lg">
            <Trophy size={24} className="text-whistle-accent" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">On-Chain Provider Leaderboard</h3>
            <p className="text-gray-400 text-sm">
              Live from WHTT contract • {providers.length} providers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchProviders}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <Server size={16} className="text-gray-500 mx-auto mb-1" />
          <p className="text-lg font-mono text-white">{providers.length}</p>
          <p className="text-gray-400 text-xs">Total</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <Wifi size={16} className="text-whistle-green mx-auto mb-1" />
          <p className="text-lg font-mono text-whistle-green">{onlineProviders.length}</p>
          <p className="text-gray-400 text-xs">Online</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <Zap size={16} className="text-gray-500 mx-auto mb-1" />
          <p className="text-lg font-mono text-white">{formatNumber(totalQueries)}</p>
          <p className="text-gray-400 text-xs">Queries</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <Award size={16} className="text-gray-500 mx-auto mb-1" />
          <p className="text-lg font-mono text-white">{totalEarned.toFixed(4)}</p>
          <p className="text-gray-400 text-xs">SOL Earned</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 mb-4 bg-whistle-red/10 border border-whistle-red/30 rounded-lg text-whistle-red text-sm">
          {error}
        </div>
      )}

      {/* Sort Options */}
      {expanded && (
        <div className="flex gap-2 mb-4">
          <span className="text-gray-400 text-sm">Sort by:</span>
          {[
            { key: 'queriesServed', label: 'Queries' },
            { key: 'totalEarned', label: 'Earned' },
            { key: 'stakeBond', label: 'Stake' },
            { key: 'reputationScore', label: 'Reputation' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-2 py-1 rounded text-xs ${
                sortBy === key
                  ? 'bg-whistle-accent text-black'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Provider List */}
      {loading && providers.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {(expanded ? sortedProviders : sortedProviders.slice(0, 5)).map((provider, index) => (
            <div
              key={provider.address}
              className={`flex items-center justify-between p-3 rounded-lg ${
                index < 3 ? 'bg-gradient-to-r from-gray-800/80 to-gray-800/40' : 'bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg w-8">{getRankBadge(index)}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://solscan.io/account/${provider.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm text-white hover:text-whistle-accent"
                    >
                      {provider.address.slice(0, 8)}...{provider.address.slice(-4)}
                    </a>
                    {provider.isOnline ? (
                      <Wifi size={12} className="text-whistle-green" />
                    ) : (
                      <WifiOff size={12} className="text-gray-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{formatNumber(provider.queriesServed)} queries</span>
                    <span>{provider.stakeBond.toFixed(0)} WHISTLE</span>
                    {provider.lastHeartbeatAgo && (
                      <span className="flex items-center gap-1">
                        <Heart size={10} />
                        {formatTimeAgo(provider.lastHeartbeatAgo)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm font-mono text-whistle-green">
                  {provider.totalEarned.toFixed(6)} SOL
                </p>
                <p className="text-xs text-gray-400">
                  Rep: {provider.reputationScore}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show More */}
      {!expanded && providers.length > 5 && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full mt-3 py-2 text-gray-400 hover:text-white text-sm transition-colors"
        >
          Show all {providers.length} providers
        </button>
      )}

      {/* Contract Link */}
      <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
        <span>Data from WHTT contract</span>
        <a
          href={`https://solscan.io/account/${WHISTLE_PROGRAM_ID.toBase58()}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-whistle-accent hover:underline"
        >
          View contract <ExternalLink size={10} />
        </a>
      </div>
    </div>
  )
}

