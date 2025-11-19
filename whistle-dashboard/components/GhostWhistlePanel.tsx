'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import GhostWhistleModal from './GhostWhistleModal';
import ShinyButton from './ShinyButton';

export default function GhostWhistlePanel() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="h-full"
      >
        <ShinyButton 
          onClick={() => setIsModalOpen(true)}
        >
          GHOST WHISTLE & PRIVACY TOOLS
        </ShinyButton>
      </motion.div>

      {/* Ghost Whistle Modal */}
      <GhostWhistleModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
