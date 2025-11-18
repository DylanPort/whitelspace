'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useQuery } from '@tanstack/react-query';
import { walletService } from '@/lib/services/wallet.service';
import { transactionService } from '@/lib/services/transaction.service';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export default function DashboardPage() {
  const { publicKey, connected } = useWallet();

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['wallet-overview', publicKey?.toBase58()],
    queryFn: () => walletService.getWalletOverview(publicKey!.toBase58()),
    enabled: !!publicKey,
  });

  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: ['token-balances', publicKey?.toBase58()],
    queryFn: () => walletService.getTokenBalances(publicKey!.toBase58()),
    enabled: !!publicKey,
  });

  const { data: nfts, isLoading: nftsLoading } = useQuery({
    queryKey: ['wallet-nfts', publicKey?.toBase58()],
    queryFn: () => walletService.getNFTs(publicKey!.toBase58()),
    enabled: !!publicKey,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['wallet-transactions', publicKey?.toBase58()],
    queryFn: () =>
      transactionService.getWalletTransactions(publicKey!.toBase58(), {
        limit: 10,
      }),
    enabled: !!publicKey,
  });

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold mb-4 tracking-wider">WALLET DASHBOARD</h1>
          <p className="text-gray-400 mb-8">Connect your wallet to view your dashboard</p>
          <WalletMultiButton />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-gray-400 hover:text-white text-sm mb-2 inline-block">
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-bold tracking-wider">DASHBOARD</h1>
            <p className="text-gray-500 text-sm mt-1">
              {walletService.formatAddress(publicKey?.toBase58() || '', 8)}
            </p>
          </div>
          <WalletMultiButton />
        </div>
      </div>

      {/* Overview Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="panel-base p-6 clip-angled-border"
        >
          <div className="text-gray-500 text-xs tracking-wider mb-2">SOL BALANCE</div>
          {overviewLoading ? (
            <Skeleton baseColor="#1a1a1a" highlightColor="#2a2a2a" height={32} />
          ) : (
            <div className="text-3xl font-bold">{overview?.solBalance.toFixed(4) || '0.0000'}</div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="panel-base p-6 clip-angled-border"
        >
          <div className="text-gray-500 text-xs tracking-wider mb-2">PORTFOLIO VALUE</div>
          {overviewLoading ? (
            <Skeleton baseColor="#1a1a1a" highlightColor="#2a2a2a" height={32} />
          ) : (
            <div className="text-3xl font-bold">{walletService.formatUSD(overview?.totalValue || 0)}</div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="panel-base p-6 clip-angled-border"
        >
          <div className="text-gray-500 text-xs tracking-wider mb-2">TOKENS</div>
          {overviewLoading ? (
            <Skeleton baseColor="#1a1a1a" highlightColor="#2a2a2a" height={32} />
          ) : (
            <div className="text-3xl font-bold">{overview?.tokenCount || 0}</div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="panel-base p-6 clip-angled-border"
        >
          <div className="text-gray-500 text-xs tracking-wider mb-2">NFTs</div>
          {overviewLoading ? (
            <Skeleton baseColor="#1a1a1a" highlightColor="#2a2a2a" height={32} />
          ) : (
            <div className="text-3xl font-bold">{overview?.nftCount || 0}</div>
          )}
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Token Balances */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="panel-base p-6 clip-angled-border"
        >
          <h2 className="text-xl font-bold mb-4 tracking-wider">TOKEN BALANCES</h2>
          {balancesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} baseColor="#1a1a1a" highlightColor="#2a2a2a" height={60} />
              ))}
            </div>
          ) : balances && balances.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {balances.map((token) => (
                <div
                  key={token.mint}
                  className="flex items-center justify-between p-3 bg-black/40 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {token.image ? (
                      <img src={token.image} alt={token.symbol} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-800" />
                    )}
                    <div>
                      <div className="font-semibold">{token.symbol || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{token.name || token.mint.slice(0, 8)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{token.uiAmount.toFixed(4)}</div>
                    {token.value && <div className="text-xs text-gray-500">{walletService.formatUSD(token.value)}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">No tokens found</div>
          )}
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="panel-base p-6 clip-angled-border"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-wider">RECENT TRANSACTIONS</h2>
            <Link href="/transactions" className="text-xs text-gray-400 hover:text-white">
              View All →
            </Link>
          </div>
          {txLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} baseColor="#1a1a1a" highlightColor="#2a2a2a" height={60} />
              ))}
            </div>
          ) : transactions && transactions.transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.transactions.slice(0, 10).map((tx) => (
                <Link
                  key={tx.signature}
                  href={`/tx/${tx.signature}`}
                  className="block p-3 bg-black/40 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs truncate">{tx.signature}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(tx.blockTime * 1000).toLocaleString()}
                      </div>
                    </div>
                    <div
                      className={`text-xs px-2 py-1 ${
                        tx.status === 'success' ? 'text-white bg-green-900/20' : 'text-red-400 bg-red-900/20'
                      }`}
                    >
                      {tx.status}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">No transactions found</div>
          )}
        </motion.div>
      </div>

      {/* NFT Gallery */}
      {nfts && nfts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="max-w-7xl mx-auto mt-8 panel-base p-6 clip-angled-border"
        >
          <h2 className="text-xl font-bold mb-4 tracking-wider">NFT COLLECTION</h2>
          {nftsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} baseColor="#1a1a1a" highlightColor="#2a2a2a" height={200} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {nfts.map((nft) => (
                <div
                  key={nft.mint}
                  className="panel-base p-2 clip-angled-border hover:scale-105 transition-transform cursor-pointer"
                >
                  <img src={nft.image || '/placeholder-nft.png'} alt={nft.name} className="w-full aspect-square object-cover mb-2" />
                  <div className="text-xs font-semibold truncate">{nft.name}</div>
                  <div className="text-[10px] text-gray-500 truncate">{nft.symbol}</div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

