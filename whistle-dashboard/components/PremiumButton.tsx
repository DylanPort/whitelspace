'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PremiumButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'emerald' | 'silver'; // Keeping variant names for logic, but styling will be metal
  className?: string;
}

// Rivet Component
const Rivet = ({ className }: { className: string }) => (
  <div 
    className={`absolute w-2 h-2 rounded-full shadow-[0_1px_1px_rgba(0,0,0,0.8)] ${className}`}
    style={{
      background: 'radial-gradient(circle at 30% 30%, #E6E6E6 0%, #808080 40%, #404040 100%)',
      border: '1px solid rgba(0,0,0,0.5)'
    }}
  />
);

export default function PremiumButton({
  children,
  onClick,
  variant = 'silver',
  className = ''
}: PremiumButtonProps) {
  
  const styles = {
    emerald: {
      // Bronze/Gold Frame for "Emerald" logic (Ghost Whistle)
      frame: 'linear-gradient(145deg, #B8860B, #8B4513, #DAA520, #8B4513)',
      innerPlate: 'linear-gradient(180deg, #064E3B 0%, #022C22 100%)',
      text: '#D1FAE5',
      textGlow: '0 0 10px rgba(52, 211, 153, 0.5)',
      borderColor: '#FCD34D',
    },
    silver: {
      // Steel/Iron Frame for "Silver" logic (AI)
      frame: 'linear-gradient(145deg, #D3D3D3, #696969, #A9A9A9, #696969)',
      innerPlate: 'linear-gradient(180deg, #1F2937 0%, #111827 100%)',
      text: '#F3F4F6',
      textGlow: '0 0 10px rgba(255, 255, 255, 0.3)',
      borderColor: '#9CA3AF',
    }
  };

  const currentStyle = styles[variant];

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative w-full min-h-[56px] p-[4px] rounded-[4px] ${className}`}
      style={{
        background: currentStyle.frame,
        boxShadow: '0 4px 10px rgba(0,0,0,0.8)',
      }}
    >
      {/* Outer Frame Bevel/Highlight */}
      <div className="absolute inset-0 rounded-[4px] border border-white/20 pointer-events-none" />
      
      {/* Nails/Rivets */}
      <Rivet className="top-1.5 left-1.5" />
      <Rivet className="top-1.5 right-1.5" />
      <Rivet className="bottom-1.5 left-1.5" />
      <Rivet className="bottom-1.5 right-1.5" />

      {/* Inner Plate (The dark part) */}
      <div 
        className="w-full h-full flex items-center justify-center rounded-[2px] px-4 py-3 border border-black/50"
        style={{
          background: currentStyle.innerPlate,
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)'
        }}
      >
        {/* Metallic Brush Texture Overlay */}
        <div 
          className="absolute inset-2 opacity-10 pointer-events-none mix-blend-overlay"
          style={{
             backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 1px, #000 1px, #000 2px)`
          }} 
        />

        <span 
          className="relative z-10 text-[11px] font-bold tracking-[0.15em] uppercase"
          style={{ 
            color: currentStyle.text,
            textShadow: currentStyle.textGlow
          }}
        >
          {children}
        </span>
      </div>
    </motion.button>
  );
}
