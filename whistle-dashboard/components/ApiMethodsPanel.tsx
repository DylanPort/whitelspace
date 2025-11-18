'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

const API_METHODS = [
  { name: 'getAccountInfo', desc: 'Get account data' },
  { name: 'getBalance', desc: 'Get SOL balance' },
  { name: 'getBlockHeight', desc: 'Latest block height' },
  { name: 'getTransaction', desc: 'Transaction details' },
  { name: 'getTokenAccountBalance', desc: 'Token balance' },
  { name: 'sendTransaction', desc: 'Submit transaction' },
];

export default function ApiMethodsPanel() {
  const [showAll, setShowAll] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="panel-base p-6 rounded-[16px] clip-angled-border"
    >
      <h3 className="text-[11px] font-semibold mb-4 tracking-[0.15em]">
        API METHODS
      </h3>

      <div className="space-y-1.5 max-h-52 overflow-y-auto">
        {API_METHODS.slice(0, showAll ? undefined : 5).map((method, i) => (
          <div 
            key={i}
            className="py-2 border-b border-white/5"
          >
            <div className="text-xs font-mono text-white">{method.name}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">{method.desc}</div>
          </div>
        ))}
      </div>

      {API_METHODS.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-[10px] text-gray-500 hover:text-white mt-3 transition-colors"
        >
          {showAll ? 'Show Less' : `+${API_METHODS.length - 5} more`}
        </button>
      )}

      <div className="mt-4 pt-4 border-t border-white/10">
        <a
          href="https://docs.solana.com/api"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          Full Documentation →
        </a>
      </div>
    </motion.div>
  );
}

