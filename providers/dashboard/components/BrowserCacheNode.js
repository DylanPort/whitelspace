'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useWalletSafe } from '../lib/useWalletSafe'
import { 
  Play, 
  Square, 
  Zap, 
  Server, 
  TrendingUp, 
  Clock, 
  HardDrive,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Info,
  Database,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react'
import { BrowserCacheNode as CacheNodeClient } from '../lib/browser-cache'

export function BrowserCacheNode() {
  const { publicKey, connected: walletConnected } = useWalletSafe()
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState({ connected: false, registered: false })
  const [metrics, setMetrics] = useState(null)
  const [cacheEntries, setCacheEntries] = useState([])
  const [showCacheDetails, setShowCacheDetails] = useState(false)
  const [error, setError] = useState(null)
  
  const cacheNodeRef = useRef(null)
  const walletAddress = publicKey?.toBase58()

  // Initialize cache node
  const startCaching = useCallback(async () => {
    if (!walletAddress) {
      setError('Please connect your wallet first')
      return
    }

    try {
      setError(null)
      
      // Create cache node instance
      const node = new CacheNodeClient({
        coordinatorUrl: process.env.NEXT_PUBLIC_COORDINATOR_WS || 'ws://localhost:3003/ws',
        upstreamRpc: 'https://rpc.whistle.ninja/rpc',
        wallet: walletAddress,
        name: `Browser-${walletAddress.slice(0, 8)}`,
        onStatusChange: (newStatus) => {
          setStatus(newStatus)
        },
        onMetricsUpdate: (newMetrics) => {
          setMetrics(newMetrics)
        },
        onCacheUpdate: (entries) => {
          setCacheEntries(entries)
        },
        onError: (err) => {
          setError(err.message || 'Connection error')
        }
      })

      cacheNodeRef.current = node
      
      // Connect to coordinator
      await node.connect()
      
      // Register with wallet
      node.register(walletAddress, `Browser-${walletAddress.slice(0, 8)}`)
      
      setRunning(true)
      
      // Start making periodic cache requests to build stats
      startCacheActivity(node)
      
    } catch (err) {
      setError(err.message || 'Failed to start cache node')
      setRunning(false)
    }
  }, [walletAddress])

  // Stop cache node
  const stopCaching = useCallback(() => {
    if (cacheNodeRef.current) {
      cacheNodeRef.current.disconnect()
      cacheNodeRef.current = null
    }
    setRunning(false)
    setStatus({ connected: false, registered: false })
  }, [])

  // Make periodic RPC requests to simulate caching activity
  const startCacheActivity = (node) => {
    // Make various RPC calls to build cache
    const methods = [
      'getSlot',
      'getBlockHeight',
      'getEpochInfo',
      'getVersion',
      'getHealth'
    ]

    const makeRequests = async () => {
      if (!node || !node.connected) return
      
      for (const method of methods) {
        try {
          await node.rpcRequest(method)
        } catch (e) {
          // Ignore errors, just building cache
        }
      }
    }

    // Initial requests
    makeRequests()

    // Repeat every 5 seconds
    const interval = setInterval(() => {
      if (node && node.connected) {
        makeRequests()
      } else {
        clearInterval(interval)
      }
    }, 5000)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cacheNodeRef.current) {
        cacheNodeRef.current.disconnect()
      }
    }
  }, [])

  // Format bytes
  const formatBytes = (bytes) => {
    if (!bytes) return '0 B'
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
    if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB'
    return bytes + ' B'
  }

  // Format uptime
  const formatUptime = (seconds) => {
    if (!seconds) return '0s'
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${mins}m`
  }

  // Not connected to wallet
  if (!walletConnected) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gray-800 rounded-lg">
            <Server size={24} className="text-gray-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Browser Cache Node</h3>
            <p className="text-gray-400 text-sm">Tier 2 • 1.0x rewards</p>
          </div>
        </div>
        <p className="text-gray-500 text-center py-4">
          Connect your wallet to start caching
        </p>
      </div>
    )
  }

  // Integration status banner
  const IntegrationBanner = () => (
    <div className="flex items-start gap-3 p-3 mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
      <AlertCircle size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
      <div className="text-xs">
        <p className="text-yellow-400 font-bold uppercase tracking-wider mb-1">Payment Integration In Progress</p>
        <p className="text-gray-400">
          Browser node rewards are being integrated into the smart contract. 
          Currently tracks stats only. Server providers earn real SOL rewards now.
        </p>
      </div>
    </div>
  )

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${running ? 'bg-whistle-green/20' : 'bg-gray-800'}`}>
            <Server size={24} className={running ? 'text-whistle-green' : 'text-gray-500'} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Browser Cache Node</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">Tier 2</span>
              <span className="text-yellow-400">• Coming Soon</span>
            </div>
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {status.connected ? (
            <Wifi size={16} className="text-whistle-green" />
          ) : (
            <WifiOff size={16} className="text-gray-500" />
          )}
          <span className={`text-sm ${status.connected ? 'text-whistle-green' : 'text-gray-500'}`}>
            {status.registered ? 'Active' : status.connected ? 'Connecting...' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Integration status */}
      <IntegrationBanner />

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-whistle-red/10 border border-whistle-red/30 rounded-lg text-whistle-red text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Info banner when not running */}
      {!running && (
        <div className="flex items-start gap-3 p-4 mb-4 bg-whistle-accent/10 border border-whistle-accent/30 rounded-lg">
          <Info size={20} className="text-whistle-accent mt-0.5" />
          <div className="text-sm">
            <p className="text-whistle-accent font-medium mb-1">How it works</p>
            <p className="text-gray-400">
              Your browser becomes a cache node. Keep this tab open to cache RPC responses.
              Stats are tracked now - rewards will be enabled after contract upgrade.
            </p>
          </div>
        </div>
      )}

      {/* Metrics (when running) */}
      {running && metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-gray-400 text-xs mb-1">
              <TrendingUp size={12} />
              Requests
            </div>
            <p className="text-lg font-mono text-white">{metrics.requests}</p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-gray-400 text-xs mb-1">
              <Zap size={12} />
              Hit Rate
            </div>
            <p className="text-lg font-mono text-whistle-green">{metrics.hitRate}%</p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-gray-400 text-xs mb-1">
              <HardDrive size={12} />
              Saved
            </div>
            <p className="text-lg font-mono text-white">{formatBytes(metrics.bytesSaved)}</p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-gray-400 text-xs mb-1">
              <Clock size={12} />
              Uptime
            </div>
            <p className="text-lg font-mono text-white">{formatUptime(metrics.uptime)}</p>
          </div>
        </div>
      )}

      {/* Detailed stats when running */}
      {running && metrics && (
        <div className="flex items-center justify-between text-sm text-gray-400 mb-4 px-1">
          <span>Cache entries: {metrics.cacheSize}</span>
          <span>Hits: {metrics.hits} / Misses: {metrics.misses}</span>
        </div>
      )}

      {/* Cache entries display */}
      {running && cacheEntries.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowCacheDetails(!showCacheDetails)}
            className="flex items-center justify-between w-full p-3 bg-gray-800/50 rounded-lg text-sm hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Database size={14} className="text-whistle-accent" />
              <span className="text-gray-300">Cached Data ({cacheEntries.length} entries)</span>
            </div>
            {showCacheDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {showCacheDetails && (
            <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
              {cacheEntries.map((entry, idx) => (
                <CacheEntryCard key={entry.key} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Start/Stop button */}
      <button
        onClick={running ? stopCaching : startCaching}
        className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
          running
            ? 'bg-whistle-red/20 text-whistle-red border border-whistle-red/50 hover:bg-whistle-red/30'
            : 'bg-gradient-to-r from-whistle-accent to-whistle-accent2 text-black hover:opacity-90'
        }`}
      >
        {running ? (
          <>
            <Square size={18} />
            Stop Caching
          </>
        ) : (
          <>
            <Play size={18} />
            Start Caching
          </>
        )}
      </button>

      {/* Info when running */}
      {running && (
        <p className="text-center text-gray-500 text-xs mt-3">
          📊 Stats are being tracked • Rewards coming after contract upgrade
        </p>
      )}
    </div>
  )
}

// Cache entry card component
function CacheEntryCard({ entry }) {
  const formatTime = (ms) => {
    if (ms >= 60000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
    return `${ms}ms`
  }

  const formatBytes = (bytes) => {
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${bytes} B`
  }

  const getMethodColor = (method) => {
    if (method.includes('get')) return 'text-whistle-accent'
    if (method.includes('send')) return 'text-whistle-red'
    return 'text-gray-400'
  }

  return (
    <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <code className={`text-sm font-mono ${getMethodColor(entry.method)}`}>
          {entry.method}
        </code>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">{formatBytes(entry.size)}</span>
          <span className={`px-1.5 py-0.5 rounded ${
            entry.timeRemaining > 5000 
              ? 'bg-whistle-green/20 text-whistle-green' 
              : entry.timeRemaining > 0 
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-gray-700 text-gray-500'
          }`}>
            {entry.timeRemaining > 0 ? formatTime(entry.timeRemaining) : 'expired'}
          </span>
        </div>
      </div>
      <div className="text-xs text-gray-500 font-mono truncate bg-gray-800/50 p-2 rounded">
        {entry.preview}
      </div>
    </div>
  )
}

