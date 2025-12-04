'use client';

import { motion } from 'framer-motion';

export default function DecentralizationProgress() {
  const stages = [
    { id: 1, label: 'RPC', status: 'ACTIVE', color: '#10B981' },
    { id: 2, label: 'VPN', status: 'PENDING', color: '#374151' },
    { id: 3, label: 'BROWSER', status: 'LOCKED', color: '#374151' },
    { id: 4, label: 'OS', status: 'LOCKED', color: '#374151' },
    { id: 5, label: 'HARDWARE', status: 'LOCKED', color: '#374151' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="w-full max-w-[380px] mx-auto"
    >
      {/* Main Container - Dark Premium iOS Module */}
      <div 
        className="relative p-7 rounded-[24px] overflow-hidden"
        style={{
          // Deep rich dark background
          background: 'linear-gradient(180deg, #1A1A1A 0%, #050505 100%)',
          // Subtle bezel border
          boxShadow: `
            0 0 0 1px rgba(255, 255, 255, 0.08), 
            0 20px 40px -12px rgba(0, 0, 0, 0.9),
            inset 0 1px 0 rgba(255, 255, 255, 0.15)
          `,
          minHeight: '180px'
        }}
      >
        {/* Tactile Noise Texture */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundSize: '100px 100px'
          }}
        />

        {/* Soft Ambient Top Light */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[120px] bg-white/5 blur-[60px] pointer-events-none" 
          style={{ mixBlendMode: 'overlay' }}
        />

        {/* Header Label */}
        <div className="relative flex justify-between items-end mb-10 z-10">
          <div className="flex flex-col">
            <span className="text-[10px] text-emerald-400/80 font-medium mb-1 tracking-wide">SYS.INIT_SEQUENCE</span>
            <span className="text-[13px] font-bold text-white tracking-[0.12em] drop-shadow-md">PRODUCT ROADMAP</span>
          </div>
          <div className="text-[10px] text-white/30 font-mono tracking-widest">v1.0.4</div>
        </div>

        {/* Progress Rail Container */}
        <div className="relative mb-10 z-10">
          {/* Recessed Rail Track */}
          <div 
            className="absolute top-0 left-0 w-full h-2 rounded-full"
            style={{
              background: '#000000',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.05)'
            }}
          />

          {/* Active Light Beam */}
          <motion.div 
            className="absolute top-0 left-0 h-2 rounded-full z-10"
            style={{
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 1) 100%)',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.6)'
            }}
            initial={{ width: '0%' }}
            animate={{ width: '15%' }}
            transition={{ duration: 1.5, delay: 0.5 }}
          />

          {/* Nodes Layer */}
          <div className="absolute inset-0 flex justify-between items-center -mt-[3px] px-[2px]">
            {stages.map((stage, index) => {
              const isActive = stage.status === 'ACTIVE';
              return (
                <div key={stage.id} className="relative flex flex-col items-center group -mt-1.5">
                  
                  {/* Node Light (The Physical LED) */}
                  <div 
                    className={`relative w-5 h-5 rounded-full flex items-center justify-center z-20 transition-all duration-500 ${
                      isActive ? 'scale-110' : 'scale-100'
                    }`}
                    style={{
                      background: isActive 
                        ? 'radial-gradient(circle at 30% 30%, #D1FAE5 0%, #10B981 60%, #065F46 100%)'
                        : 'radial-gradient(circle at 30% 30%, #4B5563 0%, #1F2937 100%)',
                      boxShadow: isActive
                        ? '0 0 20px rgba(16, 185, 129, 0.6), inset 0 1px 1px rgba(255,255,255,0.8)'
                        : '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)',
                      border: isActive ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(0,0,0,0.8)'
                    }}
                  >
                    {isActive && (
                      <motion.div 
                        className="absolute inset-0 bg-white rounded-full"
                        animate={{ opacity: [0, 0.5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{ filter: 'blur(4px)' }}
                      />
                    )}
                  </div>
                  
                  {/* Laser Stem */}
                  <div 
                    className={`w-[1px] h-5 mt-0 mb-2 transition-all duration-500 ${
                      isActive 
                        ? 'bg-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.6)]' 
                        : 'bg-white/5'
                    }`} 
                  />

                  {/* Text Label */}
                  <div className={`text-[10px] font-bold tracking-widest transition-all duration-500 ${
                    isActive 
                      ? 'text-white drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' 
                      : 'text-white/20'
                  }`}>
                    {stage.label}
                  </div>
                  
                  {/* Status Label */}
                  <div className={`text-[8px] font-medium mt-1 tracking-wider transition-all duration-500 ${
                    isActive ? 'text-emerald-400' : 'text-white/10'
                  }`}>
                    {stage.status}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Console */}
        <div className="absolute bottom-6 left-7 right-7 flex items-center gap-3 z-10">
          <div 
            className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)] animate-pulse"
          />
          <div className="text-[10px] text-white/40 font-mono overflow-hidden whitespace-nowrap">
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: 'auto' }}
              transition={{ duration: 2, delay: 1 }}
              className="inline-block overflow-hidden align-bottom"
            >
              &gt; Initializing decentralized RPC infrastructure...
            </motion.span>
          </div>
        </div>

        {/* Glass Reflection at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </motion.div>
  );
}

