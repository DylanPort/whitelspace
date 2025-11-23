'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import ShinyButton from './ShinyButton';

export default function GhostWhistlePanel() {
  const router = useRouter();

  const handleClick = () => {
    // Navigate to /main.html instead of opening modal/iframe
    window.location.href = '/main.html';
  };

  return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="h-full"
      >
        <ShinyButton 
        onClick={handleClick}
        >
            GHOST WHISTLE & PRIVACY TOOLS
        </ShinyButton>
      </motion.div>
  );
}
