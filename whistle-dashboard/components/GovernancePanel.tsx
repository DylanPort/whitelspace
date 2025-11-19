'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import GovernanceModal from './GovernanceModal';
import ShinyButton from './ShinyButton';

export default function GovernancePanel() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="w-full"
        style={{ maxWidth: '360px', margin: '0 auto' }}
      >
        <ShinyButton 
          onClick={() => setIsModalOpen(true)}
        >
          GOVERNANCE
        </ShinyButton>
      </motion.div>

      <GovernanceModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
