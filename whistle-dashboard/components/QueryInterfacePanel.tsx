'use client';

import { useState, useEffect, useRef } from 'react';
import PanelFrame from './PanelFrame';
import { motion, AnimatePresence } from 'framer-motion';

export default function QueryInterfacePanel() {
  const [expanded, setExpanded] = useState(false);
  const [shouldLoadPreview, setShouldLoadPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Lazy load preview iframe when in viewport
  useEffect(() => {
    if (shouldLoadPreview) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoadPreview(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    if (previewRef.current) {
      observer.observe(previewRef.current);
    }

    return () => observer.disconnect();
  }, [shouldLoadPreview]);

  return (
    <>
      <PanelFrame
        cornerType="silver"
        className="h-[280px] flex flex-col overflow-hidden"
        motionProps={{
          initial: { opacity: 0, x: 50 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.6 }
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-semibold tracking-[0.15em]">
            WHISTLE API
          </h3>
          <button
            onClick={() => setExpanded(true)}
            className="text-[8px] px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            EXPAND ↗
          </button>
        </div>

        {/* API iframe preview */}
        <div
          ref={previewRef}
          className="flex-1 relative rounded overflow-hidden border border-emerald-500/20 cursor-pointer hover:border-emerald-500/40 transition-all"
          onClick={() => setExpanded(true)}
        >
          <div
            className="relative overflow-hidden"
            style={{ width: '100%', height: '100%' }}
          >
            {shouldLoadPreview ? (
              <iframe
                src="https://api.whistle.ninja"
                style={{
                  border: 'none',
                  background: '#000',
                  width: '1600px',
                  height: '1200px',
                  transform: 'scale(0.16)',
                  transformOrigin: 'top left',
                  pointerEvents: 'none',
                }}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-black flex items-center justify-center">
                <div className="text-gray-600 text-xs">Loading preview...</div>
              </div>
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-2 left-2 right-2 text-[8px] text-gray-400 text-center pointer-events-none">
            Click to interact
          </div>
        </div>

        {/* Bottom Info */}
        <div className="pt-1.5 mt-1.5 border-t border-white/10">
          <p className="text-[7px] text-gray-500 text-center">
            Manage API keys • View usage • Get premium access
          </p>
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
              <div className="flex items-center justify-between p-4 bg-black/80 border border-emerald-500/30 border-b-0 rounded-t-lg">
                <h2 className="text-sm font-bold tracking-wider text-emerald-400">
                  WHISTLE API
                </h2>
                <div className="flex items-center gap-3">
                  <a
                    href="https://api.whistle.ninja"
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
                  src="https://api.whistle.ninja"
                  className="w-full h-full"
                  style={{ border: 'none' }}
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
