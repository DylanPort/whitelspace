'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

export default function RpcEndpointPanel() {
  const [copied, setCopied] = useState(false);
  
  const rpcUrl = 'https://rpc.whistlenet.xyz';
  const wsUrl = 'wss://rpc.whistlenet.xyz';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="panel-base p-6 rounded-[16px] clip-angled-border"
    >
      <h3 className="text-[11px] font-semibold mb-4 tracking-[0.15em]">
        RPC ENDPOINT
      </h3>

      <div className="space-y-4">
        {/* HTTPS */}
        <div>
          <div className="text-[9px] text-gray-500 tracking-widest mb-2">HTTPS</div>
          <div 
            className="flex items-center justify-between px-3 py-2 bg-black/60 border border-white/10 cursor-pointer hover:border-white/20 transition-colors"
            onClick={() => handleCopy(rpcUrl)}
          >
            <span className="text-xs font-mono truncate">{rpcUrl}</span>
            <span className="text-[10px] ml-2">{copied ? '✓' : '⧉'}</span>
          </div>
        </div>

        {/* WebSocket */}
        <div>
          <div className="text-[9px] text-gray-500 tracking-widest mb-2">WEBSOCKET</div>
          <div 
            className="flex items-center justify-between px-3 py-2 bg-black/60 border border-white/10 cursor-pointer hover:border-white/20 transition-colors"
            onClick={() => handleCopy(wsUrl)}
          >
            <span className="text-xs font-mono truncate">{wsUrl}</span>
            <span className="text-[10px] ml-2">{copied ? '✓' : '⧉'}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Rate Limit</span>
            <span className="font-semibold">Unlimited</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Network</span>
            <span className="font-semibold">Mainnet</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

