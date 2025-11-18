'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none overflow-y-auto"
          >
            <div 
              className="relative w-full max-w-3xl pointer-events-auto my-8 max-h-[90vh] overflow-y-auto"
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
              {/* Gradient overlay */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.08) 0%, transparent 40%, rgba(0, 0, 0, 0.4) 100%)',
                  clipPath: 'inherit',
                }}
              />

              {/* Content */}
              <div className="relative p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold tracking-[0.2em] uppercase">
                    How WHISTLE Works
                  </h2>
                  <button
                    onClick={onClose}
                    className="text-2xl text-gray-400 hover:text-white transition-colors"
                    style={{
                      textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* Explanation Content */}
                <div className="space-y-6 text-sm">
                  
                  {/* Overview */}
                  <div className="p-4 bg-white/5 border border-white/10">
                    <h3 className="text-xs font-semibold tracking-wider uppercase text-gray-400 mb-3">
                      🔥 What is WHISTLE?
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      WHISTLE is a <strong>decentralized RPC provider network</strong> on Solana that gives you self-sovereign access to blockchain data. Instead of relying on centralized providers, you query a distributed network of independent node operators who earn rewards for serving your requests.
                    </p>
                  </div>

                  {/* For Users */}
                  <div className="p-4 bg-black/40 border border-white/10">
                    <h3 className="text-xs font-semibold tracking-wider uppercase text-gray-400 mb-3">
                      👤 For Users (Querying Data)
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="text-white font-bold">1.</span>
                        <div>
                          <strong className="text-white">Connect Your Wallet</strong>
                          <p className="text-gray-400 text-xs mt-1">Use Phantom, Solflare, or any Solana wallet to connect</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-white font-bold">2.</span>
                        <div>
                          <strong className="text-white">Purchase Credits</strong>
                          <p className="text-gray-400 text-xs mt-1">Buy query credits with SOL - 1 SOL = 10,000 credits</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-white font-bold">3.</span>
                        <div>
                          <strong className="text-white">Send Queries</strong>
                          <p className="text-gray-400 text-xs mt-1">Use the Query Interface to fetch blockchain data (balances, transactions, tokens, NFTs)</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-white font-bold">4.</span>
                        <div>
                          <strong className="text-white">Credits Get Distributed</strong>
                          <p className="text-gray-400 text-xs mt-1">Your credits are paid directly to providers who serve your query</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* For Providers */}
                  <div className="p-4 bg-black/40 border border-white/10">
                    <h3 className="text-xs font-semibold tracking-wider uppercase text-gray-400 mb-3">
                      🖥️ For Providers (Running Nodes)
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="text-white font-bold">1.</span>
                        <div>
                          <strong className="text-white">Bond WHISTLE Tokens</strong>
                          <p className="text-gray-400 text-xs mt-1">Lock minimum 1,000 WHISTLE tokens as collateral (gets slashed if you misbehave)</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-white font-bold">2.</span>
                        <div>
                          <strong className="text-white">Run a Solana Archival Node</strong>
                          <p className="text-gray-400 text-xs mt-1">Setup: 2TB NVMe SSD, 64GB RAM, reliable internet (99%+ uptime required)</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-white font-bold">3.</span>
                        <div>
                          <strong className="text-white">Register Your Endpoint</strong>
                          <p className="text-gray-400 text-xs mt-1">Submit your public RPC endpoint URL to the network</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-white font-bold">4.</span>
                        <div>
                          <strong className="text-white">Serve Queries & Earn SOL</strong>
                          <p className="text-gray-400 text-xs mt-1">Get paid instantly for every query you serve - earnings accumulate on-chain</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-white font-bold">5.</span>
                        <div>
                          <strong className="text-white">Build Reputation</strong>
                          <p className="text-gray-400 text-xs mt-1">Higher uptime & faster responses = better reputation = more queries routed to you</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* For Stakers */}
                  <div className="p-4 bg-black/40 border border-white/10">
                    <h3 className="text-xs font-semibold tracking-wider uppercase text-gray-400 mb-3">
                      💰 For Stakers (Passive Income)
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="text-white font-bold">1.</span>
                        <div>
                          <strong className="text-white">Stake WHISTLE Tokens</strong>
                          <p className="text-gray-400 text-xs mt-1">Lock your WHISTLE tokens in the staking contract</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-white font-bold">2.</span>
                        <div>
                          <strong className="text-white">Earn Query Fees</strong>
                          <p className="text-gray-400 text-xs mt-1">Receive a share of all network query fees proportional to your stake</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-white font-bold">3.</span>
                        <div>
                          <strong className="text-white">Compound or Withdraw</strong>
                          <p className="text-gray-400 text-xs mt-1">Claim rewards anytime or compound to increase your earnings</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key Features */}
                  <div className="p-4 bg-white/5 border border-white/10">
                    <h3 className="text-xs font-semibold tracking-wider uppercase text-gray-400 mb-3">
                      ⚡ Key Features
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <strong className="text-white block mb-1">✓ Decentralized</strong>
                        <p className="text-gray-400">No single point of failure</p>
                      </div>
                      <div>
                        <strong className="text-white block mb-1">✓ Censorship Resistant</strong>
                        <p className="text-gray-400">No one can block your queries</p>
                      </div>
                      <div>
                        <strong className="text-white block mb-1">✓ Instant Payments</strong>
                        <p className="text-gray-400">Providers paid on-chain immediately</p>
                      </div>
                      <div>
                        <strong className="text-white block mb-1">✓ Reputation System</strong>
                        <p className="text-gray-400">Rewards quality & uptime</p>
                      </div>
                      <div>
                        <strong className="text-white block mb-1">✓ No KYC Required</strong>
                        <p className="text-gray-400">Fully permissionless access</p>
                      </div>
                      <div>
                        <strong className="text-white block mb-1">✓ Slashing Protection</strong>
                        <p className="text-gray-400">Bad actors lose their bond</p>
                      </div>
                    </div>
                  </div>

                  {/* Economics */}
                  <div className="p-4 bg-black/40 border border-white/10">
                    <h3 className="text-xs font-semibold tracking-wider uppercase text-gray-400 mb-3">
                      📊 Token Economics
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Query Cost:</span>
                        <strong className="text-white">1 credit per standard query</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Staking APY:</span>
                        <strong className="text-white">Variable (based on network usage)</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Fee Distribution:</span>
                        <strong className="text-white">80% Providers, 15% Stakers, 5% Treasury</strong>
                      </div>
                    </div>
                  </div>

                  {/* Getting Started */}
                  <div className="p-4 bg-gradient-to-br from-white/10 to-white/5 border border-white/20">
                    <h3 className="text-xs font-semibold tracking-wider uppercase text-white mb-3">
                      🚀 Ready to Get Started?
                    </h3>
                    <div className="space-y-2 text-xs text-gray-300">
                      <p><strong>As a User:</strong> Connect your wallet (top center) and buy credits</p>
                      <p><strong>As a Provider:</strong> Visit the Provider Dashboard to register your node</p>
                      <p><strong>As a Staker:</strong> Go to the Staking panel to start earning passive income</p>
                    </div>
                  </div>

                </div>

                {/* Close Button */}
                <div className="mt-6">
                  <button
                    onClick={onClose}
                    className="btn-primary w-full"
                  >
                    Got It!
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

