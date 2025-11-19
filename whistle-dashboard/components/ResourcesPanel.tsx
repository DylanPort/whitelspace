'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import ResourcesModal from './ResourcesModal';

export default function ResourcesPanel() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="panel-base p-1.5 md:p-2 rounded-[12px] clip-angled-border"
      >
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full px-2 md:px-3 py-2 md:py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all text-[9px] md:text-[10px] font-semibold tracking-wider leading-tight"
          style={{
            clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
          }}
        >
          CRYPTWHISTLE AI
        </button>
      </motion.div>

      {/* Resources Modal */}
      <ResourcesModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}



