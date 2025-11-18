'use client';

import { motion } from 'framer-motion';

export default function DecentralizationProgress() {
  // Current stage (0-based index)
  const currentStage = 0; // RPC is current/active

  const stages = [
    { id: 1, label: 'RPC', complete: false, current: true },
    { id: 2, label: 'VPN', complete: false },
    { id: 3, label: 'BROWSER', complete: false },
    { id: 4, label: 'OS', complete: false },
    { id: 5, label: 'HARDWARE', complete: false },
  ];

  const progress = ((currentStage + 1) / stages.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="w-full"
      style={{ maxWidth: '340px', margin: '0 auto' }}
    >
      <div className="p-3 bg-black/20 border border-white/10 rounded-lg backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-center mb-3">
          <div className="text-[9px] text-gray-500 tracking-[0.2em] uppercase">
            Product Roadmap
          </div>
        </div>

        {/* Stage Indicators */}
        <div className="flex justify-between items-start relative px-2">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex flex-col items-center flex-1">
              {/* Dot */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                className={`w-2.5 h-2.5 rounded-full mb-2 relative ${
                  stage.current
                    ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]'
                    : 'bg-white/20'
                }`}
              >
                {stage.current && (
                  <motion.div
                    animate={{ scale: [1, 1.8, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0 rounded-full bg-white/40"
                  />
                )}
              </motion.div>

              {/* Label */}
              <div
                className={`text-[8px] tracking-wider text-center leading-tight font-semibold ${
                  stage.current ? 'text-white' : 'text-gray-600'
                }`}
              >
                {stage.label}
              </div>
            </div>
          ))}
        </div>

        {/* Current Phase Description */}
        <div className="mt-2 pt-2 border-t border-white/5">
          <div className="text-[8px] text-gray-400 text-center leading-relaxed">
            Currently building decentralized RPC infrastructure
          </div>
        </div>
      </div>
    </motion.div>
  );
}

