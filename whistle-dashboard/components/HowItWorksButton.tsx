'use client';

import { motion } from 'framer-motion';

interface HowItWorksButtonProps {
  onClick: () => void;
}

const Rivet = ({ className }: { className: string }) => (
  <div 
    className={`absolute w-1.5 h-1.5 rounded-full shadow-[0_1px_1px_rgba(0,0,0,0.8)] ${className}`}
    style={{
      background: 'radial-gradient(circle at 30% 30%, #E6E6E6 0%, #808080 40%, #404040 100%)',
      border: '1px solid rgba(0,0,0,0.5)'
    }}
  />
);

export default function HowItWorksButton({ onClick }: HowItWorksButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative group px-6 py-2.5"
    >
      {/* Main Body */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        style={{
          clipPath: 'polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)',
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)'
        }}
      />

      {/* Metallic Border Frame */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          clipPath: 'polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)',
          padding: '1px',
          background: 'linear-gradient(145deg, #4B5563, #1F2937, #9CA3AF, #1F2937)'
        }}
      >
        <div className="w-full h-full bg-black/90" style={{ 
          clipPath: 'inherit' 
        }} />
      </div>

      {/* Corner Rivets */}
      <Rivet className="top-1 left-3" />
      <Rivet className="top-1 right-3" />
      <Rivet className="bottom-1 left-3" />
      <Rivet className="bottom-1 right-3" />

      {/* Text Content */}
      <span className="relative z-10 text-[11px] font-bold tracking-widest text-cyan-400 group-hover:text-cyan-300 transition-colors uppercase">
        How It Works
      </span>
    </motion.button>
  );
}

