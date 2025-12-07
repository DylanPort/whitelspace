'use client';

import { useState, useEffect } from 'react';
import { fetchAllProviders } from '@/lib/contract';
import PanelFrame from './PanelFrame';

export default function NetworkProviderPanel() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const providerList = await fetchAllProviders();
        setProviders(providerList);
      } catch (error: any) {
        // Silently handle RPC limitations
        if (error?.message?.includes('excluded from account secondary indexes') || 
            error?.message?.includes('RPC method unavailable')) {
          setProviders([]);
        } else {
          console.error('Error fetching providers:', error);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    // Don't poll if RPC doesn't support this method
    // const interval = setInterval(fetchData, 30000);
    // return () => clearInterval(interval);
  }, []);

  const activeProviders = providers.filter(p => p.isActive).length;
  // Total bonded not available from this RPC method
  const totalBonded = 0;

  return (
    <PanelFrame
      cornerType="none"
      variant="darker"
      className="p-4 rounded-[12px]"
      motionProps={{
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, delay: 0.3 }
      }}
    >
      <h3 className="text-[10px] font-semibold mb-3 tracking-[0.15em]">
        NETWORK PROVIDERS
      </h3>

      {loading ? (
        <div className="text-center py-6 text-gray-500 text-xs">
          Loading...
        </div>
      ) : (
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Active Providers</span>
            <span className="font-semibold text-green-400">
              {activeProviders}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total Providers</span>
            <span className="font-semibold">
              {providers.length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total Bonded</span>
            <span className="font-semibold">
              {(totalBonded / 1e6).toFixed(0)}K WHISTLE
            </span>
          </div>
        </div>
      )}
    </PanelFrame>
  );
}
