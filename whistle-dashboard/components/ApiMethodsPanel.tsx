'use client';

import { useState } from 'react';
import PanelFrame from './PanelFrame';
import { motion, AnimatePresence } from 'framer-motion';

const ENDPOINTS = [
  { name: 'RPC', url: 'rpc.whistle.ninja', desc: 'JSON-RPC 2.0' },
  { name: 'WSS', url: 'wss://rpc.whistle.ninja', desc: 'WebSocket' },
  { name: 'GEYSER', url: 'geyser.whistle.ninja', desc: 'Real-time data' },
];

export default function ApiMethodsPanel() {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyEndpoint = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      <PanelFrame
        cornerType="silver"
        className="h-[280px] flex flex-col"
        motionProps={{
          initial: { opacity: 0, x: -50 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.6, delay: 0.5 }
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-semibold tracking-[0.15em]">
            RPC ENDPOINTS
          </h3>
          <button
            onClick={() => setExpanded(true)}
            className="text-[8px] px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            HEALTH ↗
          </button>
        </div>

        {/* Endpoints List */}
        <div className="space-y-1.5 mb-3">
          {ENDPOINTS.map((ep, i) => (
            <motion.div
              key={ep.name}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center justify-between p-1.5 bg-black/30 rounded border border-white/5 hover:border-emerald-500/30 transition-all group"
            >
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-bold text-emerald-400 w-10">{ep.name}</span>
                <span className="text-[7px] text-gray-400 font-mono truncate">{ep.url}</span>
              </div>
              <button
                onClick={() => copyEndpoint(ep.url)}
                className="text-[7px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copied === ep.url ? '✓' : 'COPY'}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-4 gap-1.5 flex-1">
          {[
            { icon: '⚡', label: 'Low Latency' },
            { icon: '🔄', label: 'WebSocket' },
            { icon: '📊', label: 'Data Stream' },
            { icon: '🧩', label: 'Widgets' },
          ].map((feat, i) => (
            <motion.div
              key={feat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="p-1.5 bg-black/20 rounded border border-white/5 text-center flex flex-col items-center justify-center"
            >
              <div className="text-xs mb-0.5">{feat.icon}</div>
              <div className="text-[7px] font-semibold text-white leading-tight">{feat.label}</div>
            </motion.div>
          ))}
        </div>
      </PanelFrame>

      {/* Expanded Modal - Health Monitor */}
      <AnimatePresence>
        {expanded && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpanded(false)}
              className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed inset-4 md:inset-8 lg:inset-16 z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 bg-black/80 border border-emerald-500/30 border-b-0 rounded-t-lg">
                <h2 className="text-sm font-bold tracking-wider text-emerald-400">
                  RPC HEALTH MONITOR
                </h2>
                <div className="flex items-center gap-3">
                  <a
                    href="https://health.whistle.ninja"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400 hover:bg-emerald-500/20 transition-all"
                  >
                    Open in new tab ↗
                  </a>
                  <button
                    onClick={() => setExpanded(false)}
                    className="text-2xl text-gray-400 hover:text-white transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              {/* iframe */}
              <div className="flex-1 bg-black border border-emerald-500/30 border-t-0 rounded-b-lg overflow-hidden">
                <iframe
                  src="https://health.whistle.ninja"
                  className="w-full h-full"
                  style={{ border: 'none' }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
