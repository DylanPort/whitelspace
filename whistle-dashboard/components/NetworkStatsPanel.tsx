'use client';

import { useState } from 'react';
import PanelFrame from './PanelFrame';
import { motion, AnimatePresence } from 'framer-motion';

export default function NetworkStatsPanel() {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <PanelFrame
        cornerType="silver"
        className="min-h-[320px] flex flex-col relative overflow-hidden"
        motionProps={{
          initial: { opacity: 0, x: -50 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.6, delay: 0.3 }
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-semibold tracking-[0.15em] relative z-10">
            WHISTLE DEX
          </h3>
          <button
            onClick={() => setExpanded(true)}
            className="text-[8px] px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-500/20 transition-all"
          >
            EXPAND ↗
          </button>
        </div>

        {/* DEX iframe - scaled preview */}
        <div 
          className="flex-1 relative z-10 rounded overflow-hidden border border-cyan-500/20 cursor-pointer hover:border-cyan-500/40 transition-all"
          onClick={() => setExpanded(true)}
        >
          <div 
            className="relative overflow-hidden"
            style={{ width: '100%', height: '280px' }}
          >
            <iframe
              src="https://dex.whistle.ninja"
              style={{ 
                border: 'none',
                background: '#000',
                width: '1600px',
                height: '1200px',
                transform: 'scale(0.175)',
                transformOrigin: 'top left',
                pointerEvents: 'none',
              }}
              loading="lazy"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-2 left-2 right-2 text-[8px] text-gray-400 text-center pointer-events-none">
            Click to interact
          </div>
        </div>
      </PanelFrame>

      {/* Expanded Modal */}
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
                  WHISTLE DEX
                </h2>
                <div className="flex items-center gap-3">
                  <a
                    href="https://dex.whistle.ninja"
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
                  src="https://dex.whistle.ninja"
                  className="w-full h-full"
                  style={{ border: 'none' }}
                  allow="clipboard-write"
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
