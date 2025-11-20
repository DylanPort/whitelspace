'use client';

import { useEffect, useState } from 'react';
import PanelFrame from './PanelFrame';

interface ProviderDisplay {
  name: string;
  latency: number;
  uptime: number;
  location: string;
}

export default function RpcProvidersPanel() {
  const [provider, setProvider] = useState<ProviderDisplay>({
    name: 'WhistleNet',
    latency: 0,
    uptime: 100,
    location: 'Global CDN'
  });

  useEffect(() => {
    async function checkProvider() {
      try {
        const start = Date.now();
        const response = await fetch('https://rpc.whistle.ninja/health');
        const latency = Date.now() - start;
        
        if (response.ok) {
          setProvider(prev => ({
            ...prev,
            latency,
            uptime: 100
          }));
        } else {
          setProvider(prev => ({ ...prev, uptime: 0 }));
        }
      } catch (err) {
        console.error('Provider check failed:', err);
        setProvider(prev => ({ ...prev, uptime: 0 }));
      }
    }

    checkProvider();
    const interval = setInterval(checkProvider, 5000); // Check every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <PanelFrame
      cornerType="silver"
      motionProps={{
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.6 }
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-semibold tracking-[0.15em]">
          RPC PROVIDERS
        </h3>
        <div className={`w-2 h-2 rounded-full ${provider.uptime > 0 ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
      </div>

      <div className="space-y-3">
        {/* Provider Card */}
        <div className="p-3 bg-black/30 rounded border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-lg">🌐</div>
            <div>
              <div className="text-sm font-bold text-white">{provider.name}</div>
              <div className="text-[9px] text-gray-500">{provider.location}</div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
            <div>
              <div className="text-[9px] text-gray-500 mb-1">LATENCY</div>
              <div className="text-sm font-bold text-emerald-400">{provider.latency}ms</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500 mb-1">UPTIME</div>
              <div className="text-sm font-bold">{provider.uptime}%</div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="text-[9px] text-gray-500 text-center pt-2 border-t border-white/10">
          Powered by Cloudflare Workers + Helius
        </div>
      </div>
    </PanelFrame>
  );
}
