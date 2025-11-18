'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import ApiDocumentationModal from './ApiDocumentationModal';

const API_METHODS = [
  // Account Methods
  { name: 'getAccountInfo', desc: 'Get account data', category: 'Account' },
  { name: 'getBalance', desc: 'Get SOL balance', category: 'Account' },
  { name: 'getTokenAccountBalance', desc: 'Get SPL token balance', category: 'Account' },
  { name: 'getTokenAccountsByOwner', desc: 'Get all token accounts', category: 'Account' },
  { name: 'getProgramAccounts', desc: 'Get accounts by program', category: 'Account' },
  { name: 'getMultipleAccounts', desc: 'Batch account lookup', category: 'Account' },
  
  // Transaction Methods
  { name: 'getTransaction', desc: 'Get transaction details', category: 'Transaction' },
  { name: 'getSignaturesForAddress', desc: 'Get signature history', category: 'Transaction' },
  { name: 'sendTransaction', desc: 'Submit transaction', category: 'Transaction' },
  { name: 'simulateTransaction', desc: 'Dry-run transaction', category: 'Transaction' },
  { name: 'getRecentPerformanceSamples', desc: 'Performance metrics', category: 'Transaction' },
  
  // Block Methods
  { name: 'getBlockHeight', desc: 'Latest block height', category: 'Block' },
  { name: 'getBlock', desc: 'Get block by slot', category: 'Block' },
  { name: 'getBlockTime', desc: 'Get block timestamp', category: 'Block' },
  { name: 'getBlocks', desc: 'Get block range', category: 'Block' },
  { name: 'getBlockProduction', desc: 'Block production stats', category: 'Block' },
  { name: 'getRecentBlockhash', desc: 'Get recent blockhash', category: 'Block' },
  
  // Network Methods
  { name: 'getEpochInfo', desc: 'Current epoch info', category: 'Network' },
  { name: 'getSlot', desc: 'Current slot number', category: 'Network' },
  { name: 'getVersion', desc: 'Solana version', category: 'Network' },
  { name: 'getHealth', desc: 'Node health status', category: 'Network' },
  { name: 'getClusterNodes', desc: 'Cluster node list', category: 'Network' },
  { name: 'getVoteAccounts', desc: 'Validator vote accounts', category: 'Network' },
  
  // Staking & Validators
  { name: 'getStakeActivation', desc: 'Stake account status', category: 'Staking' },
  { name: 'getInflationReward', desc: 'Inflation rewards', category: 'Staking' },
  { name: 'getInflationRate', desc: 'Current inflation rate', category: 'Staking' },
  { name: 'getLeaderSchedule', desc: 'Leader schedule', category: 'Staking' },
  
  // Program & Smart Contracts
  { name: 'getMinimumBalanceForRentExemption', desc: 'Rent calculation', category: 'Program' },
  { name: 'getFeeForMessage', desc: 'Transaction fee estimate', category: 'Program' },
  { name: 'getLatestBlockhash', desc: 'Latest blockhash', category: 'Program' },
  
  // Token Specific
  { name: 'getTokenSupply', desc: 'Token total supply', category: 'Token' },
  { name: 'getTokenLargestAccounts', desc: 'Top token holders', category: 'Token' },
];

export default function ApiMethodsPanel() {
  const [showAll, setShowAll] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showDocsModal, setShowDocsModal] = useState(false);

  const categories = Array.from(new Set(API_METHODS.map(m => m.category)));
  
  const filteredMethods = selectedCategory
    ? API_METHODS.filter(m => m.category === selectedCategory)
    : API_METHODS;

  const displayedMethods = showAll ? filteredMethods : filteredMethods.slice(0, 6);

  return (
    <>
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="panel-base p-6 rounded-[16px] clip-angled-border"
    >
      <h3 className="text-[11px] font-semibold mb-4 tracking-[0.15em]">
        API METHODS
      </h3>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-1 mb-3">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`text-[8px] px-2 py-1 border transition-colors ${
            selectedCategory === null
              ? 'bg-white/10 border-white/30 text-white'
              : 'border-white/10 text-gray-500 hover:text-white'
          }`}
        >
          ALL
        </button>
        {categories.slice(0, 4).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
            className={`text-[8px] px-2 py-1 border transition-colors ${
              selectedCategory === cat
                ? 'bg-white/10 border-white/30 text-white'
                : 'border-white/10 text-gray-500 hover:text-white'
            }`}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Methods List */}
      <div className="space-y-1.5 max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        {displayedMethods.map((method, i) => (
          <div 
            key={i}
            className="py-2 border-b border-white/5 hover:bg-white/5 transition-colors px-2 -mx-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-mono text-white truncate">{method.name}</div>
                <div className="text-[9px] text-gray-500 mt-0.5">{method.desc}</div>
              </div>
              <div className="text-[8px] text-gray-600 tracking-wider flex-shrink-0">
                {method.category}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show More/Less */}
      {filteredMethods.length > 6 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-[10px] text-gray-500 hover:text-white mt-3 transition-colors w-full text-left"
        >
          {showAll ? '← Show Less' : `+${filteredMethods.length - 6} more methods`}
        </button>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
        <div className="text-[10px] text-gray-600">
          {API_METHODS.length} methods
        </div>
        <button
          onClick={() => setShowDocsModal(true)}
          className="text-[10px] text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          Full Documentation →
        </button>
      </div>
    </motion.div>

    {/* Documentation Modal */}
    <ApiDocumentationModal 
      isOpen={showDocsModal}
      onClose={() => setShowDocsModal(false)}
    />
    </>
  );
}

