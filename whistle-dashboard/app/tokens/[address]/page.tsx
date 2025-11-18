'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tokenService } from '@/lib/services/token.service';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';

export default function TokenDetailsPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  const { data: token, isLoading, error } = useQuery({
    queryKey: ['token-details', address],
    queryFn: () => tokenService.getTokenDetails(address),
  });

  const { data: priceHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['token-price-history', address, timeframe],
    queryFn: () => tokenService.getTokenPriceHistory(address, timeframe),
  });

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied!');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton baseColor="#1a1a1a" highlightColor="#2a2a2a" height={40} width={200} className="mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Skeleton baseColor="#1a1a1a" highlightColor="#2a2a2a" height={400} />
            </div>
            <div>
              <Skeleton baseColor="#1a1a1a" highlightColor="#2a2a2a" height={400} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="min-h-screen bg-[#050505] p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-2">⚠ Token Not Found</div>
          <div className="text-gray-500 mb-4">{(error as Error)?.message || 'Invalid token address'}</div>
          <Link href="/tokens" className="text-sm text-gray-400 hover:text-white">
            ← Back to Tokens
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <Link href="/tokens" className="text-gray-400 hover:text-white text-sm mb-4 inline-block">
          ← Back to Tokens
        </Link>
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {token.image ? (
              <img src={token.image} alt={token.symbol} className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center text-2xl font-bold">
                {token.symbol?.[0] || '?'}
              </div>
            )}
            <div>
              <h1 className="text-4xl font-bold tracking-wider">{token.name || 'Unknown Token'}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xl text-gray-400">{token.symbol}</span>
                <button
                  onClick={handleCopyAddress}
                  className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
                >
                  {address.slice(0, 8)}...{address.slice(-8)} ⧉
                </button>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleShare}
            className="px-4 py-2 bg-black/60 border border-white/20 hover:bg-black/80 text-xs tracking-wider"
          >
            SHARE
          </button>
        </div>
      </div>

      {/* Price & Stats */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel-base p-4 clip-angled-border"
        >
          <div className="text-xs text-gray-500 tracking-wider mb-1">PRICE</div>
          <div className="text-2xl font-bold">${token.price?.toFixed(6) || 'N/A'}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="panel-base p-4 clip-angled-border"
        >
          <div className="text-xs text-gray-500 tracking-wider mb-1">MARKET CAP</div>
          <div className="text-2xl font-bold">
            {token.marketCap ? `$${(token.marketCap / 1000000).toFixed(2)}M` : 'N/A'}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="panel-base p-4 clip-angled-border"
        >
          <div className="text-xs text-gray-500 tracking-wider mb-1">HOLDERS</div>
          <div className="text-2xl font-bold">{token.holders.toLocaleString()}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="panel-base p-4 clip-angled-border"
        >
          <div className="text-xs text-gray-500 tracking-wider mb-1">SUPPLY</div>
          <div className="text-2xl font-bold">
            {parseFloat(token.supply).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Price Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 panel-base p-6 clip-angled-border"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold tracking-wider">PRICE CHART</h2>
            <div className="flex gap-2">
              {['1h', '24h', '7d', '30d'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf as any)}
                  className={`px-3 py-1 text-xs tracking-wider transition-colors ${
                    timeframe === tf
                      ? 'bg-white text-black'
                      : 'bg-black/60 border border-white/20 hover:bg-black/80'
                  }`}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {historyLoading ? (
            <Skeleton baseColor="#1a1a1a" highlightColor="#2a2a2a" height={300} />
          ) : priceHistory && priceHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={priceHistory}>
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(ts) => new Date(ts * 1000).toLocaleTimeString()}
                  stroke="#666"
                />
                <YAxis stroke="#666" domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                  labelFormatter={(ts) => new Date(ts * 1000).toLocaleString()}
                  formatter={(value: any) => [`$${value.toFixed(6)}`, 'Price']}
                />
                <Line type="monotone" dataKey="price" stroke="#fff" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No price history available
            </div>
          )}
        </motion.div>

        {/* Token Info */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="panel-base p-6 clip-angled-border"
        >
          <h2 className="text-xl font-bold tracking-wider mb-4">TOKEN INFO</h2>
          
          <div className="space-y-4">
            {token.description && (
              <div>
                <div className="text-xs text-gray-500 tracking-wider mb-1">DESCRIPTION</div>
                <div className="text-sm text-gray-300">{token.description}</div>
              </div>
            )}

            <div>
              <div className="text-xs text-gray-500 tracking-wider mb-1">CONTRACT ADDRESS</div>
              <div className="text-xs font-mono text-gray-300 break-all">{address}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500 tracking-wider mb-1">DECIMALS</div>
              <div className="text-sm">{token.decimals}</div>
            </div>

            {/* Social Links */}
            {(token.website || token.twitter || token.telegram) && (
              <div>
                <div className="text-xs text-gray-500 tracking-wider mb-2">LINKS</div>
                <div className="flex flex-col gap-2">
                  {token.website && (
                    <a
                      href={token.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-2"
                    >
                      🌐 Website →
                    </a>
                  )}
                  {token.twitter && (
                    <a
                      href={token.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-2"
                    >
                      🐦 Twitter →
                    </a>
                  )}
                  {token.telegram && (
                    <a
                      href={token.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-2"
                    >
                      📱 Telegram →
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* External DEX Links */}
            <div className="pt-4 border-t border-white/10">
              <div className="text-xs text-gray-500 tracking-wider mb-2">TRADE</div>
              <div className="space-y-2">
                <a
                  href={`https://raydium.io/swap/?inputCurrency=sol&outputCurrency=${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-2 bg-black/60 border border-white/20 hover:bg-black/80 text-xs text-center tracking-wider transition-colors"
                >
                  RAYDIUM →
                </a>
                <a
                  href={`https://jup.ag/swap/SOL-${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-2 bg-black/60 border border-white/20 hover:bg-black/80 text-xs text-center tracking-wider transition-colors"
                >
                  JUPITER →
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

