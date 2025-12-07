'use client';

import { useState } from 'react';
import PanelFrame from './PanelFrame';
import { motion } from 'framer-motion';

export default function RpcEndpointPanel() {
  const [copiedHttp, setCopiedHttp] = useState(false);
  const httpEndpoint = 'https://rpc.whistle.ninja/rpc';

  const copyHttpEndpoint = () => {
    navigator.clipboard.writeText(httpEndpoint);
    setCopiedHttp(true);
    setTimeout(() => setCopiedHttp(false), 2000);
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
      <h3 className="text-[11px] font-semibold mb-2 tracking-[0.15em]">
        WHISTLE RPC
      </h3>

      {/* Hero Message */}
      <motion.div 
        className="p-2.5 mb-3 rounded-lg bg-black/20 border border-white/10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="text-[10px] font-bold text-white mb-1.5">
          WHY WHISTLE RPC?
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-white"><span className="font-bold">FASTER</span> - Direct validator connection</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-white"><span className="font-bold">CHEAPER</span> - No expensive API plans</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-white"><span className="font-bold">DECENTRALIZED</span> - Community nodes</span>
          </div>
        </div>
      </motion.div>

      {/* No More Rate Limits Banner */}
      <motion.div 
        className="p-2 mb-2.5 rounded border-l-2 border-white/20 bg-black/20"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="text-[9px] font-bold text-white mb-0.5">
          NO MORE RATE LIMITS
        </div>
        <p className="text-[7px] text-gray-400 leading-relaxed">
          Stop paying for overpriced endpoints. Get unlimited access.
        </p>
      </motion.div>

      {/* HTTP Endpoint */}
      <div 
        className="p-2 mb-2.5 bg-black/40 rounded border border-white/10 cursor-pointer hover:bg-black/50 hover:border-white/20 transition-all relative group"
        onClick={copyHttpEndpoint}
      >
        <div className="text-[7px] text-gray-400 mb-0.5">
          HTTP ENDPOINT
        </div>
        <div className="text-[8px] text-white font-mono truncate pr-6">
          {httpEndpoint}
        </div>
        <div className="absolute top-2 right-2 text-[9px]">
          {copiedHttp ? (
            <span className="text-white">COPY</span>
          ) : (
            <span className="text-gray-500 group-hover:text-white transition-colors">COPY</span>
          )}
        </div>
      </div>

      {/* CTA Button */}
      <a 
        href="https://api.whistle.ninja" 
        target="_blank" 
        rel="noopener noreferrer"
        className="block w-full py-2 text-center text-[8px] font-bold tracking-wider bg-black/30 border border-white/10 rounded hover:bg-black/40 transition-all text-white"
      >
        GET API KEY FOR MORE →
      </a>

      {/* Status */}
      <div className="flex justify-between text-[9px] pt-2 mt-2 border-t border-white/5">
        <span className="text-gray-500">Status</span>
        <span className="text-white font-bold flex items-center gap-1">
          <motion.span
            className="w-1.5 h-1.5 bg-white rounded-full"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          Online • Mainnet
        </span>
      </div>
    </PanelFrame>
  );
}
