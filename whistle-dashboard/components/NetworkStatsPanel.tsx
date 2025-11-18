'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function NetworkStatsPanel() {
  const [stats, setStats] = useState({
    totalQueries: 0,
    activeProviders: 0,
    avgLatency: 0,
    networkUptime: 0,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const providers = await api.getProviderStats();
        const logs = await api.getQueryLogs(1000);
        
        setStats({
          totalQueries: logs.length,
          activeProviders: providers.filter(p => p.uptime_percentage > 95).length,
          avgLatency: providers.reduce((sum, p) => sum + p.avg_response_time, 0) / (providers.length || 1),
          networkUptime: providers.reduce((sum, p) => sum + p.uptime_percentage, 0) / (providers.length || 1),
        });
      } catch (err) {
        // Show zeros if backend is unavailable
        setStats({
          totalQueries: 0,
          activeProviders: 0,
          avgLatency: 0,
          networkUptime: 0,
        });
      }
    }

    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="panel-base p-6 rounded-[16px] clip-angled-border"
    >
      <h3 className="text-[11px] font-semibold mb-4 tracking-[0.15em]">
        NETWORK STATS
      </h3>

      {stats.totalQueries === 0 && stats.activeProviders === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-600 text-xs mb-2">⚠</div>
          <div className="text-gray-500 text-[10px]">Network offline</div>
          <div className="text-gray-600 text-[9px] mt-1">Backend unavailable</div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="text-2xl font-bold">{stats.totalQueries.toLocaleString()}</div>
            <div className="text-[9px] text-gray-500 tracking-widest mt-1">TOTAL QUERIES</div>
          </div>

          <div className="pt-3 border-t border-white/10 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-500 tracking-wider">ACTIVE PROVIDERS</span>
              <span className="text-lg font-semibold">{stats.activeProviders}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-500 tracking-wider">AVG LATENCY</span>
              <span className="text-lg font-semibold">{Math.round(stats.avgLatency)}ms</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-500 tracking-wider">NETWORK UPTIME</span>
              <span className="text-lg font-semibold text-white">{stats.networkUptime.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

