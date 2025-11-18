'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface WhyStakeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WhyStakeModal({ isOpen, onClose }: WhyStakeModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
              background: 'rgba(0, 0, 0, 0.95)',
              backdropFilter: 'blur(10px)',
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div 
              className="relative w-full max-w-4xl pointer-events-auto"
              style={{
                background: 'linear-gradient(135deg, rgba(22, 22, 22, 0.98) 0%, rgba(12, 12, 12, 0.98) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(30px)',
                boxShadow: `
                  0 30px 100px rgba(0, 0, 0, 0.95),
                  0 15px 50px rgba(0, 0, 0, 0.85),
                  0 8px 25px rgba(0, 0, 0, 0.75),
                  inset 0 1px 0 rgba(255, 255, 255, 0.2),
                  inset 0 -1px 0 rgba(0, 0, 0, 0.9)
                `,
                clipPath: 'polygon(20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px), 0 20px)',
              }}
            >
              {/* Content */}
              <div className="relative p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold tracking-[0.2em] uppercase">
                    WHY STAKE WHISTLE?
                  </h2>
                  <button
                    onClick={onClose}
                    className="text-3xl text-gray-400 hover:text-white transition-colors"
                    style={{
                      textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* Benefits Grid */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  {/* Benefit 1 */}
                  <div className="p-6 bg-white/5 border border-white/10">
                    <h3 className="text-xl font-bold mb-3">EARN REAL REWARDS</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Stakers receive 5% of all query fees in SOL. As network usage grows, so do your rewards.
                    </p>
                  </div>

                  {/* Benefit 2 */}
                  <div className="p-6 bg-white/5 border border-white/10">
                    <h3 className="text-xl font-bold mb-3">GOVERNANCE POWER</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Your stake = voting power. Shape the future of Whistlenet through on-chain governance.
                    </p>
                  </div>

                  {/* Benefit 3 */}
                  <div className="p-6 bg-white/5 border border-white/10">
                    <h3 className="text-xl font-bold mb-3">SECURE THE NETWORK</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Your stake helps maintain network security and decentralization. No validators, no inflation.
                    </p>
                  </div>

                  {/* Benefit 4 */}
                  <div className="p-6 bg-white/5 border border-white/10">
                    <h3 className="text-xl font-bold mb-3">UNSTAKE ANYTIME</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Flexible staking with 3-day cooldown. Your funds, your control. No lockup periods.
                    </p>
                  </div>
                </div>

                {/* The Vision */}
                <div className="p-6 bg-black/40 border border-white/10 mb-8">
                  <h3 className="text-xl font-bold mb-4 tracking-wider">THE FIGHT FOR DECENTRALIZATION</h3>
                  <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
                    <p>
                      Whistlenet is not just another blockchain project. We're building the infrastructure 
                      for a truly decentralized internet, starting with RPC services and expanding to VPN, 
                      browser, OS, and eventually hardware.
                    </p>
                    <p>
                      Every WHISTLE you stake is a vote against centralized control. You're not just earning 
                      rewards—you're funding the revolution against surveillance capitalism and corporate 
                      data monopolies.
                    </p>
                    <p>
                      The networks of tomorrow will be owned by their users, not corporations. 
                      This is your chance to be part of that future from day one.
                    </p>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-white/5 border border-white/10">
                    <div className="text-2xl font-bold mb-1">5%</div>
                    <div className="text-xs text-gray-500 tracking-wider">QUERY FEES TO STAKERS</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 border border-white/10">
                    <div className="text-2xl font-bold mb-1">1:1000</div>
                    <div className="text-xs text-gray-500 tracking-wider">STAKE TO VOTING POWER</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 border border-white/10">
                    <div className="text-2xl font-bold mb-1">3 DAYS</div>
                    <div className="text-xs text-gray-500 tracking-wider">UNSTAKE COOLDOWN</div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 flex items-center justify-between">
                <div className="text-[10px] text-gray-500">
                  Whistlenet • Decentralized Infrastructure • User-Owned Network
                </div>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all text-sm font-semibold tracking-wider"
                  style={{
                    clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
                  }}
                >
                  CLOSE
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

