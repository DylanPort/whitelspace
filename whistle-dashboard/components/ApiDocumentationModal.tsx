'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface ApiDocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiDocumentationModal({ isOpen, onClose }: ApiDocumentationModalProps) {
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
              className="relative w-full max-w-6xl pointer-events-auto my-8 max-h-[95vh] overflow-hidden flex flex-col"
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
              <div className="relative flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10 flex-shrink-0">
                  <div>
                    <h2 className="text-2xl font-bold tracking-[0.2em] uppercase">
                      WHISTLENET API DOCUMENTATION
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">Complete integration guide & smart contract reference</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-3xl text-gray-400 hover:text-white transition-colors"
                  >
                    ×
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8 text-sm space-y-8">
                  
                  {/* Overview */}
                  <div className="p-6 bg-white/5 border border-white/10">
                    <h3 className="text-xl font-bold mb-4 tracking-wider">OVERVIEW</h3>
                    <p className="text-gray-300 leading-relaxed mb-4">
                      Whistlenet is a decentralized RPC network built on Solana, providing censorship-resistant access to blockchain data through a community-owned infrastructure. Our smart contract handles staking, provider registration, query payments, and reward distribution.
                    </p>
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      <div className="p-4 bg-black/40 border border-white/10">
                        <div className="text-2xl font-bold text-white">0.00001 SOL</div>
                        <div className="text-xs text-gray-400 mt-1">QUERY COST</div>
                      </div>
                      <div className="p-4 bg-black/40 border border-white/10">
                        <div className="text-2xl font-bold text-white">1:1000</div>
                        <div className="text-xs text-gray-400 mt-1">WHISTLE:ACCESS RATIO</div>
                      </div>
                      <div className="p-4 bg-black/40 border border-white/10">
                        <div className="text-2xl font-bold text-white">33+</div>
                        <div className="text-xs text-gray-400 mt-1">RPC METHODS</div>
                      </div>
                    </div>
                  </div>

                  {/* Smart Contract Details */}
                  <div className="p-6 bg-black/40 border border-white/10">
                    <h3 className="text-xl font-bold mb-4 tracking-wider">SMART CONTRACT</h3>
                    <div className="space-y-3 text-gray-300">
                      <div className="flex justify-between py-2 border-b border-white/5">
                        <span className="text-gray-500">Program ID</span>
                        <span className="font-mono text-xs">whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/5">
                        <span className="text-gray-500">Network</span>
                        <span className="font-semibold">Solana Mainnet-Beta</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/5">
                        <span className="text-gray-500">Status</span>
                        <span className="text-green-400 font-semibold">LIVE & VERIFIED</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-gray-500">Documentation</span>
                        <span className="text-gray-600 text-xs">COMING SOON</span>
                      </div>
                    </div>
                  </div>

                  {/* Core Instructions */}
                  <div className="p-6 bg-white/5 border border-white/10">
                    <h3 className="text-xl font-bold mb-4 tracking-wider">CORE INSTRUCTIONS</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { name: 'InitializePool', desc: 'Initialize the staking pool with initial parameters' },
                        { name: 'Stake', desc: 'Stake WHISTLE tokens to earn rewards and governance power' },
                        { name: 'Unstake', desc: 'Unstake tokens after cooldown period (24h)' },
                        { name: 'RegisterProvider', desc: 'Register as an RPC provider with stake and endpoint' },
                        { name: 'DeregisterProvider', desc: 'Deregister provider and reclaim stake' },
                        { name: 'ProcessQueryPayment', desc: 'Process RPC query payment (0.00001 SOL)' },
                        { name: 'ProviderHeartbeat', desc: 'Provider uptime check-in' },
                        { name: 'ClaimStakerRewards', desc: 'Claim accumulated staker rewards (5% of queries)' },
                        { name: 'ClaimProviderEarnings', desc: 'Claim provider earnings (70% of queries)' },
                        { name: 'DistributeBonusPool', desc: 'Distribute bonus pool to active providers' },
                        { name: 'StakeDeveloper', desc: 'Stake as developer for query rebates' },
                        { name: 'ProcessDeveloperQuery', desc: 'Process query with developer rebate' },
                      ].map((instr, i) => (
                        <div key={i} className="p-4 bg-black/40 border border-white/10">
                          <div className="text-sm font-mono text-white mb-2">{instr.name}</div>
                          <div className="text-xs text-gray-400">{instr.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Supported RPC Methods */}
                  <div className="p-6 bg-black/40 border border-white/10">
                    <h3 className="text-xl font-bold mb-4 tracking-wider">SUPPORTED RPC METHODS</h3>
                    <p className="text-gray-300 mb-4">
                      All standard Solana RPC methods are supported through our decentralized provider network. Reference: 
                      <a href="https://solana.com/docs/rpc" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 ml-1">
                        Solana RPC Documentation
                      </a>
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        'getAccountInfo', 'getBalance', 'getTokenAccountBalance', 
                        'getTransaction', 'getSignaturesForAddress', 'sendTransaction',
                        'getBlockHeight', 'getBlock', 'getRecentBlockhash',
                        'getEpochInfo', 'getSlot', 'getVersion',
                        'getStakeActivation', 'getInflationReward', 'getVoteAccounts',
                        'getProgramAccounts', 'getMultipleAccounts', 'simulateTransaction',
                        'getTokenSupply', 'getTokenLargestAccounts', 'getTokenAccountsByOwner',
                        'getHealth', 'getClusterNodes', 'getBlockTime',
                        'getMinimumBalanceForRentExemption', 'getFeeForMessage', 'getLatestBlockhash',
                        'getBlockProduction', 'getInflationRate', 'getLeaderSchedule',
                        'getRecentPerformanceSamples', 'getBlocks', 'getBlocksWithLimit'
                      ].map((method, i) => (
                        <div key={i} className="px-3 py-2 bg-white/5 border border-white/5 text-xs font-mono text-gray-300">
                          {method}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Integration Example */}
                  <div className="p-6 bg-white/5 border border-white/10">
                    <h3 className="text-xl font-bold mb-4 tracking-wider">INTEGRATION EXAMPLE</h3>
                    <div className="bg-black/60 p-4 rounded font-mono text-xs text-gray-300 overflow-x-auto">
                      <pre>{`// Import Whistlenet contract library
import { connection, createProcessQueryPaymentTransaction, QUERY_COST } from '@/lib/contract';

// 1. Get active providers
const providers = await fetchAllProviders();
const activeProvider = providers.find(p => p.isActive);

// 2. Create query payment transaction
const tx = await createProcessQueryPaymentTransaction(
  publicKey,
  activeProvider.pubkey,
  QUERY_COST
);

// 3. Send transaction
const signature = await sendTransaction(tx, connection);
await connection.confirmTransaction(signature);

// 4. Execute RPC query on provider's endpoint
const response = await fetch(activeProvider.endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'getAccountInfo',
    params: [accountPubkey]
  })
});

const data = await response.json();
console.log('Query result:', data.result);`}</pre>
                    </div>
                  </div>

                  {/* Revenue Distribution */}
                  <div className="p-6 bg-black/40 border border-white/10">
                    <h3 className="text-xl font-bold mb-4 tracking-wider">QUERY REVENUE DISTRIBUTION</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10">
                        <span className="text-gray-300">Provider (Direct Payment)</span>
                        <span className="font-bold text-lg text-white">70%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10">
                        <span className="text-gray-300">Bonus Pool (Active Providers)</span>
                        <span className="font-bold text-lg text-white">20%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10">
                        <span className="text-gray-300">Stakers (Governance)</span>
                        <span className="font-bold text-lg text-white">5%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10">
                        <span className="text-gray-300">Treasury (Protocol)</span>
                        <span className="font-bold text-lg text-white">5%</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div className="p-6 bg-white/5 border border-white/10">
                    <h3 className="text-xl font-bold mb-4 tracking-wider">ADDITIONAL RESOURCES</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <a 
                        href="/docs/guides/RUN-10-NODES.md" 
                        target="_blank"
                        className="p-4 bg-black/40 border border-white/10 hover:border-white/30 transition-all"
                      >
                        <div className="text-sm font-semibold text-white mb-2">Run 10 Nodes Guide</div>
                        <div className="text-xs text-gray-400">Setup multiple provider nodes for maximum earnings</div>
                      </a>
                      <a 
                        href="/docs/guides/connectwallet.jpg" 
                        target="_blank"
                        className="p-4 bg-black/40 border border-white/10 hover:border-white/30 transition-all"
                      >
                        <div className="text-sm font-semibold text-white mb-2">Connect Wallet</div>
                        <div className="text-xs text-gray-400">Visual guide to connecting your Solana wallet</div>
                      </a>
                      <a 
                        href="/docs/guides/stake.jpg" 
                        target="_blank"
                        className="p-4 bg-black/40 border border-white/10 hover:border-white/30 transition-all"
                      >
                        <div className="text-sm font-semibold text-white mb-2">Stake WHISTLE</div>
                        <div className="text-xs text-gray-400">How to stake tokens and earn rewards</div>
                      </a>
                      <a 
                        href="/docs/guides/run_node.jpg" 
                        target="_blank"
                        className="p-4 bg-black/40 border border-white/10 hover:border-white/30 transition-all"
                      >
                        <div className="text-sm font-semibold text-white mb-2">Run a Node</div>
                        <div className="text-xs text-gray-400">Complete node setup and operation guide</div>
                      </a>
                    </div>
                  </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 flex items-center justify-between flex-shrink-0">
                  <div className="text-[10px] text-gray-500">
                    Whistlenet v1.0.0 • Solana Mainnet • Program ID: whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}



