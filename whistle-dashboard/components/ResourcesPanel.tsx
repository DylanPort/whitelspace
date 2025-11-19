'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import ResourcesModal from './ResourcesModal';
import ShinyButton from './ShinyButton';

export default function ResourcesPanel() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="h-full"
      >
        <ShinyButton 
          onClick={() => setIsModalOpen(true)}
        >
          CRYPTWHISTLE AI
        </ShinyButton>
      </motion.div>

      {/* Resources Modal */}
      <ResourcesModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
