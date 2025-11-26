'use client'

import { useState, useEffect } from 'react'
import { Server, Zap, HardDrive, TrendingUp, Award, Users } from 'lucide-react'
import { coordinator } from '../lib/coordinator'

export function CacheNetworkStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await coordinator.getStats()
        setStats(data)
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Cache Network</h3>
        <div className="h-32 bg-gray-800/50 rounded animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Cache Network</h3>
        <div className="text-center py-8 text-gray-500">
          <Server size={32} className="mx-auto mb-2 opacity-50" />
          <p>Coordinator offline</p>
          <p className="text-xs mt-1">Start the coordinator to see network stats</p>
        </div>
      </div>
    )
  }

  const network = stats?.network || {}
  const epoch = stats?.currentEpoch || {}
  const lastHour = stats?.lastHour || {}

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B'
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB'
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
    if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB'
    return bytes + ' B'
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Server size={20} className="text-whistle-accent" />
          Cache Network
        </h3>
        <span className="text-xs text-gray-500">
          Epoch {epoch.id || 0}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Active Nodes */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Users size={14} />
            Active Nodes
          </div>
          <p className="text-2xl font-mono text-whistle-accent">
            {network.activeNodes || 0}
            <span className="text-gray-500 text-sm">/{network.totalNodes || 0}</span>
          </p>
        </div>

        {/* Hit Rate */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Zap size={14} />
            Hit Rate
          </div>
          <p className="text-2xl font-mono text-whistle-green">
            {network.hitRate || 0}%
          </p>
        </div>

        {/* Bandwidth Saved */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <HardDrive size={14} />
            Bandwidth Saved
          </div>
          <p className="text-2xl font-mono text-white">
            {formatBytes(network.totalBytesSaved)}
          </p>
        </div>

        {/* Total Requests */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <TrendingUp size={14} />
            Total Requests
          </div>
          <p className="text-2xl font-mono text-white">
            {(network.totalRequests || 0).toLocaleString()}
          </p>
        </div>

        {/* Last Hour */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Zap size={14} />
            Last Hour
          </div>
          <p className="text-2xl font-mono text-white">
            {(lastHour.requests || 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            {lastHour.avgHitRate || 0}% hit rate
          </p>
        </div>

        {/* Reward Pool */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Award size={14} />
            Reward Pool
          </div>
          <p className="text-2xl font-mono text-whistle-accent2">
            {epoch.rewardPool || 0}
          </p>
          <p className="text-xs text-gray-500">tokens/hour</p>
        </div>
      </div>
    </div>
  )
}

