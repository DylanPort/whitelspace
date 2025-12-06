'use client';

import { useState } from 'react';
import PanelFrame from './PanelFrame';
import { motion } from 'framer-motion';

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
      <h3 className="text-[11px] font-semibold mb-2 tracking-[0.15em]">
        FREE PUBLIC RPC
      </h3>

      {/* Hero Message */}
      <motion.div 
        className="p-2.5 mb-3 rounded-lg bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/20"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="text-[10px] font-bold text-emerald-400 mb-1.5 flex items-center gap-1">
          <span>🚀</span> WHY WHISTLE RPC?
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[8px]">⚡</span>
            <span className="text-[8px] text-gray-300"><span className="text-yellow-400 font-bold">FASTER</span> - Direct validator connection</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px]">💰</span>
            <span className="text-[8px] text-gray-300"><span className="text-emerald-400 font-bold">CHEAPER</span> - No expensive API plans</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px]">🌐</span>
            <span className="text-[8px] text-gray-300"><span className="text-blue-400 font-bold">DECENTRALIZED</span> - Community nodes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px]">🆓</span>
            <span className="text-[8px] text-gray-300"><span className="text-purple-400 font-bold">FREE TIER</span> - No credit card needed</span>
          </div>
        </div>
      </motion.div>

      {/* No More Rate Limits Banner */}
      <motion.div 
        className="p-2 mb-2.5 rounded border-l-2 border-yellow-500 bg-yellow-500/10"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="text-[9px] font-bold text-yellow-400 mb-0.5">
          ✨ NO MORE RATE LIMITS
        </div>
        <p className="text-[7px] text-gray-400 leading-relaxed">
          Stop paying for overpriced endpoints. Get unlimited access with our free tier.
        </p>
      </motion.div>

      {/* HTTP Endpoint */}
      <div 
        className="p-2 mb-1.5 bg-black/40 rounded border border-emerald-500/20 cursor-pointer hover:bg-black/50 hover:border-emerald-500/40 transition-all relative group"
        onClick={copyHttpEndpoint}
      >
        <div className="text-[7px] text-gray-500 mb-0.5 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          HTTP ENDPOINT
        </div>
        <div className="text-[8px] text-emerald-400 font-mono truncate pr-6">
          {httpEndpoint}
        </div>
        <div className="absolute top-2 right-2 text-[9px]">
          {copiedHttp ? (
            <span className="text-emerald-400">✓</span>
          ) : (
            <span className="text-gray-500 group-hover:text-emerald-400 transition-colors">📋</span>
          )}
        </div>
      </div>

      {/* WSS Endpoint */}
      <div 
        className="p-2 mb-2.5 bg-black/40 rounded border border-blue-500/20 cursor-pointer hover:bg-black/50 hover:border-blue-500/40 transition-all relative group"
        onClick={copyWssEndpoint}
      >
        <div className="text-[7px] text-gray-500 mb-0.5 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          WEBSOCKET
        </div>
        <div className="text-[8px] text-blue-400 font-mono truncate pr-6">
          {wssEndpoint}
        </div>
        <div className="absolute top-2 right-2 text-[9px]">
          {copiedWss ? (
            <span className="text-blue-400">✓</span>
          ) : (
            <span className="text-gray-500 group-hover:text-blue-400 transition-colors">📋</span>
          )}
        </div>
      </div>

      {/* CTA Button */}
      <a 
        href="https://api.whistle.ninja" 
        target="_blank" 
        rel="noopener noreferrer"
        className="block w-full py-2 text-center text-[8px] font-bold tracking-wider bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 rounded hover:from-emerald-500/30 hover:to-blue-500/30 transition-all text-white"
      >
        GET API KEY FOR MORE →
      </a>

      {/* Status */}
      <div className="flex justify-between text-[9px] pt-2 mt-2 border-t border-white/5">
        <span className="text-gray-500">Status</span>
        <span className="text-emerald-400 font-bold flex items-center gap-1">
          <motion.span
            className="w-1.5 h-1.5 bg-emerald-400 rounded-full"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          Online • Mainnet
        </span>
      </div>
    </PanelFrame>
  );
}
