'use client';

import { useState } from 'react';
import PanelFrame from './PanelFrame';

export default function RpcEndpointPanel() {
  const [copiedHttp, setCopiedHttp] = useState(false);
  const [copiedWss, setCopiedWss] = useState(false);
  const httpEndpoint = 'https://rpc.whistle.ninja/rpc';
  const wssEndpoint = 'wss://rpc.whistle.ninja';

  const copyHttpEndpoint = () => {
    navigator.clipboard.writeText(httpEndpoint);
    setCopiedHttp(true);
    setTimeout(() => setCopiedHttp(false), 2000);
  };

  const copyWssEndpoint = () => {
    navigator.clipboard.writeText(wssEndpoint);
    setCopiedWss(true);
    setTimeout(() => setCopiedWss(false), 2000);
  };

  return (
    <PanelFrame
      cornerType="gold"
      motionProps={{
        initial: { opacity: 0, x: -50 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.6, delay: 0.3 }
      }}
    >
      <h3 className="text-[11px] font-semibold mb-4 tracking-[0.15em]">
        RPC ENDPOINT
      </h3>

      <div className="space-y-3">
        {/* Status Message */}
        <div className="py-2 text-center">
          <div className="text-emerald-400 text-lg mb-1">🌐</div>
          <div className="text-emerald-400 text-[10px] tracking-wider mb-1">
            PUBLIC RPC
          </div>
          <div className="text-gray-400 text-[9px] leading-relaxed">
            Free for everyone
          </div>
        </div>

        {/* HTTP Endpoint Display - Clickable */}
        <div 
          className="p-2 bg-black/30 rounded border border-emerald-500/20 cursor-pointer hover:bg-black/40 hover:border-emerald-500/40 transition-all relative group"
          onClick={copyHttpEndpoint}
        >
          <div className="text-[8px] text-gray-500 mb-1">HTTP ENDPOINT</div>
          <div className="text-[9px] text-emerald-400 font-mono break-all pr-6">
            {httpEndpoint}
          </div>
          <div className="absolute top-2 right-2 text-[10px]">
            {copiedHttp ? (
              <span className="text-emerald-400">✓</span>
            ) : (
              <span className="text-gray-500 group-hover:text-emerald-400 transition-colors">📋</span>
            )}
          </div>
        </div>

        {/* WSS Endpoint Display - Clickable */}
        <div 
          className="p-2 bg-black/30 rounded border border-blue-500/20 cursor-pointer hover:bg-black/40 hover:border-blue-500/40 transition-all relative group"
          onClick={copyWssEndpoint}
        >
          <div className="text-[8px] text-gray-500 mb-1">WEBSOCKET</div>
          <div className="text-[9px] text-blue-400 font-mono break-all pr-6">
            {wssEndpoint}
          </div>
          <div className="absolute top-2 right-2 text-[10px]">
            {copiedWss ? (
              <span className="text-blue-400">✓</span>
            ) : (
              <span className="text-gray-500 group-hover:text-blue-400 transition-colors">📋</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="pt-2 border-t border-white/10 space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-500">Status</span>
            <span className="font-semibold text-emerald-400">Available</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-500">Network</span>
            <span className="font-semibold">Mainnet</span>
          </div>
        </div>
      </div>
    </PanelFrame>
  );
}
