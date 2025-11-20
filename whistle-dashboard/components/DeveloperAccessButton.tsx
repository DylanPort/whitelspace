'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import DeveloperAccessModal from './DeveloperAccessModal';
import ShinyButton from './ShinyButton';

export default function DeveloperAccessButton() {
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
          GET RPC ACCESS
        </ShinyButton>
      </motion.div>

      {/* Developer Access Modal */}
      <DeveloperAccessModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

