'use client'

import { useState, useEffect } from 'react'
import { useWalletSafe } from '../lib/useWalletSafe'
import { Award, TrendingUp, Clock, Coins } from 'lucide-react'
import { coordinator } from '../lib/coordinator'

export function MyRewards() {
  const { publicKey, connected } = useWalletSafe()
  const [rewards, setRewards] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const walletAddress = publicKey?.toBase58()

  useEffect(() => {
    if (!walletAddress) {
      setRewards(null)
      return
    }

    const fetchRewards = async () => {
      setLoading(true)
      try {
        const data = await coordinator.getRewards(walletAddress)
        setRewards(data)
        setError(null)
      } catch (err) {
        // Coordinator might be offline
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchRewards()
    const interval = setInterval(fetchRewards, 30000)
    return () => clearInterval(interval)
  }, [walletAddress])

  if (!connected) {
    return null
  }

  if (loading && !rewards) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">My Rewards</h3>
        <div className="h-24 bg-gray-800/50 rounded animate-pulse" />
      </div>
    )
  }

  if (error && !rewards) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Award size={20} className="text-whistle-accent2" />
          My Rewards
        </h3>
        <div className="text-center py-4 text-gray-500">
          <p className="text-sm">Connect a cache node to start earning</p>
          <p className="text-xs mt-1">Run: docker-compose up -d</p>
        </div>
      </div>
    )
  }

  const data = rewards || { totalEarned: 0, pendingRewards: 0, totalClaimed: 0, rewards: [] }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Award size={20} className="text-whistle-accent2" />
        My Rewards
      </h3>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Total Earned */}
        <div className="text-center">
          <p className="text-gray-400 text-xs mb-1">Total Earned</p>
          <p className="text-xl font-mono text-whistle-accent2">
            {data.totalEarned?.toFixed(2) || '0.00'}
          </p>
        </div>

        {/* Pending */}
        <div className="text-center">
          <p className="text-gray-400 text-xs mb-1">Pending</p>
          <p className="text-xl font-mono text-whistle-green">
            {data.pendingRewards?.toFixed(2) || '0.00'}
          </p>
        </div>

        {/* Claimed */}
        <div className="text-center">
          <p className="text-gray-400 text-xs mb-1">Claimed</p>
          <p className="text-xl font-mono text-gray-400">
            {data.totalClaimed?.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* Recent rewards */}
      {data.rewards && data.rewards.length > 0 && (
        <div className="border-t border-gray-800 pt-4">
          <p className="text-gray-400 text-xs mb-2">Recent Epochs</p>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {data.rewards.slice(0, 5).map((r, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-500">Epoch {r.epoch}</span>
                <span className="font-mono text-whistle-accent2">
                  +{r.reward_amount?.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No rewards yet */}
      {(!data.rewards || data.rewards.length === 0) && (
        <div className="text-center py-2 text-gray-500 text-sm">
          No rewards yet. Run a cache node to start earning!
        </div>
      )}
    </div>
  )
}

