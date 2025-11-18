'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { transactionService, type Transaction } from '@/lib/services/transaction.service';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { formatDistance } from 'date-fns';

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed'>('all');

  const { data: recentTxs, isLoading } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: () => transactionService.getRecentTransactions(50),
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['transaction-search', searchQuery],
    queryFn: () => transactionService.searchTransactions(searchQuery),
    enabled: searchQuery.length >= 10,
  });

  const transactions = searchQuery.length >= 10 ? searchResults : recentTxs;
  const filteredTxs = transactions?.filter((tx) =>
    filterStatus === 'all' ? true : tx.status === filterStatus
  );

  return (
    <div className="min-h-screen bg-[#050505] p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <Link href="/" className="text-gray-400 hover:text-white text-sm mb-2 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-4xl font-bold tracking-wider mb-2">TRANSACTIONS</h1>
        <p className="text-gray-500">Explore Solana transactions</p>
      </div>

      {/* Search & Filters */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by signature..."
              className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm focus:border-white/40 focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {['all', 'success', 'failed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status as any)}
                className={`flex-1 px-4 py-3 text-xs tracking-wider uppercase transition-colors ${
                  filterStatus === status
                    ? 'bg-white text-black'
                    : 'bg-black/60 border border-white/20 hover:bg-black/80'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="max-w-7xl mx-auto">
        {isLoading || searchLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} baseColor="#1a1a1a" highlightColor="#2a2a2a" height={100} />
            ))}
          </div>
        ) : !filteredTxs || filteredTxs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-2">No transactions found</div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-gray-400 hover:text-white"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTxs.map((tx, index) => (
              <motion.div
                key={tx.signature}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/tx/${tx.signature}`}>
                  <div className="panel-base p-6 clip-angled-border hover:scale-[1.01] transition-transform cursor-pointer">
                    <div className="flex items-start justify-between">
                      {/* Left: Signature & Time */}
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className={`px-2 py-1 text-[10px] tracking-wider ${
                              tx.status === 'success'
                                ? 'bg-green-900/20 text-green-400'
                                : 'bg-red-900/20 text-red-400'
                            }`}
                          >
                            {tx.status.toUpperCase()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDistance(new Date(tx.blockTime * 1000), new Date(), {
                              addSuffix: true,
                            })}
                          </div>
                        </div>
                        <div className="font-mono text-sm truncate text-gray-300 mb-2">
                          {tx.signature}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div>Slot: {tx.slot.toLocaleString()}</div>
                          <div>Fee: {(tx.fee / 1e9).toFixed(6)} SOL</div>
                        </div>
                      </div>

                      {/* Right: From/To */}
                      <div className="text-right">
                        <div className="text-xs text-gray-500 mb-1">FROM</div>
                        <div className="font-mono text-xs text-gray-300 mb-3">
                          {tx.fromAddress.slice(0, 8)}...{tx.fromAddress.slice(-8)}
                        </div>
                        <div className="text-xs text-gray-500 mb-1">TO</div>
                        <div className="font-mono text-xs text-gray-300">
                          {tx.toAddress.slice(0, 8)}...{tx.toAddress.slice(-8)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
