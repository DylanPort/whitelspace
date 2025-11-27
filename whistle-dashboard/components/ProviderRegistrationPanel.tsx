'use client';

import PanelFrame from './PanelFrame';
import { ExternalLink } from 'lucide-react';

export default function ProviderRegistrationPanel() {
  return (
    <PanelFrame
      cornerType="gold"
      motionProps={{
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.6, delay: 0.4 }
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-semibold tracking-[0.15em]">
          BECOME A PROVIDER
        </h3>
        <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-sm animate-pulse">
          NEW
        </span>
      </div>

      <div className="space-y-4">
        <div className="text-xs text-gray-400 leading-relaxed">
          Run a WHISTLE node and earn SOL by serving RPC queries to the network.
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 text-xs mt-0.5">✓</span>
            <span className="text-xs text-gray-300">Earn SOL per query</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 text-xs mt-0.5">✓</span>
            <span className="text-xs text-gray-300">No rate limits</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 text-xs mt-0.5">✓</span>
            <span className="text-xs text-gray-300">Decentralized network</span>
          </div>
        </div>

        <div className="pt-3 border-t border-white/10">
          <div className="text-[9px] text-gray-500 tracking-widest mb-2">REQUIREMENTS</div>
          <div className="space-y-1 text-[10px] text-gray-400">
            <div>• Min stake: 1k WHISTLE</div>
            <div>• 2TB NVMe storage</div>
            <div>• 64GB RAM (recommended)</div>
            <div>• 99%+ uptime</div>
          </div>
        </div>

        <a
          href="https://provider.whistle.ninja"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full mt-4 py-3 px-4 
                     bg-gradient-to-r from-emerald-600 to-emerald-500 
                     hover:from-emerald-500 hover:to-emerald-400
                     text-white font-bold text-xs tracking-wider
                     border border-emerald-400/50 
                     transition-all duration-300 
                     hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]
                     group"
        >
          REGISTER NOW
          <ExternalLink size={12} className="opacity-70 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>
    </PanelFrame>
  );
}
