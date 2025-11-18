'use client';

import { useQuery } from '@tanstack/react-query';
import { api, type ProviderStats } from '@/lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useState } from 'react';

export default function NetworkPage() {
  const [sortBy, setSortBy] = useState<'uptime' | 'queries' | 'earnings'>('uptime');

  const { data: providers, isLoading } = useQuery({
    queryKey: ['network-providers'],
    queryFn: () => api.getProviderStats(),
  });

  const { data: queryLogs } = useQuery({
    queryKey: ['network-query-logs'],
    queryFn: () => api.getQueryLogs(100),
  });

  const sortedProviders = [...(providers || [])].sort((a, b) => {
    if (sortBy === 'uptime') return b.uptime_percentage - a.uptime_percentage;
    if (sortBy === 'queries') return b.total_queries - a.total_queries;
    return b.total_earned - a.total_earned;
  });

  const networkStats = {
    totalProviders: providers?.length || 0,
    activeProviders: providers?.filter((p) => p.uptime_percentage > 95).length || 0,
    totalQueries: providers?.reduce((sum, p) => sum + p.total_queries, 0) || 0,
    avgLatency: providers?.length
      ? providers.reduce((sum, p) => sum + p.avg_response_time, 0) / providers.length
      : 0,
    networkUptime: providers?.length
      ? providers.reduce((sum, p) => sum + p.uptime_percentage, 0) / providers.length
      : 0,
  };

  return (
    <div className="min-h-screen bg-[#050505] p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <Link href="/" className="text-gray-400 hover:text-white text-sm mb-2 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-4xl font-bold tracking-wider mb-2">NETWORK MONITORING</h1>
        <p className="text-gray-500">Real-time network health and provider stats</p>
      </div>

      {/* Network Stats */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel-base p-4 clip-angled-border"
        >
          <div className="text-xs text-gray-500 tracking-wider mb-1">TOTAL PROVIDERS</div>
          <div className="text-2xl font-bold">{networkStats.totalProviders}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="panel-base p-4 clip-angled-border"
        >
          <div className="text-xs text-gray-500 tracking-wider mb-1">ACTIVE (&gt;95%)</div>
          <div className="text-2xl font-bold text-green-400">{networkStats.activeProviders}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="panel-base p-4 clip-angled-border"
        >
          <div className="text-xs text-gray-500 tracking-wider mb-1">TOTAL QUERIES</div>
          <div className="text-2xl font-bold">{networkStats.totalQueries.toLocaleString()}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="panel-base p-4 clip-angled-border"
        >
          <div className="text-xs text-gray-500 tracking-wider mb-1">AVG LATENCY</div>
          <div className="text-2xl font-bold">{Math.round(networkStats.avgLatency)}ms</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="panel-base p-4 clip-angled-border"
        >
          <div className="text-xs text-gray-500 tracking-wider mb-1">NETWORK UPTIME</div>
          <div className="text-2xl font-bold">{networkStats.networkUptime.toFixed(1)}%</div>
        </motion.div>
      </div>

      {/* Provider Leaderboard */}
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="panel-base p-6 clip-angled-border"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold tracking-wider">PROVIDER LEADERBOARD</h2>
            
            <div className="flex gap-2">
              {[
                { key: 'uptime', label: 'Uptime' },
                { key: 'queries', label: 'Queries' },
                { key: 'earnings', label: 'Earnings' },
              ].map((sort) => (
                <button
                  key={sort.key}
                  onClick={() => setSortBy(sort.key as any)}
                  className={`px-3 py-1 text-xs tracking-wider transition-colors ${
                    sortBy === sort.key
                      ? 'bg-white text-black'
                      : 'bg-black/60 border border-white/20 hover:bg-black/80'
                  }`}
                >
                  {sort.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} baseColor="#1a1a1a" highlightColor="#2a2a2a" height={80} />
              ))}
            </div>
          ) : sortedProviders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-xl mb-2">⚠</div>
              <div>No providers online</div>
              <div className="text-xs text-gray-600 mt-1">Backend offline or no registered providers</div>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedProviders.map((provider, index) => (
                <div
                  key={provider.provider_address}
                  className="flex items-center justify-between p-4 bg-black/40 border border-white/5 hover:border-white/10 transition-colors"
                >
                  {/* Rank & Address */}
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={`text-2xl font-bold ${
                        index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-600' : 'text-gray-600'
                      }`}
                    >
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-mono text-sm">
                        {provider.provider_address.slice(0, 8)}...{provider.provider_address.slice(-8)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Last heartbeat: {new Date(provider.last_heartbeat).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">UPTIME</div>
                      <div className="font-semibold">{provider.uptime_percentage.toFixed(1)}%</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">QUERIES</div>
                      <div className="font-semibold">{provider.total_queries.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">LATENCY</div>
                      <div className="font-semibold">{Math.round(provider.avg_response_time)}ms</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">EARNED</div>
                      <div className="font-semibold">{(provider.total_earned / 1e9).toFixed(4)} SOL</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Network Activity */}
      {queryLogs && queryLogs.length > 0 && (
        <div className="max-w-7xl mx-auto mt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="panel-base p-6 clip-angled-border"
          >
            <h2 className="text-xl font-bold tracking-wider mb-4">RECENT NETWORK ACTIVITY</h2>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {queryLogs.slice(0, 20).map((log, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-black/40 border border-white/5 text-xs">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="font-mono text-gray-400">{log.method}</div>
                    <div className="text-gray-600">{log.endpoint}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-gray-500">{log.response_time}ms</div>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        log.status === 'success' ? 'bg-green-400' : 'bg-red-400'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

