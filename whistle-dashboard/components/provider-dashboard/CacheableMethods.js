'use client'

import { useState } from 'react'
import { 
  Database, 
  Clock, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp,
  Zap,
  RefreshCw,
  Info
} from 'lucide-react'
import { CACHE_TTL, NO_CACHE_METHODS } from '@/lib/provider-dashboard/browser-cache'

// Categorize methods
const METHOD_CATEGORIES = {
  'Real-time Data': {
    description: 'Fast-changing blockchain state',
    methods: ['getSlot', 'getBlockHeight', 'getLatestBlockhash', 'getHealth']
  },
  'Epoch & Performance': {
    description: 'Epoch info and network performance',
    methods: ['getEpochInfo', 'getEpochSchedule', 'getRecentPerformanceSamples']
  },
  'Account Data': {
    description: 'Account balances and token info',
    methods: ['getAccountInfo', 'getBalance', 'getTokenAccountBalance']
  },
  'Historical Data': {
    description: 'Transactions and blocks (long TTL)',
    methods: ['getTransaction', 'getBlock']
  },
  'Network Info': {
    description: 'Cluster and validator information',
    methods: ['getVersion', 'getGenesisHash', 'getClusterNodes', 'getVoteAccounts']
  },
  'Never Cached': {
    description: 'Write operations (always fresh)',
    methods: NO_CACHE_METHODS
  }
}

export function CacheableMethods() {
  const [expanded, setExpanded] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)

  const formatTTL = (ttl) => {
    if (!ttl) return 'N/A'
    if (ttl >= 86400000) return `${(ttl / 86400000).toFixed(0)}d`
    if (ttl >= 3600000) return `${(ttl / 3600000).toFixed(0)}h`
    if (ttl >= 60000) return `${(ttl / 60000).toFixed(0)}m`
    if (ttl >= 1000) return `${(ttl / 1000).toFixed(1)}s`
    return `${ttl}ms`
  }

  const getTTLColor = (ttl) => {
    if (!ttl) return 'text-whistle-red'
    if (ttl >= 60000) return 'text-whistle-green'
    if (ttl >= 5000) return 'text-whistle-accent'
    return 'text-yellow-400'
  }

  const getMethodInfo = (method) => {
    const ttl = CACHE_TTL[method]
    const isCacheable = !NO_CACHE_METHODS.includes(method)
    return { ttl, isCacheable }
  }

  // Calculate stats
  const totalMethods = Object.values(METHOD_CATEGORIES).reduce((sum, cat) => sum + cat.methods.length, 0)
  const cacheableMethods = totalMethods - NO_CACHE_METHODS.length

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-whistle-accent/20 rounded-lg">
            <Database size={24} className="text-whistle-accent" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Cacheable RPC Methods</h3>
            <p className="text-gray-400 text-sm">{cacheableMethods} methods cached • {NO_CACHE_METHODS.length} always fresh</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <Zap size={16} className="mx-auto mb-1 text-yellow-400" />
          <p className="text-lg font-mono text-white">{Object.keys(CACHE_TTL).length - 1}</p>
          <p className="text-xs text-gray-500">Cached Types</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <Clock size={16} className="mx-auto mb-1 text-whistle-green" />
          <p className="text-lg font-mono text-white">400ms</p>
          <p className="text-xs text-gray-500">Min TTL</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <RefreshCw size={16} className="mx-auto mb-1 text-whistle-accent" />
          <p className="text-lg font-mono text-white">24h</p>
          <p className="text-xs text-gray-500">Max TTL</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 bg-whistle-accent/10 border border-whistle-accent/30 rounded-lg mb-4">
        <Info size={16} className="text-whistle-accent mt-0.5" />
        <p className="text-xs text-gray-400">
          Cache nodes store RPC responses locally. Shorter TTLs for real-time data, longer for historical.
          Earn rewards based on cache hits and bandwidth saved.
        </p>
      </div>

      {/* Expanded view - Categories */}
      {expanded && (
        <div className="space-y-3">
          {Object.entries(METHOD_CATEGORIES).map(([category, { description, methods }]) => {
            const isNeverCached = category === 'Never Cached'
            const isSelected = selectedCategory === category
            
            return (
              <div 
                key={category}
                className={`border rounded-lg overflow-hidden transition-colors ${
                  isNeverCached 
                    ? 'border-whistle-red/30 bg-whistle-red/5' 
                    : 'border-gray-800 bg-gray-900/50'
                }`}
              >
                <button
                  onClick={() => setSelectedCategory(isSelected ? null : category)}
                  className="w-full p-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isNeverCached ? (
                      <X size={16} className="text-whistle-red" />
                    ) : (
                      <Check size={16} className="text-whistle-green" />
                    )}
                    <div className="text-left">
                      <p className="font-medium text-sm">{category}</p>
                      <p className="text-xs text-gray-500">{description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{methods.length} methods</span>
                    {isSelected ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>
                
                {isSelected && (
                  <div className="border-t border-gray-800 p-3 space-y-2">
                    {methods.map(method => {
                      const { ttl, isCacheable } = getMethodInfo(method)
                      return (
                        <div 
                          key={method}
                          className="flex items-center justify-between p-2 bg-gray-800/30 rounded"
                        >
                          <code className="text-sm font-mono text-whistle-accent">{method}</code>
                          <span className={`text-sm font-mono ${getTTLColor(ttl)}`}>
                            {isCacheable ? formatTTL(ttl) : '⚡ Fresh'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Collapsed preview */}
      {!expanded && (
        <div className="flex flex-wrap gap-2">
          {['getSlot', 'getBalance', 'getTransaction', 'getEpochInfo'].map(method => {
            const { ttl } = getMethodInfo(method)
            return (
              <div 
                key={method}
                className="flex items-center gap-2 px-2 py-1 bg-gray-800/50 rounded text-xs"
              >
                <code className="font-mono text-whistle-accent">{method}</code>
                <span className={`font-mono ${getTTLColor(ttl)}`}>{formatTTL(ttl)}</span>
              </div>
            )
          })}
          <span className="text-xs text-gray-500 self-center">+{cacheableMethods - 4} more</span>
        </div>
      )}
    </div>
  )
}

