'use client';

import { useEffect, useState } from 'react';
import { fetchAllProviders, fetchStakingPool } from '@/lib/contract';
import PanelFrame from './PanelFrame';

export default function NetworkStatsPanel() {
  const [stats, setStats] = useState({
    totalProviders: 0,
    activeProviders: 0,
    totalStaked: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [providers, pool] = await Promise.all([
          fetchAllProviders(),
          fetchStakingPool()
        ]);
        
        setStats({
          totalProviders: providers.length,
          activeProviders: providers.filter(p => p.isActive).length,
          totalStaked: pool ? Number(pool.totalStaked) / 1000000 : 0,
        });
      } catch (err) {
        console.error('Failed to load network stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <PanelFrame
      cornerType="silver"
      className="min-h-[240px] flex flex-col"
      motionProps={{
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.6, delay: 0.3 }
      }}
    >
      <h3 className="text-[11px] font-semibold mb-4 tracking-[0.15em]">
        NETWORK STATS
      </h3>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-[10px] text-gray-500">
          Loading...
        </div>
      ) : stats.activeProviders === 0 ? (
        <div className="text-center py-8 flex-1 flex flex-col justify-center">
          <div className="text-gray-600 text-xs mb-2">⚠</div>
          <div className="text-gray-500 text-[10px]">Network offline</div>
          <div className="text-gray-600 text-[9px] mt-1">No active providers</div>
        </div>
      ) : (
        <div className="space-y-4 flex-1">
          <div>
            <div className="text-2xl font-bold">{Math.floor(stats.totalStaked).toLocaleString()}</div>
            <div className="text-[9px] text-gray-500 tracking-widest mt-1">WHISTLE STAKED</div>
          </div>

          <div className="pt-3 border-t border-white/10 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-500 tracking-wider">TOTAL PROVIDERS</span>
              <span className="text-lg font-semibold">{stats.totalProviders}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-500 tracking-wider">ACTIVE PROVIDERS</span>
              <span className="text-lg font-semibold text-green-400">{stats.activeProviders}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-500 tracking-wider">NETWORK STATUS</span>
              <span className="text-lg font-semibold text-green-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                ONLINE
              </span>
            </div>
          </div>
        </div>
      )}
    </PanelFrame>
  );
}
