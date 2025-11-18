'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import GovernanceModal from './GovernanceModal';

export default function GovernancePanel() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="w-full"
        style={{ maxWidth: '340px', margin: '0 auto' }}
      >
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all text-[10px] font-semibold tracking-wider"
          style={{
            clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
          }}
        >
          GOVERNANCE
        </button>
      </motion.div>

      <GovernanceModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

