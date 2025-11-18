'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { api, type ProviderStats } from '@/lib/api';

interface ProviderDisplay {
  name: string;
  latency: string;
  uptime: string;
}

export default function RpcProvidersPanel() {
  const [providers, setProviders] = useState<ProviderDisplay[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProviders() {
      try {
        const stats = await api.getProviderStats();
        
        if (stats.length === 0) {
          // No providers - show empty state
          setProviders([]);
        } else {
          setProviders(
            stats.map((stat, i) => ({
              name: `Provider-${i + 1}`,
              latency: `${Math.round(stat.avg_response_time)}ms`,
              uptime: `${stat.uptime_percentage.toFixed(1)}%`,
            }))
          );
        }
      } catch (err) {
        console.error('Failed to load providers:', err);
        setError('Backend offline');
        // Show empty state
        setProviders([]);
      }
    }

    loadProviders();
    const interval = setInterval(loadProviders, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
      className="panel-base p-6 rounded-[16px] clip-angled-border"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-semibold tracking-[0.15em]">
          RPC PROVIDERS
        </h3>
        {error && (
          <div className="text-[9px] text-red-400">⚠</div>
        )}
      </div>

      <div className="space-y-0">
        {providers.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-600 text-xs mb-2">⚠</div>
            <div className="text-gray-500 text-[10px]">No providers online</div>
            {error && <div className="text-gray-600 text-[9px] mt-1">{error}</div>}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="flex items-center justify-between text-[10px] tracking-wider pb-2 border-b border-white/10">
              <div className="w-24">PROVIDER</div>
              <div className="w-16 text-center">LETN</div>
              <div className="w-16 text-right">UPTIME</div>
            </div>

            {/* Table rows */}
            {providers.map((provider, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm py-3 border-b border-white/5"
              >
                <div className="w-24 font-semibold">{provider.name}</div>
                <div className="w-16 text-center">{provider.latency}</div>
                <div className="w-16 text-right">{provider.uptime}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </motion.div>
  );
}
