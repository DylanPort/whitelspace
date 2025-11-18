'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'staking' | 'providers' | 'developers' | 'economy'>('overview');

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
              className="relative w-full max-w-5xl bg-black border border-white/15 flex flex-col"
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
                  WHISTLENET DOCUMENTATION
                  </h2>
                  <button
                    onClick={onClose}
                  className="text-3xl text-gray-400 hover:text-white transition-colors"
                  >
                    ×
                  </button>
                </div>

              {/* Tab Navigation */}
              <div className="flex gap-2 px-8 pt-4 border-b border-white/10 flex-shrink-0">
                {[
                  { id: 'overview', label: 'OVERVIEW' },
                  { id: 'staking', label: 'STAKING' },
                  { id: 'providers', label: 'PROVIDERS' },
                  { id: 'developers', label: 'DEVELOPERS' },
                  { id: 'economy', label: 'ECONOMY' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2 text-[10px] font-semibold tracking-wider uppercase transition-all ${
                      activeTab === tab.id
                        ? 'bg-white/10 text-white border-t-2 border-white'
                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-8" style={{ minHeight: 0 }}>
                
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                <div className="space-y-6 text-sm">
                    <div className="p-6 bg-white/5 border border-white/10">
                      <h3 className="text-xl font-bold mb-4 tracking-wider">What is Whistlenet?</h3>
                      <p className="text-gray-300 leading-relaxed mb-4">
                        <strong className="text-white">Whistlenet</strong> is a <strong>decentralized RPC provider network</strong> built on Solana that gives you self-sovereign access to blockchain data. Instead of relying on centralized providers like Alchemy or Quicknode, you query a distributed network of independent node operators who earn rewards for serving your requests.
                      </p>
                      <p className="text-gray-300 leading-relaxed mb-4">
                        The network is powered by <strong className="text-white">$WHISTLE</strong> tokens, which are used for staking and provider bonds.
                      </p>
                    <p className="text-gray-300 leading-relaxed">
                        <strong className="text-white">How payments work:</strong> Users pay <strong>0.00001 SOL per query</strong> directly on-chain. Each payment is instantly split: 70% to the provider serving your query, 20% to a bonus pool for top performers, 5% to stakers, and 5% to treasury. No middlemen, no subscriptions—just pay-per-query with immediate settlement.
                    </p>
                  </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-black/40 border border-white/10">
                        <div className="text-[10px] text-gray-500 tracking-wider mb-2">QUERY COST</div>
                        <div className="text-2xl font-bold mb-1">0.00001 SOL</div>
                        <div className="text-[10px] text-gray-400">Per standard RPC query</div>
                      </div>
                      <div className="p-4 bg-black/40 border border-white/10">
                        <div className="text-[10px] text-gray-500 tracking-wider mb-2">MIN PROVIDER BOND</div>
                        <div className="text-2xl font-bold mb-1">1,000 WHISTLE</div>
                        <div className="text-[10px] text-gray-400">Required to run a node</div>
                      </div>
                      <div className="p-4 bg-black/40 border border-white/10">
                        <div className="text-[10px] text-gray-500 tracking-wider mb-2">MIN STAKE</div>
                        <div className="text-2xl font-bold mb-1">100 WHISTLE</div>
                        <div className="text-[10px] text-gray-400">Start earning rewards</div>
                      </div>
                  <div className="p-4 bg-black/40 border border-white/10">
                        <div className="text-[10px] text-gray-500 tracking-wider mb-2">COOLDOWN PERIOD</div>
                        <div className="text-2xl font-bold mb-1">24 Hours</div>
                        <div className="text-[10px] text-gray-400">To unstake tokens</div>
                      </div>
                    </div>

                    <div className="p-6 bg-black/40 border border-white/10">
                      <h3 className="text-lg font-bold mb-4 tracking-wider">How Query Payments Work</h3>
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold text-xs">1</div>
                          <div className="flex-1">
                            <strong className="text-white block mb-1">User Sends Query</strong>
                            <p className="text-gray-400 text-xs">User calls ProcessQueryPayment instruction with 0.00001 SOL</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold text-xs">2</div>
                          <div className="flex-1">
                            <strong className="text-white block mb-1">SOL Sent to Payment Vault</strong>
                            <p className="text-gray-400 text-xs">Payment transferred on-chain to the vault PDA</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold text-xs">3</div>
                          <div className="flex-1">
                            <strong className="text-white block mb-1">Automatic Split (70/20/5/5)</strong>
                            <p className="text-gray-400 text-xs">Smart contract distributes to 4 pools instantly</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold text-xs">4</div>
                          <div className="flex-1">
                            <strong className="text-white block mb-1">Provider Credits Updated</strong>
                            <p className="text-gray-400 text-xs">Provider's pending_earnings increased by 70% (0.000007 SOL)</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold text-xs">5</div>
                          <div className="flex-1">
                            <strong className="text-white block mb-1">Query Counter Increments</strong>
                            <p className="text-gray-400 text-xs">Provider's queries_served count goes up</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold text-xs">6</div>
                          <div className="flex-1">
                            <strong className="text-white block mb-1">Provider Serves Data</strong>
                            <p className="text-gray-400 text-xs">Provider's RPC node returns the requested blockchain data</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-white/5 border border-white/10 text-xs">
                        <strong className="text-white block mb-1">No Subscriptions or Pre-Payment</strong>
                        <p className="text-gray-400">Every query is paid individually on-chain. You only pay for what you use, when you use it.</p>
                      </div>
                    </div>

                    <div className="p-6 bg-white/5 border border-white/10">
                      <h3 className="text-lg font-bold mb-4 tracking-wider">Key Features</h3>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <strong className="text-white block mb-1">Decentralized Network</strong>
                          <p className="text-gray-400">No single point of failure or control</p>
                        </div>
                        <div>
                          <strong className="text-white block mb-1">Censorship Resistant</strong>
                          <p className="text-gray-400">No one can block your queries</p>
                        </div>
                        <div>
                          <strong className="text-white block mb-1">Instant Settlements</strong>
                          <p className="text-gray-400">All payments on-chain and immediate</p>
                      </div>
                        <div>
                          <strong className="text-white block mb-1">Reputation System</strong>
                          <p className="text-gray-400">Quality providers get more queries</p>
                        </div>
                        <div>
                          <strong className="text-white block mb-1">No KYC Required</strong>
                          <p className="text-gray-400">Fully permissionless participation</p>
                      </div>
                        <div>
                          <strong className="text-white block mb-1">Slashing Mechanism</strong>
                          <p className="text-gray-400">Bad actors lose their bond</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STAKING TAB */}
                {activeTab === 'staking' && (
                  <div className="space-y-6 text-sm">
                    <div className="p-6 bg-white/5 border border-white/10">
                      <h3 className="text-xl font-bold mb-4 tracking-wider">Stake and Earn Passive Income</h3>
                      <p className="text-gray-300 leading-relaxed mb-4">
                        Staking WHISTLE tokens allows you to earn a share of network query fees without running any infrastructure. Simply lock your tokens in the staking contract and receive proportional rewards from all network activity.
                      </p>
                      <p className="text-gray-300 leading-relaxed">
                        <strong className="text-white">How earnings work:</strong> When users pay for queries, 5% of each payment (0.0000005 SOL per query) goes to the staker rewards pool. This pool is distributed proportionally to all stakers based on their stake amount. The more WHISTLE you stake, the larger your share of the pool.
                      </p>
                  </div>

                    <div className="p-6 bg-black/40 border border-white/10">
                      <h3 className="text-lg font-bold mb-4 tracking-wider">How to Stake</h3>
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold text-xs">1</div>
                          <div className="flex-1">
                            <strong className="text-white block mb-1">Connect Your Wallet</strong>
                            <p className="text-gray-400 text-xs">Use any Solana wallet (Phantom, Solflare, Backpack, etc.)</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold text-xs">2</div>
                          <div className="flex-1">
                            <strong className="text-white block mb-1">Enter Stake Amount</strong>
                            <p className="text-gray-400 text-xs">Minimum 100 WHISTLE, maximum 10,000,000 WHISTLE per wallet</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold text-xs">3</div>
                          <div className="flex-1">
                            <strong className="text-white block mb-1">Earn Voting Power</strong>
                            <p className="text-gray-400 text-xs">Receive 1,000 access tokens per 1 WHISTLE staked (1:1000 ratio) for governance voting</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold text-xs">4</div>
                          <div className="flex-1">
                            <strong className="text-white block mb-1">Accumulate Rewards</strong>
                            <p className="text-gray-400 text-xs">Earn 5% of all network query fees, distributed proportionally to your stake</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold text-xs">5</div>
                          <div className="flex-1">
                            <strong className="text-white block mb-1">Claim or Compound</strong>
                            <p className="text-gray-400 text-xs">Withdraw rewards anytime or restake to compound your earnings</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-black/40 border border-white/10">
                        <div className="text-[10px] text-gray-500 tracking-wider mb-2">VOTING POWER</div>
                        <div className="text-lg font-bold mb-1">1 WHISTLE = 1,000 Votes</div>
                        <div className="text-[10px] text-gray-400">Participate in governance decisions</div>
                      </div>
                      <div className="p-4 bg-black/40 border border-white/10">
                        <div className="text-[10px] text-gray-500 tracking-wider mb-2">COOLDOWN</div>
                        <div className="text-lg font-bold mb-1">24 Hours</div>
                        <div className="text-[10px] text-gray-400">Wait period to unstake</div>
                      </div>
                    </div>

                    <div className="p-4 bg-white/5 border border-white/10">
                      <strong className="text-white block mb-1 text-xs">Important Notes:</strong>
                      <ul className="text-gray-400 text-[10px] space-y-1">
                        <li>• You must wait 24 hours after staking before you can unstake</li>
                        <li>• Your tokens are locked during the cooldown period</li>
                        <li>• Rewards accumulate while staked and during cooldown</li>
                        <li>• Rate is unlocked - can change based on network governance</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* PROVIDERS TAB */}
                {activeTab === 'providers' && (
                  <div className="space-y-6 text-sm">
                    <div className="p-6 bg-white/5 border border-white/10">
                      <h3 className="text-xl font-bold mb-4 tracking-wider">Run a Provider Node and Earn SOL</h3>
                      <p className="text-gray-300 leading-relaxed">
                        Providers are the backbone of Whistlenet. By running a Solana RPC node and serving queries, you earn <strong className="text-white">70% of all query fees</strong> paid by users. Top performers also receive bonus rewards from the 20% bonus pool.
                      </p>
                    </div>

                    <div className="p-6 bg-black/40 border border-white/10">
                      <h3 className="text-lg font-bold mb-4 tracking-wider">How to Become a Provider</h3>
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold text-xs">1</div>
                          <div className="flex-1">
                            <strong className="text-white block mb-1">Setup Solana Archival Node</strong>
                            <p className="text-gray-400 text-xs mb-2">Full historical data access required</p>
                            <div className="text-[10px] text-gray-500 space-y-1">
                              <div>• 2TB+ NVMe SSD storage</div>
                              <div>• 64GB RAM (recommended)</div>
                              <div>• 99%+ uptime required</div>
                              <div>• Stable, high-speed internet</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold text-xs">2</div>
                          <div className="flex-1">
                            <strong className="text-white block mb-1">Bond WHISTLE Tokens</strong>
                            <p className="text-gray-400 text-xs">Lock minimum 1,000 WHISTLE as collateral (slashed if you misbehave)</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold text-xs">3</div>
                          <div className="flex-1">
                            <strong className="text-white block mb-1">Register Your Endpoint</strong>
                            <p className="text-gray-400 text-xs">Submit your public RPC URL (HTTPS/WSS) to the smart contract</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold text-xs">4</div>
                          <div className="flex-1">
                            <strong className="text-white block mb-1">Send Heartbeats</strong>
                            <p className="text-gray-400 text-xs">Regular pings to prove your node is online and responding</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold text-xs">5</div>
                          <div className="flex-1">
                            <strong className="text-white block mb-1">Serve Queries and Earn</strong>
                            <p className="text-gray-400 text-xs">Get paid 0.000007 SOL per query (70% of 0.00001 SOL)</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-black/40 border border-white/10">
                      <h3 className="text-lg font-bold mb-4 tracking-wider">Reputation System</h3>
                      <p className="text-gray-300 mb-4 text-xs">Your reputation score determines how many queries get routed to your node:</p>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <strong className="text-white block mb-1">Uptime Percentage</strong>
                          <p className="text-gray-400">Higher uptime = better score</p>
                        </div>
                        <div>
                          <strong className="text-white block mb-1">Response Time</strong>
                          <p className="text-gray-400">Faster responses = more queries</p>
                        </div>
                        <div>
                          <strong className="text-white block mb-1">Accuracy</strong>
                          <p className="text-gray-400">Correct data = trust and rewards</p>
                      </div>
                        <div>
                          <strong className="text-white block mb-1">Queries Served</strong>
                          <p className="text-gray-400">Track record matters</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-white/5 border border-white/10">
                      <strong className="text-white block mb-1 text-xs">Slashing Conditions:</strong>
                      <ul className="text-gray-400 text-[10px] space-y-1">
                        <li>• Extended downtime (more than 24h offline)</li>
                        <li>• Serving incorrect or malicious data</li>
                        <li>• Excessive response times</li>
                        <li>• Failing heartbeat checks repeatedly</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* DEVELOPERS TAB */}
                {activeTab === 'developers' && (
                  <div className="space-y-6 text-sm">
                    <div className="p-6 bg-white/5 border border-white/10">
                      <h3 className="text-xl font-bold mb-4 tracking-wider">Developer Rebate Program</h3>
                      <p className="text-gray-300 leading-relaxed">
                        Developers who stake WHISTLE tokens receive <strong className="text-white">cashback on query fees</strong> based on their tier. The more you stake, the higher your rebate percentage - up to <strong className="text-white">100% free queries</strong> at the Whale tier.
                      </p>
                  </div>

                    <div className="p-6 bg-black/40 border border-white/10">
                      <h3 className="text-lg font-bold mb-4 tracking-wider">Developer Tiers</h3>
                    <div className="space-y-3">
                        <div className="p-4 bg-white/5 border border-white/10">
                          <div className="flex justify-between items-center mb-2">
                            <strong className="text-white">Hobbyist</strong>
                            <span className="text-white font-bold">10% Rebate</span>
                          </div>
                          <div className="text-[10px] text-gray-400">Stake: 10,000 WHISTLE</div>
                        </div>
                        <div className="p-4 bg-white/5 border border-white/10">
                          <div className="flex justify-between items-center mb-2">
                            <strong className="text-white">Builder</strong>
                            <span className="text-white font-bold">25% Rebate</span>
                          </div>
                          <div className="text-[10px] text-gray-400">Stake: 100,000 WHISTLE</div>
                        </div>
                        <div className="p-4 bg-white/5 border border-white/10">
                          <div className="flex justify-between items-center mb-2">
                            <strong className="text-white">Pro</strong>
                            <span className="text-white font-bold">50% Rebate</span>
                          </div>
                          <div className="text-[10px] text-gray-400">Stake: 500,000 WHISTLE</div>
                        </div>
                        <div className="p-4 bg-white/5 border border-white/10">
                          <div className="flex justify-between items-center mb-2">
                            <strong className="text-white">Enterprise</strong>
                            <span className="text-white font-bold">75% Rebate</span>
                          </div>
                          <div className="text-[10px] text-gray-400">Stake: 2,500,000 WHISTLE</div>
                        </div>
                        <div className="p-4 bg-white/5 border-2 border-white/20">
                          <div className="flex justify-between items-center mb-2">
                            <strong className="text-white">Whale</strong>
                            <span className="text-white font-bold text-lg">100% Rebate</span>
                          </div>
                          <div className="text-[10px] text-gray-400">Stake: 10,000,000 WHISTLE</div>
                          <div className="text-[10px] text-white mt-1">Completely FREE queries</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-black/40 border border-white/10">
                      <h3 className="text-lg font-bold mb-4 tracking-wider">How It Works</h3>
                      <div className="space-y-3 text-xs">
                        <div>
                          <strong className="text-white block mb-1">1. Register as Developer</strong>
                          <p className="text-gray-400">Stake WHISTLE tokens to activate your tier and rebate percentage</p>
                        </div>
                        <div>
                          <strong className="text-white block mb-1">2. Make Queries via Special Instruction</strong>
                          <p className="text-gray-400">Call ProcessDeveloperQuery instead of regular ProcessQueryPayment</p>
                      </div>
                        <div>
                          <strong className="text-white block mb-1">3. Pay Discounted Rate</strong>
                          <p className="text-gray-400">You pay net_cost = 0.00001 SOL - rebate (e.g., Pro tier pays 0.000005 SOL instead of 0.00001)</p>
                        </div>
                        <div>
                          <strong className="text-white block mb-1">4. Full Value Still Distributed</strong>
                          <p className="text-gray-400">The full 0.00001 SOL still gets split 70/20/5/5 - your rebate comes from the developer rebate pool</p>
                      </div>
                        <div>
                          <strong className="text-white block mb-1">5. Referral Bonuses (Optional)</strong>
                          <p className="text-gray-400">If you referred another developer, you earn 5% of their query fees as SOL</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-white/5 border border-white/10">
                      <strong className="text-white block mb-1 text-xs">Example Calculation:</strong>
                      <p className="text-gray-400 text-[10px]">
                        As a Pro developer (50% rebate), if you make 10,000 queries:
                        <br />• Standard Cost: 10,000 × 0.00001 SOL = 0.1 SOL
                        <br />• Your Net Cost: 10,000 × 0.000005 SOL = 0.05 SOL
                        <br />• You Save: 0.05 SOL (50% discount)
                        <br />• Providers still earn as if you paid full price - rebate funded separately
                      </p>
                    </div>
                  </div>
                )}

                {/* ECONOMY TAB */}
                {activeTab === 'economy' && (
                  <div className="space-y-6 text-sm">
                    <div className="p-6 bg-white/5 border border-white/10">
                      <h3 className="text-xl font-bold mb-4 tracking-wider">Token Economics and Fee Distribution</h3>
                      <p className="text-gray-300 leading-relaxed">
                        Whistlenet uses a sophisticated economic model to align incentives between users, providers, stakers, and developers. Every query payment is automatically split on-chain according to predefined rules.
                      </p>
                  </div>

                    <div className="p-6 bg-black/40 border border-white/10">
                      <h3 className="text-lg font-bold mb-4 tracking-wider">Query Fee Breakdown</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-white/5 border border-white/10">
                          <div>
                            <strong className="text-white block">Query Cost</strong>
                            <span className="text-[10px] text-gray-400">Per standard RPC query</span>
                          </div>
                          <strong className="text-2xl text-white">0.00001 SOL</strong>
                        </div>
                        <div className="text-[10px] text-gray-400 mb-3">Automatically distributed to:</div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center p-3 bg-white/5 border border-white/10">
                            <div>
                              <strong className="text-white">Provider Pool</strong>
                              <span className="text-[10px] text-gray-400 block">Payment for serving query</span>
                            </div>
                            <div className="text-right">
                              <strong className="text-white text-lg">70%</strong>
                              <div className="text-[10px] text-gray-400">0.000007 SOL</div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white/5 border border-white/10">
                            <div>
                              <strong className="text-white">Bonus Pool</strong>
                              <span className="text-[10px] text-gray-400 block">Rewards for top providers</span>
                            </div>
                            <div className="text-right">
                              <strong className="text-white text-lg">20%</strong>
                              <div className="text-[10px] text-gray-400">0.000002 SOL</div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white/5 border border-white/10">
                            <div>
                              <strong className="text-white">Staker Rewards</strong>
                              <span className="text-[10px] text-gray-400 block">Distributed to all stakers</span>
                            </div>
                            <div className="text-right">
                              <strong className="text-white text-lg">5%</strong>
                              <div className="text-[10px] text-gray-400">0.0000005 SOL</div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white/5 border border-white/10">
                      <div>
                              <strong className="text-white">Treasury</strong>
                              <span className="text-[10px] text-gray-400 block">Protocol development</span>
                            </div>
                            <div className="text-right">
                              <strong className="text-white text-lg">5%</strong>
                              <div className="text-[10px] text-gray-400">0.0000005 SOL</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-black/40 border border-white/10">
                        <h3 className="text-xs font-bold mb-3 tracking-wider text-gray-400">X402 PAYMENT SYSTEM</h3>
                        <p className="text-xs text-gray-300 mb-2">
                          Optional external payment integration for enterprises
                        </p>
                        <div className="text-[10px] text-gray-400 space-y-1">
                          <div>• 90% to Staker Rewards</div>
                          <div>• 10% to Treasury</div>
                        </div>
                      </div>
                      <div className="p-4 bg-black/40 border border-white/10">
                        <h3 className="text-xs font-bold mb-3 tracking-wider text-gray-400">DEVELOPER REBATES</h3>
                        <p className="text-xs text-gray-300 mb-2">
                          Cashback from developer rebate pool
                        </p>
                        <div className="text-[10px] text-gray-400 space-y-1">
                          <div>• 10-100% based on tier</div>
                          <div>• Separate pool funded</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-black/40 border border-white/10">
                      <h3 className="text-lg font-bold mb-4 tracking-wider">Example Revenue Scenarios</h3>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-white/5 border border-white/10">
                          <strong className="text-white block mb-2">Network Scale: 1M Queries/Day</strong>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <div className="text-gray-400 mb-1">Total Fees</div>
                              <div className="text-white font-bold">10 SOL/day</div>
                            </div>
                            <div>
                              <div className="text-gray-400 mb-1">Provider Pool</div>
                              <div className="text-white font-bold">7 SOL/day</div>
                            </div>
                            <div>
                              <div className="text-gray-400 mb-1">Bonus Pool</div>
                              <div className="text-white font-bold">2 SOL/day</div>
                            </div>
                            <div>
                              <div className="text-gray-400 mb-1">Staker Rewards</div>
                              <div className="text-white font-bold">0.5 SOL/day</div>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-white/5 border border-white/10">
                          <strong className="text-white block mb-2">Network Scale: 10M Queries/Day</strong>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <div className="text-gray-400 mb-1">Total Fees</div>
                              <div className="text-white font-bold">100 SOL/day</div>
                      </div>
                      <div>
                              <div className="text-gray-400 mb-1">Provider Pool</div>
                              <div className="text-white font-bold">70 SOL/day</div>
                      </div>
                      <div>
                              <div className="text-gray-400 mb-1">Bonus Pool</div>
                              <div className="text-white font-bold">20 SOL/day</div>
                      </div>
                      <div>
                              <div className="text-gray-400 mb-1">Staker Rewards</div>
                              <div className="text-white font-bold">5 SOL/day</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-white/5 border border-white/10">
                      <h3 className="text-lg font-bold mb-3 tracking-wider">Economic Design Principles</h3>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <strong className="text-white block mb-1">Sustainable Rewards</strong>
                          <p className="text-gray-400">All rewards funded by real usage</p>
                        </div>
                        <div>
                          <strong className="text-white block mb-1">Aligned Incentives</strong>
                          <p className="text-gray-400">Better service = more earnings</p>
                  </div>
                        <div>
                          <strong className="text-white block mb-1">Instant Settlement</strong>
                          <p className="text-gray-400">All payments on-chain and immediate</p>
                      </div>
                        <div>
                          <strong className="text-white block mb-1">Transparent Accounting</strong>
                          <p className="text-gray-400">All flows verifiable on Solana</p>
                      </div>
                      </div>
                    </div>
                  </div>
                )}

                  </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 flex items-center justify-between flex-shrink-0">
                <div className="text-[10px] text-gray-500">
                  Whistlenet v1.0.0 - Solana Mainnet
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

