'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from './api'

/**
 * Hook for fetching metrics with auto-refresh
 */
export function useMetrics(refreshInterval = 5000) {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await api.getMetrics()
      setMetrics(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

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
 * Hook for fetching metrics history
 */
export function useMetricsHistory(hours = 24) {
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchHistory = useCallback(async () => {
    try {
      const data = await api.getMetricsHistory(hours)
      setHistory(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [hours])

  useEffect(() => {
    fetchHistory()
    
    // Refresh every minute
    const interval = setInterval(fetchHistory, 60000)
    return () => clearInterval(interval)
  }, [fetchHistory])

  return { history, loading, error, refetch: fetchHistory }
}

/**
 * Hook for fetching request stats
 */
export function useRequestStats(hours = 1) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getRequestStats(hours)
      setStats(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [hours])

  useEffect(() => {
    fetchStats()
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [fetchStats])

  return { stats, loading, error, refetch: fetchStats }
}

/**
 * Hook for provider data
 */
export function useProvider(wallet) {
  const [provider, setProvider] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProvider = useCallback(async () => {
    if (!wallet) {
      setProvider(null)
      setLoading(false)
      return
    }

    try {
      const data = await api.getProvider(wallet)
      setProvider(data.provider)
      setError(null)
    } catch (err) {
      if (err.message.includes('not found')) {
        setProvider(null)
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [wallet])

  useEffect(() => {
    fetchProvider()
  }, [fetchProvider])

  return { provider, loading, error, refetch: fetchProvider }
}

/**
 * Hook for all providers
 */
export function useProviders() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProviders = useCallback(async () => {
    try {
      const data = await api.getProviders()
      setProviders(data.providers || [])
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  return { providers, loading, error, refetch: fetchProviders }
}

/**
 * Hook for API health check
 */
export function useApiHealth() {
  const [healthy, setHealthy] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const check = async () => {
      try {
        await api.health()
        setHealthy(true)
      } catch {
        setHealthy(false)
      } finally {
        setLoading(false)
      }
    }

    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])

  return { healthy, loading }
}

