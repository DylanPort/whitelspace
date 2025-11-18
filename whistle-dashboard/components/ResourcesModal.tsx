'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface ResourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ResourcesModal({ isOpen, onClose }: ResourcesModalProps) {
  const [activeTab, setActiveTab] = useState<'cryptwhistle' | 'guides' | 'ghost-calls'>('cryptwhistle');

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
              className="relative w-full h-full max-w-[98vw] max-h-[98vh] bg-black border border-white/15 flex flex-col"
              style={{
                pointerEvents: 'auto',
                clipPath: 'polygon(20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px), 0 20px)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0 bg-black/90">
                <div>
                  <h2 className="text-xl font-bold tracking-[0.2em] uppercase">
                    CRYPTWHISTLE AI
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">AI DOCUMENTATION & GUIDES</p>
                </div>
                <button
                  onClick={onClose}
                  className="text-3xl text-gray-400 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/10 flex-shrink-0 bg-black/90">
                <button
                  onClick={() => setActiveTab('cryptwhistle')}
                  className={`px-6 py-3 text-sm font-semibold tracking-wider transition-all ${
                    activeTab === 'cryptwhistle'
                      ? 'bg-white/10 text-white border-b-2 border-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  CRYPTWHISTLE AI DOCS
                </button>
                <button
                  onClick={() => setActiveTab('guides')}
                  className={`px-6 py-3 text-sm font-semibold tracking-wider transition-all ${
                    activeTab === 'guides'
                      ? 'bg-white/10 text-white border-b-2 border-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  GUIDES & TUTORIALS
                </button>
                <button
                  onClick={() => setActiveTab('ghost-calls')}
                  className={`px-6 py-3 text-sm font-semibold tracking-wider transition-all ${
                    activeTab === 'ghost-calls'
                      ? 'bg-white/10 text-white border-b-2 border-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  GHOST CALLS
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 relative overflow-hidden">
                {activeTab === 'cryptwhistle' && (
                  <iframe
                    src="/cryptwhistle-docs/index.html"
                    className="w-full h-full border-0"
                    title="CryptWhistle AI Documentation"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                    style={{ background: '#000' }}
                  />
                )}

                {activeTab === 'guides' && (
                  <div className="w-full h-full overflow-y-auto p-8 space-y-6">
                    <div className="prose prose-invert max-w-none">
                      <h1 className="text-3xl font-bold mb-6">GUIDES & TUTORIALS</h1>
                      
                      {/* Whistlenet Guides */}
                      <div className="p-6 bg-white/5 border border-white/10 mb-6">
                        <h2 className="text-2xl font-bold mb-4">WHISTLENET GUIDES</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <a 
                            href="/docs/guides/RUN-10-NODES.md" 
                            target="_blank"
                            className="p-4 bg-black/40 border border-white/10 hover:border-white/30 transition-all"
                          >
                            <h3 className="text-lg font-bold text-white mb-2">Run 10 Nodes</h3>
                            <p className="text-gray-400 text-sm">Complete guide to running multiple Whistlenet nodes</p>
                          </a>
                          
                          <div className="p-4 bg-black/40 border border-white/10">
                            <h3 className="text-lg font-bold text-white mb-2">Connect Wallet</h3>
                            <p className="text-gray-400 text-sm mb-3">Step-by-step wallet connection guide</p>
                            <img src="/docs/guides/connectwallet.jpg" alt="Connect Wallet Guide" className="w-full rounded border border-white/10" />
                          </div>
                          
                          <div className="p-4 bg-black/40 border border-white/10">
                            <h3 className="text-lg font-bold text-white mb-2">Stake WHISTLE</h3>
                            <p className="text-gray-400 text-sm mb-3">How to stake your WHISTLE tokens</p>
                            <img src="/docs/guides/stake.jpg" alt="Staking Guide" className="w-full rounded border border-white/10" />
                          </div>
                          
                          <div className="p-4 bg-black/40 border border-white/10">
                            <h3 className="text-lg font-bold text-white mb-2">Earn Rewards</h3>
                            <p className="text-gray-400 text-sm mb-3">Guide to earning rewards on Whistlenet</p>
                            <img src="/docs/guides/earn.jpg" alt="Earn Rewards Guide" className="w-full rounded border border-white/10" />
                          </div>
                          
                          <div className="p-4 bg-black/40 border border-white/10">
                            <h3 className="text-lg font-bold text-white mb-2">Run a Node</h3>
                            <p className="text-gray-400 text-sm mb-3">Complete node setup and operation guide</p>
                            <img src="/docs/guides/run_node.jpg" alt="Run Node Guide" className="w-full rounded border border-white/10" />
                          </div>
                        </div>
                      </div>

                      {/* Contract Documentation */}
                      <div className="p-6 bg-black/40 border border-white/10 mb-6">
                        <h2 className="text-2xl font-bold mb-4">SMART CONTRACT DOCUMENTATION</h2>
                        <div className="space-y-3">
                          <a 
                            href="https://github.com" 
                            target="_blank"
                            className="block p-4 bg-white/5 border border-white/10 hover:border-white/30 transition-all"
                          >
                            <h3 className="text-lg font-bold text-white mb-1">Developer Guide</h3>
                            <p className="text-gray-400 text-sm">Complete developer documentation for Whistlenet smart contracts</p>
                          </a>
                          
                          <a 
                            href="https://github.com" 
                            target="_blank"
                            className="block p-4 bg-white/5 border border-white/10 hover:border-white/30 transition-all"
                          >
                            <h3 className="text-lg font-bold text-white mb-1">Security Audit</h3>
                            <p className="text-gray-400 text-sm">Security audit reports and vulnerability assessments</p>
                          </a>
                          
                          <a 
                            href="https://github.com" 
                            target="_blank"
                            className="block p-4 bg-white/5 border border-white/10 hover:border-white/30 transition-all"
                          >
                            <h3 className="text-lg font-bold text-white mb-1">Implementation Summary</h3>
                            <p className="text-gray-400 text-sm">Technical implementation details and architecture</p>
                          </a>
                        </div>
                      </div>

                      {/* Platform Updates */}
                      <div className="p-6 bg-white/5 border border-white/10">
                        <h2 className="text-2xl font-bold mb-4">PLATFORM STATUS & UPDATES</h2>
                        <div className="space-y-3">
                          <div className="p-4 bg-black/40 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <h3 className="text-lg font-bold text-white">Whistlenet Mainnet</h3>
                            </div>
                            <p className="text-gray-400 text-sm">✅ Live on Solana Mainnet</p>
                            <p className="text-gray-400 text-xs mt-1">Program ID: whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr</p>
                          </div>
                          
                          <div className="p-4 bg-black/40 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <h3 className="text-lg font-bold text-white">Staking Pool</h3>
                            </div>
                            <p className="text-gray-400 text-sm">✅ Active & Accepting Stakes</p>
                            <p className="text-gray-400 text-xs mt-1">Pool PDA: 6Ls9QVrP3K35TdQ8dbSJAp1L48tsYFvcbixsXXL9KDAB</p>
                          </div>
                          
                          <div className="p-4 bg-black/40 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                              <h3 className="text-lg font-bold text-white">Provider Network</h3>
                            </div>
                            <p className="text-gray-400 text-sm">⚡ Expanding - Registration Open</p>
                            <p className="text-gray-400 text-xs mt-1">Register as a provider to earn rewards</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'ghost-calls' && (
                  <div className="w-full h-full overflow-y-auto p-8">
                    <div className="prose prose-invert max-w-none space-y-6">
                      <h1 className="text-3xl font-bold mb-6">GHOST CALLS DOCUMENTATION</h1>
                      
                      <div className="p-6 bg-white/5 border border-white/10">
                        <h2 className="text-2xl font-bold mb-4">GHOST CALLS GUIDE</h2>
                        <p className="text-gray-300 mb-4">
                          Ghost Calls is our privacy-preserving communication protocol that enables anonymous, encrypted voice and video calls over the Whistlenet infrastructure.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <a 
                            href="/docs/ghost-calls/GHOST-CALLS-GUIDE.md" 
                            target="_blank"
                            className="p-4 bg-black/40 border border-white/10 hover:border-white/30 transition-all"
                          >
                            <h3 className="text-lg font-bold text-white mb-2">Complete Guide</h3>
                            <p className="text-gray-400 text-sm">Full documentation for Ghost Calls setup and usage</p>
                          </a>
                          
                          <a 
                            href="/docs/ghost-calls/GHOST-CALLS-BLANK-FIX.md" 
                            target="_blank"
                            className="p-4 bg-black/40 border border-white/10 hover:border-white/30 transition-all"
                          >
                            <h3 className="text-lg font-bold text-white mb-2">Troubleshooting</h3>
                            <p className="text-gray-400 text-sm">Common issues and fixes for Ghost Calls</p>
                          </a>
                        </div>
                      </div>

                      <div className="p-6 bg-black/40 border border-white/10">
                        <h2 className="text-2xl font-bold mb-4">KEY FEATURES</h2>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <span className="text-green-400 mt-1">✓</span>
                            <div>
                              <strong className="text-white block mb-1">End-to-End Encryption</strong>
                              <p className="text-gray-400 text-sm">All calls are encrypted using military-grade encryption protocols</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3">
                            <span className="text-green-400 mt-1">✓</span>
                            <div>
                              <strong className="text-white block mb-1">Anonymous Routing</strong>
                              <p className="text-gray-400 text-sm">Calls are routed through Whistlenet's decentralized network for maximum privacy</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3">
                            <span className="text-green-400 mt-1">✓</span>
                            <div>
                              <strong className="text-white block mb-1">No Registration Required</strong>
                              <p className="text-gray-400 text-sm">Connect with your Solana wallet - no email, phone, or personal data required</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3">
                            <span className="text-green-400 mt-1">✓</span>
                            <div>
                              <strong className="text-white block mb-1">Decentralized Infrastructure</strong>
                              <p className="text-gray-400 text-sm">No central servers - your calls can't be intercepted or monitored</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-white/5 border border-white/10">
                        <h2 className="text-2xl font-bold mb-4">GETTING STARTED</h2>
                        <ol className="list-decimal list-inside space-y-3 text-gray-300">
                          <li className="mb-2">
                            <strong className="text-white">Connect Your Wallet</strong>
                            <p className="ml-6 text-sm text-gray-400">Use any Solana-compatible wallet (Phantom, Solflare, etc.)</p>
                          </li>
                          <li className="mb-2">
                            <strong className="text-white">Access Ghost Calls</strong>
                            <p className="ml-6 text-sm text-gray-400">Navigate to the Ghost Calls section from the main menu</p>
                          </li>
                          <li className="mb-2">
                            <strong className="text-white">Start a Call</strong>
                            <p className="ml-6 text-sm text-gray-400">Enter a recipient's Solana address or select from contacts</p>
                          </li>
                          <li className="mb-2">
                            <strong className="text-white">Enjoy Privacy</strong>
                            <p className="ml-6 text-sm text-gray-400">Your call is now encrypted and routed through Whistlenet</p>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-white/10 flex items-center justify-between flex-shrink-0 bg-black/90">
                <div className="text-[10px] text-gray-500">
                  CryptWhistle AI • {activeTab === 'cryptwhistle' ? 'Documentation' : activeTab === 'guides' ? 'Guides & Tutorials' : 'Ghost Calls'}
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all text-xs font-semibold tracking-wider"
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


