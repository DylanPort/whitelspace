'use client';

import PanelFrame from './PanelFrame';
import { motion } from 'framer-motion';

export default function RpcProvidersPanel() {
  return (
    <PanelFrame
      cornerType="silver"
      motionProps={{
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.6 }
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-semibold tracking-[0.15em]">
          RPC PROVIDERS
        </h3>
      </div>

      <div className="flex flex-col items-center justify-center py-4">
        {/* Animated Logo Container */}
        <div className="relative w-20 h-20 mb-4">
          {/* Outer spinning ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-emerald-500/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Inner spinning ring (opposite direction) */}
          <motion.div
            className="absolute inset-2 rounded-full border border-emerald-400/20"
            animate={{ rotate: -360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />

          {/* Pulsing glow */}
          <motion.div
            className="absolute inset-4 rounded-full bg-emerald-500/10"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          {/* Logo with 3D flip animation */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ 
              rotateY: [0, 360],
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              ease: "easeInOut",
              repeatDelay: 1
            }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <motion.div
              className="text-3xl font-black text-emerald-400"
              animate={{
                textShadow: [
                  '0 0 10px rgba(52, 211, 153, 0.5)',
                  '0 0 30px rgba(52, 211, 153, 0.8)',
                  '0 0 10px rgba(52, 211, 153, 0.5)',
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                fontFamily: 'system-ui',
              }}
            >
              W
            </motion.div>
          </motion.div>

          {/* Orbiting dots */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 bg-emerald-400 rounded-full"
              style={{
                top: '50%',
                left: '50%',
              }}
              animate={{
                x: [0, 40, 0, -40, 0].map(v => v * Math.cos(i * (2 * Math.PI / 3))),
                y: [40, 0, -40, 0, 40].map(v => v * Math.sin(i * (2 * Math.PI / 3) + Math.PI/2)),
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        {/* Coming Soon Text */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            className="text-[13px] font-bold tracking-[0.3em] text-white mb-1"
            animate={{
              opacity: [0.7, 1, 0.7],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            COMING SOON
          </motion.div>
          <motion.div 
            className="text-[8px] text-gray-500 tracking-wider"
            animate={{
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            Provider Network Launching
          </motion.div>
        </motion.div>

        {/* Animated loading dots */}
        <div className="flex gap-1 mt-3">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 h-1 bg-emerald-400/50 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </PanelFrame>
  );
}
