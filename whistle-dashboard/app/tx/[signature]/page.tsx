'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { transactionService } from '@/lib/services/transaction.service';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import toast from 'react-hot-toast';
import { formatDistance } from 'date-fns';

export default function TransactionDetailsPage({ params }: { params: Promise<{ signature: string }> }) {
  const { signature } = use(params);

  const { data: tx, isLoading, error } = useQuery({
    queryKey: ['transaction-details', signature],
    queryFn: () => transactionService.getTransactionDetails(signature),
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton baseColor="#1a1a1a" highlightColor="#2a2a2a" height={40} width={200} className="mb-8" />
          <Skeleton baseColor="#1a1a1a" highlightColor="#2a2a2a" height={600} />
        </div>
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="min-h-screen bg-[#050505] p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-2">⚠ Transaction Not Found</div>
          <div className="text-gray-500 mb-4">{(error as Error)?.message || 'Invalid signature'}</div>
          <Link href="/transactions" className="text-sm text-gray-400 hover:text-white">
            ← Back to Transactions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <Link href="/transactions" className="text-gray-400 hover:text-white text-sm mb-4 inline-block">
          ← Back to Transactions
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-wider mb-2">TRANSACTION DETAILS</h1>
            <div className="flex items-center gap-3">
              <div
                className={`px-3 py-1 text-xs tracking-wider ${
                  tx.status === 'success'
                    ? 'bg-green-900/20 text-green-400'
                    : 'bg-red-900/20 text-red-400'
                }`}
              >
                {tx.status.toUpperCase()}
              </div>
              <div className="text-sm text-gray-500">
                {formatDistance(new Date(tx.blockTime * 1000), new Date(), { addSuffix: true })}
              </div>
            </div>
          </div>
          
          <button
            onClick={() => window.open(`https://solscan.io/tx/${signature}`, '_blank')}
            className="px-4 py-2 bg-black/60 border border-white/20 hover:bg-black/80 text-xs tracking-wider"
          >
            VIEW ON SOLSCAN →
          </button>
        </div>
      </div>

      {/* Overview */}
      <div className="max-w-7xl mx-auto mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel-base p-6 clip-angled-border"
        >
          <h2 className="text-xl font-bold tracking-wider mb-4">OVERVIEW</h2>
          
          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-500 tracking-wider mb-1">SIGNATURE</div>
              <div className="flex items-center gap-2">
                <div className="font-mono text-sm break-all">{signature}</div>
                <button
                  onClick={() => handleCopy(signature)}
                  className="text-xs text-gray-500 hover:text-white"
                >
                  ⧉
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500 tracking-wider mb-1">SLOT</div>
                <div className="text-sm">{tx.slot.toLocaleString()}</div>
              </div>
              
              <div>
                <div className="text-xs text-gray-500 tracking-wider mb-1">TIMESTAMP</div>
                <div className="text-sm">{new Date(tx.blockTime * 1000).toLocaleString()}</div>
              </div>
              
              <div>
                <div className="text-xs text-gray-500 tracking-wider mb-1">FEE</div>
                <div className="text-sm">{(tx.fee / 1e9).toFixed(6)} SOL</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 tracking-wider mb-1">FROM</div>
                <div className="flex items-center gap-2">
                  <div className="font-mono text-sm break-all">{tx.fromAddress}</div>
                  <button
                    onClick={() => handleCopy(tx.fromAddress)}
                    className="text-xs text-gray-500 hover:text-white"
                  >
                    ⧉
                  </button>
                </div>
              </div>
              
              <div>
                <div className="text-xs text-gray-500 tracking-wider mb-1">TO</div>
                <div className="flex items-center gap-2">
                  <div className="font-mono text-sm break-all">{tx.toAddress}</div>
                  <button
                    onClick={() => handleCopy(tx.toAddress)}
                    className="text-xs text-gray-500 hover:text-white"
                  >
                    ⧉
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Instructions */}
      {tx.instructions && tx.instructions.length > 0 && (
        <div className="max-w-7xl mx-auto mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="panel-base p-6 clip-angled-border"
          >
            <h2 className="text-xl font-bold tracking-wider mb-4">INSTRUCTIONS ({tx.instructions.length})</h2>
            
            <div className="space-y-3">
              {tx.instructions.map((ix, i) => (
                <div key={i} className="p-4 bg-black/40 border border-white/5">
                  <div className="text-xs text-gray-500 mb-2">INSTRUCTION #{i + 1}</div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-gray-500">Program ID</div>
                      <div className="font-mono text-xs">{ix.programId}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Accounts ({ix.accounts.length})</div>
                      <div className="max-h-32 overflow-y-auto space-y-1 mt-1">
                        {ix.accounts.map((acc, j) => (
                          <div key={j} className="font-mono text-[10px] text-gray-400">
                            {acc}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Logs */}
      {tx.logs && tx.logs.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="panel-base p-6 clip-angled-border"
          >
            <h2 className="text-xl font-bold tracking-wider mb-4">LOGS</h2>
            
            <div className="bg-black/60 p-4 max-h-96 overflow-y-auto">
              <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                {tx.logs.join('\n')}
              </pre>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

