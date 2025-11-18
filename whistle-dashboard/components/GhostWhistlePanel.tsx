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
        className="panel-base p-2 rounded-[12px] clip-angled-border"
      >
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all text-[10px] font-semibold tracking-wider"
          style={{
            clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
          }}
        >
          GHOST WHISTLE & PRIVACY TOOLS
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



