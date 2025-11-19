'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface ShinyButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export default function ShinyButton({
  children,
  onClick,
  className = ''
}: ShinyButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.96, y: 2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`relative w-full min-h-[48px] px-6 py-3 rounded-[16px] overflow-hidden ${className}`}
      style={{
        // Dark Gunmetal / Carbon Fiber Gradient
        background: 'linear-gradient(180deg, #374151 0%, #111827 100%)',
        // Deep shadows for dark button
        boxShadow: `
          0 15px 30px -5px rgba(0, 0, 0, 0.9),
          0 8px 10px -3px rgba(0, 0, 0, 0.8),
          inset 0 1px 0 rgba(255, 255, 255, 0.15),
          inset 0 -1px 0 rgba(0, 0, 0, 0.5)
        `,
      }}
    >
      {/* Darker Frame Border */}
      <div className="absolute inset-0 rounded-[16px] border-[0.5px] border-white/10 pointer-events-none" />
      
      {/* Texture Overlay (Subtle Noise) */}
      <div 
        className="absolute inset-0 opacity-[0.15] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '100px 100px'
        }}
      />

      {/* Top Gloss (Subtle on dark) */}
      <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/10 to-transparent opacity-100 pointer-events-none" />

      {/* Bottom Reflection */}
      <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center">
        <span 
          className="text-[10px] font-extrabold tracking-[0.15em] uppercase text-gray-200"
          style={{ 
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)' 
          }}
        >
          {children}
        </span>
      </div>
    </motion.button>
  );
}
