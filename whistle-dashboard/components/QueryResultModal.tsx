'use client';

import { motion, AnimatePresence } from 'framer-motion';
import PanelFrame from './PanelFrame';

interface QueryResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: any;
  method: string;
  params: string;
}

export default function QueryResultModal({ isOpen, onClose, result, method, params }: QueryResultModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <PanelFrame cornerType="gold" className="p-6">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl z-10"
              >
                &times;
              </button>

              <h2 className="text-xl font-bold text-emerald-400 mb-2 font-mono tracking-wide">
                RPC QUERY RESULT
              </h2>

              <div className="mb-4 pb-4 border-b border-white/10">
                <div className="text-xs text-gray-400 space-y-1">
                  <div>
                    <span className="text-gray-600">Method:</span>{' '}
                    <span className="text-white font-mono">{method}</span>
                  </div>
                  {params && (
                    <div className="flex gap-2">
                      <span className="text-gray-600">Params:</span>{' '}
                      <span className="text-white font-mono break-all">{params}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">Endpoint:</span>{' '}
                    <span className="text-emerald-400 font-mono">https://rpc.whistle.ninja/rpc</span>
                  </div>
                </div>
              </div>

              <div className="bg-black/60 border border-emerald-500/20 rounded-lg p-4 max-h-[60vh] overflow-auto">
                <pre className="text-xs text-emerald-300 font-mono whitespace-pre-wrap break-words">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
                  }}
                  className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded text-xs font-bold text-emerald-400 tracking-wider transition-all duration-200"
                >
                  COPY JSON
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded text-xs font-bold text-white tracking-wider transition-all duration-200"
                >
                  CLOSE
                </button>
              </div>
            </PanelFrame>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}



