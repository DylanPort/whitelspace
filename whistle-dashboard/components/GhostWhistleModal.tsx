'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface GhostWhistleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GhostWhistleModal({ isOpen, onClose }: GhostWhistleModalProps) {

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{
              background: 'rgba(0, 0, 0, 0.95)',
              backdropFilter: 'blur(10px)',
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ pointerEvents: 'none' }}
          >
            <div 
              className="relative w-full h-full max-w-[98vw] max-h-[98vh] bg-black border border-white/15 flex flex-col"
              style={{
                pointerEvents: 'auto',
                clipPath: 'polygon(20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px), 0 20px)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0 bg-black/90">
                <div>
                  <h2 className="text-xl font-bold tracking-[0.2em] uppercase">
                    GHOST WHISTLE & PRIVACY TOOLS
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">FULL WHISTLE PLATFORM</p>
                </div>
                <button
                  onClick={onClose}
                  className="text-3xl text-gray-400 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Iframe Content */}
              <div className="flex-1 relative overflow-hidden">
                <iframe
                  src="/ghost-whistle.html"
                  className="w-full h-full border-0"
                  title="Ghost Whistle - Full Platform"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                  style={{
                    background: '#000',
                  }}
                />
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-white/10 flex items-center justify-between flex-shrink-0 bg-black/90">
                <div className="text-[10px] text-gray-500">
                  Ghost Whistle & Privacy Tools • All Features Available
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all text-xs font-semibold tracking-wider"
                  style={{
                    clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
                  }}
                >
                  CLOSE
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


