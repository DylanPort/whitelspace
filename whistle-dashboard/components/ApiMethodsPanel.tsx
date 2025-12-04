'use client';

import { useState } from 'react';
import PanelFrame from './PanelFrame';
import { motion, AnimatePresence } from 'framer-motion';

export default function ApiMethodsPanel() {
  const [expanded, setExpanded] = useState(false);

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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-semibold tracking-[0.15em]">
            RPC FEATURES
          </h3>
          <button
            onClick={() => setExpanded(true)}
            className="text-[8px] px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-500/20 transition-all"
          >
            HEALTH ↗
          </button>
        </div>

        {/* Features List */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 flex-1 content-start">
          {[
            'Low Latency Response',
            'WebSocket Support',
            'Real-time Data Streaming',
            'Embeddable Widgets',
            'JSON-RPC 2.0 Standard',
            'Account Subscriptions',
            'Transaction Tracking',
            'Geyser Integration',
          ].map((feat, i) => (
            <motion.div
              key={feat}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="flex items-center gap-2"
            >
              <motion.div 
                className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0"
                animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
              />
              <span className="text-[9px] text-gray-300">{feat}</span>
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
              <div className="flex items-center justify-between p-4 bg-black/80 border border-cyan-500/30 border-b-0 rounded-t-lg">
                <h2 className="text-sm font-bold tracking-wider text-cyan-400">
                  RPC HEALTH MONITOR
                </h2>
                <div className="flex items-center gap-3">
                  <a
                    href="https://health.whistle.ninja"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-500/20 transition-all"
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
              <div className="flex-1 bg-black border border-cyan-500/30 border-t-0 rounded-b-lg overflow-hidden">
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
