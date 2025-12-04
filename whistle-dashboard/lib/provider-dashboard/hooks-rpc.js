'use client'

import { useState, useEffect, useCallback } from 'react'
import { rpc } from './rpc'

/**
 * Hook for fetching live metrics directly from RPC
 */
export function useLiveMetrics(refreshInterval = 5000) {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [startTime] = useState(Date.now())

  const fetchMetrics = useCallback(async () => {
    try {
      // Fetch all data in parallel
      const [
        slot,
        blockHeight,
        epochInfo,
        version,
        perfSamples,
      ] = await Promise.all([
        rpc.getSlot().catch(() => null),
        rpc.getBlockHeight().catch(() => null),
        rpc.getEpochInfo().catch(() => null),
        rpc.getVersion().catch(() => null),
        rpc.getRecentPerformanceSamples(10).catch(() => []),
      ])

      // Get health separately (can throw)
      let health = 'unknown'
      let behindBy = 0
      try {
        const healthResult = await rpc.call('getHealth')
        health = healthResult === 'ok' ? 'healthy' : 'unhealthy'
      } catch (e) {
        if (e.message?.includes('behind')) {
          health = 'behind'
          const match = e.message.match(/behind by (\d+)/)
          behindBy = match ? parseInt(match[1]) : 0
        } else {
          health = 'error'
        }
      }

      // Calculate TPS from performance samples
      let tps = 0
      let avgSlotTimeMs = 400
      if (perfSamples && perfSamples.length > 0) {
        const totalTx = perfSamples.reduce((sum, s) => sum + s.numTransactions, 0)
        const totalTime = perfSamples.reduce((sum, s) => sum + s.samplePeriodSecs, 0)
        tps = Math.round(totalTx / totalTime)
        
        const totalSlots = perfSamples.reduce((sum, s) => sum + s.numSlots, 0)
        avgSlotTimeMs = Math.round((totalTime / totalSlots) * 1000)
      }

      // Build metrics object
      const newMetrics = {
        validator: {
          pubkey: 'rpc.whistle.ninja',
          version: version?.['solana-core'] || version?.['feature-set'] || 'unknown',
          featureSet: version?.['feature-set'] || null
        },
        chain: {
          slot: slot || 0,
          blockHeight: blockHeight || 0,
          epoch: epochInfo?.epoch || 0,
          epochProgress: epochInfo ? parseFloat(((epochInfo.slotIndex / epochInfo.slotsInEpoch) * 100).toFixed(2)) : 0,
          epochStartSlot: epochInfo ? epochInfo.absoluteSlot - epochInfo.slotIndex : 0,
          epochEndSlot: epochInfo ? (epochInfo.absoluteSlot - epochInfo.slotIndex) + epochInfo.slotsInEpoch : 0,
          slotsInEpoch: epochInfo?.slotsInEpoch || 0,
          slotIndex: epochInfo?.slotIndex || 0
        },
        performance: {
          tps,
          avgSlotTimeMs,
          clusterNodes: null // Would need getClusterNodes which is slow
        },
        health: {
          status: health,
          behindBy,
          lastUpdate: Date.now(),
          lastError: null,
          errorCount: 0
        },
        rpc: {
          endpoint: 'https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba',
          totalRequests: 0,
          requestsLastHour: 0,
          avgLatencyMs: 0
        },
        uptime: {
          startTime,
          uptimeSeconds: Math.floor((Date.now() - startTime) / 1000)
        }
      }

      setMetrics(newMetrics)
      setError(null)
    } catch (err) {
      console.error('Metrics fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [startTime])

  useEffect(() => {
    fetchMetrics()
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchMetrics, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchMetrics, refreshInterval])

  return { metrics, loading, error, refetch: fetchMetrics }
}

/**
 * Hook for tracking metrics history (client-side)
 */
export function useMetricsHistory() {
  const [history, setHistory] = useState({ data: [] })
  const { metrics } = useLiveMetrics(10000) // Slower refresh for history

  useEffect(() => {
    if (metrics) {
      setHistory(prev => {
        const newEntry = {
          timestamp: Date.now(),
          slot: metrics.chain.slot,
          block_height: metrics.chain.blockHeight,
          tps: metrics.performance.tps,
          health: metrics.health.status,
          epoch: metrics.chain.epoch,
          epoch_progress: metrics.chain.epochProgress
        }
        
        // Keep last 100 entries (about 16 minutes at 10s intervals)
        const newData = [...prev.data, newEntry].slice(-100)
        
        return { data: newData }
      })
    }
  }, [metrics?.chain.slot]) // Only update when slot changes

  return { history, loading: false, error: null }
}

/**
 * Hook for RPC health check
 */
export function useRpcHealth() {
  const [healthy, setHealthy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [latency, setLatency] = useState(null)

  useEffect(() => {
    const check = async () => {
      const start = Date.now()
      try {
        await rpc.getSlot()
        setHealthy(true)
        setLatency(Date.now() - start)
      } catch {
        setHealthy(false)
        setLatency(null)
      } finally {
        setLoading(false)
      }
    }

    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])

  return { healthy, loading, latency }
}

