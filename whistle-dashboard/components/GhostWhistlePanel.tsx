'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import GhostWhistleModal from './GhostWhistleModal';

export default function GhostWhistlePanel() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="panel-base p-1.5 md:p-2 rounded-[12px] clip-angled-border"
      >
        <button
          onClick={() => setIsModalOpen(true)}
          className="relative w-full px-2 md:px-3 py-2 md:py-2.5 border border-emerald-600/40 hover:border-emerald-500/60 transition-all text-[9px] md:text-[10px] font-semibold tracking-wider leading-tight overflow-hidden group"
          style={{
            clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.12) 50%, rgba(4, 120, 87, 0.08) 100%)',
            boxShadow: 'inset 0 1px 0 rgba(16, 185, 129, 0.2), inset 0 -1px 0 rgba(4, 120, 87, 0.3), 0 2px 8px rgba(16, 185, 129, 0.15)',
          }}
        >
          {/* Liquid shine effect */}
          <div 
            className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(16, 185, 129, 0.3) 0%, transparent 50%)',
              clipPath: 'inherit',
            }}
          />
          <span className="relative z-10 text-emerald-100 group-hover:text-white transition-colors">
            GHOST WHISTLE & PRIVACY TOOLS
          </span>
        </button>
      </motion.div>

      {/* Ghost Whistle Modal */}
      <GhostWhistleModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}



