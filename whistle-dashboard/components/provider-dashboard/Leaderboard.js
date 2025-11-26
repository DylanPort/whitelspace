'use client'

import { useState, useEffect } from 'react'
import { Trophy, Medal, Award } from 'lucide-react'
import { coordinator } from '@/lib/provider-dashboard/coordinator'

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await coordinator.getLeaderboard()
        setLeaderboard(data.leaderboard || [])
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 60000)
    return () => clearInterval(interval)
  }, [])

  const truncateWallet = (wallet) => {
    if (!wallet) return '—'
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`
  }

  const getRankIcon = (rank) => {
    if (rank === 0) return <Trophy size={16} className="text-yellow-400" />
    if (rank === 1) return <Medal size={16} className="text-gray-300" />
    if (rank === 2) return <Award size={16} className="text-amber-600" />
    return <span className="text-gray-500 text-sm w-4 text-center">{rank + 1}</span>
  }

  if (loading) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Leaderboard</h3>
        <div className="h-48 bg-gray-800/50 rounded animate-pulse" />
      </div>
    )
  }

  if (error || leaderboard.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Trophy size={20} className="text-yellow-400" />
          Leaderboard
        </h3>
        <div className="text-center py-8 text-gray-500">
          <Trophy size={32} className="mx-auto mb-2 opacity-50" />
          <p>No providers yet</p>
          <p className="text-xs mt-1">Be the first to run a cache node!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Trophy size={20} className="text-yellow-400" />
        Top Providers
      </h3>

      <div className="space-y-2">
        {leaderboard.slice(0, 10).map((entry, index) => (
          <div 
            key={entry.wallet}
            className={`flex items-center justify-between p-2 rounded-lg ${
              index < 3 ? 'bg-gray-800/50' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-6 flex justify-center">
                {getRankIcon(index)}
              </div>
              <div>
                <p className="font-mono text-sm text-whistle-accent">
                  {truncateWallet(entry.wallet)}
                </p>
                <p className="text-xs text-gray-500">
                  {entry.node_count} node{entry.node_count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-whistle-accent2">
                {entry.total_rewards?.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">tokens</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

