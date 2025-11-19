'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import OurPlansModal from './OurPlansModal';
import ShinyButton from './ShinyButton';

export default function OurPlansPanel() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="w-full"
        style={{ maxWidth: '300px', margin: '0 auto' }}
      >
        <ShinyButton 
          onClick={() => setIsModalOpen(true)}
        >
          OUR PLANS
        </ShinyButton>
      </motion.div>

      <OurPlansModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
