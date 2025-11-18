'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface OurPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OurPlansModal({ isOpen, onClose }: OurPlansModalProps) {
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
            className="fixed inset-0 z-50"
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ pointerEvents: 'none' }}
          >
            <div 
              className="relative w-full max-w-4xl bg-black border border-white/15 flex flex-col"
              style={{
                maxHeight: '90vh',
                height: '90vh',
                pointerEvents: 'auto',
                clipPath: 'polygon(20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px), 0 20px)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-8 pb-4 border-b border-white/10 flex-shrink-0">
                <h2 className="text-3xl font-bold tracking-[0.2em] uppercase">
                  OUR PLANS
                </h2>
                <button
                  onClick={onClose}
                  className="text-3xl text-gray-400 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-8" style={{ minHeight: 0 }}>
                <div className="space-y-6 text-sm">
                  
                  {/* Vision Statement */}
                  <div className="p-8 bg-white/5 border border-white/10">
                    <h3 className="text-2xl font-bold mb-4 tracking-wider">THE ROAD TO COMPLETE DECENTRALIZATION</h3>
                    <p className="text-gray-300 leading-relaxed text-lg">
                      Whistlenet is not just another project. It's the foundation of a movement to reclaim blockchain infrastructure from centralized control. This is our roadmap from vision to reality.
                    </p>
                  </div>

                  {/* Origin Story */}
                  <div className="p-6 bg-black/40 border border-white/10">
                    <h3 className="text-xl font-bold mb-4 tracking-wider">WHERE WE CAME FROM: GHOST WHISTLE</h3>
                    <div className="space-y-4 text-gray-300 leading-relaxed">
                      <p>
                        Our journey began with <strong className="text-white">Ghost Whistle</strong>, an experimental project focused on privacy-preserving communication protocols on Solana. Through Ghost Whistle, we discovered a critical vulnerability in the blockchain ecosystem: <strong className="text-white">nearly all projects rely on centralized RPC providers.</strong>
                      </p>
                      <p>
                        We realized that no matter how decentralized a blockchain is, if users must route through Alchemy, Infura, or Quicknode to access it, the entire system has a centralized chokepoint. Privacy, censorship resistance, and permissionless access become meaningless if a single company can deny you service.
                      </p>
                      <p>
                        <strong className="text-white">This realization became our mission:</strong> Build the infrastructure layer that the entire blockchain ecosystem needs but doesn't have—a truly decentralized RPC network.
                      </p>
                    </div>
                  </div>

                  {/* What We've Built */}
                  <div className="p-6 bg-white/5 border border-white/10">
                    <h3 className="text-xl font-bold mb-4 tracking-wider">WHAT WE'VE BUILT: PHASE 1 COMPLETE</h3>
                    <div className="space-y-4">
                      <p className="text-gray-300 leading-relaxed">
                        Whistlenet Phase 1 represents the foundational infrastructure layer. We've successfully deployed:
                      </p>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="p-4 bg-black/40 border border-white/10">
                          <strong className="text-white text-lg block mb-2">SMART CONTRACT ARCHITECTURE</strong>
                          <p className="text-gray-300 text-sm">
                            On-chain staking, provider registration, payment distribution, governance framework, and developer rebate system—all deployed and verified on Solana mainnet.
                          </p>
                        </div>
                        <div className="p-4 bg-black/40 border border-white/10">
                          <strong className="text-white text-lg block mb-2">ECONOMIC MODEL</strong>
                          <p className="text-gray-300 text-sm">
                            70/20/5/5 query fee split. Pay-per-query model eliminates subscriptions. Stakers earn from real network usage, not inflation.
                          </p>
                        </div>
                        <div className="p-4 bg-black/40 border border-white/10">
                          <strong className="text-white text-lg block mb-2">PROVIDER FRAMEWORK</strong>
                          <p className="text-gray-300 text-sm">
                            Bond-based registration system, reputation scoring, slashing mechanisms, and heartbeat monitoring for quality assurance.
                          </p>
                        </div>
                        <div className="p-4 bg-black/40 border border-white/10">
                          <strong className="text-white text-lg block mb-2">GOVERNANCE SYSTEM</strong>
                          <p className="text-gray-300 text-sm">
                            Access token voting (1 WHISTLE = 1,000 votes). Community-driven parameter changes. Transparent on-chain decision making.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* What We're Building Now */}
                  <div className="p-6 bg-black/40 border border-white/10">
                    <h3 className="text-xl font-bold mb-4 tracking-wider">WHAT WE'RE BUILDING: PHASE 2 IN PROGRESS</h3>
                    <div className="space-y-4 text-gray-300 leading-relaxed">
                      <p>
                        <strong className="text-white">Current Focus: Provider Network Expansion & Frontend Tooling</strong>
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="text-white mt-0.5">—</span>
                          <div>
                            <strong className="text-white block mb-1">Provider SDK & Documentation</strong>
                            <p className="text-gray-400 text-xs">
                              Simplifying node operator onboarding with comprehensive guides, automated setup scripts, and monitoring tools.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-white mt-0.5">—</span>
                          <div>
                            <strong className="text-white block mb-1">Query Routing Layer</strong>
                            <p className="text-gray-400 text-xs">
                              Intelligent load balancing based on provider reputation, latency, and geographic proximity. Automatic failover for reliability.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-white mt-0.5">—</span>
                          <div>
                            <strong className="text-white block mb-1">Developer Tools & SDKs</strong>
                            <p className="text-gray-400 text-xs">
                              JavaScript, Python, and Rust libraries for seamless integration. Drop-in replacement for existing RPC endpoints.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-white mt-0.5">—</span>
                          <div>
                            <strong className="text-white block mb-1">Network Incentive Programs</strong>
                            <p className="text-gray-400 text-xs">
                              Provider grants, early staker bonuses, and developer partnerships to bootstrap network effects.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Why Whistlenet First */}
                  <div className="p-6 bg-black/40 border border-white/10">
                    <h3 className="text-xl font-bold mb-4 tracking-wider">WHY START WITH WHISTLENET?</h3>
                    <div className="space-y-4 text-gray-300 leading-relaxed">
                      <p>
                        <strong className="text-white">Strategic Foundation:</strong> Decentralized RPC infrastructure is the missing piece in blockchain's decentralization story. No matter how decentralized your blockchain or dApp is, if you're accessing it through centralized providers, you're vulnerable.
                      </p>
                      <p>
                        <strong className="text-white">Proven Demand:</strong> Every blockchain project needs RPC access. The market exists, the problem is real, and the incumbents are vulnerable to disruption through superior economics and censorship resistance.
                      </p>
                      <p>
                        <strong className="text-white">Network Effects:</strong> Once Whistlenet establishes itself on Solana, expansion to other chains becomes exponentially easier. Providers can add support for new chains with minimal effort, stakers benefit from increased usage, and the economic model scales perfectly.
                      </p>
                      <p>
                        <strong className="text-white">Philosophy:</strong> Infrastructure is the foundation. By decentralizing the access layer first, we enable every other project to be truly permissionless. Whistlenet is not the end goal—it's the enabler for everything else.
                      </p>
                    </div>
                  </div>

                  {/* Call to Action */}
                  <div className="p-8 bg-black/40 border-2 border-white/20">
                    <h3 className="text-2xl font-bold mb-4 tracking-wider text-center">JOIN US ON THIS JOURNEY</h3>
                    <p className="text-gray-300 leading-relaxed text-center mb-4">
                      This is more than a roadmap—it's a commitment to building infrastructure that will outlive us all. Infrastructure that can't be shut down, censored, or controlled. Infrastructure that serves as a public good for the entire blockchain ecosystem.
                    </p>
                    <div className="text-center text-white font-bold text-lg">
                      FROM GHOST WHISTLE TO GLOBAL INFRASTRUCTURE
                    </div>
                    <div className="text-center text-gray-400 text-sm mt-2">
                      One block at a time. One provider at a time. One stake at a time.
                    </div>
                  </div>

                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 flex items-center justify-between flex-shrink-0">
                <div className="text-[10px] text-gray-500">
                  Whistlenet - Building Decentralized Infrastructure
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



