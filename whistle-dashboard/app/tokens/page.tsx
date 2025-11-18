'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tokenService, type Token } from '@/lib/services/token.service';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import toast from 'react-hot-toast';

export default function TokensPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'marketCap' | 'volume24h' | 'priceChange24h'>('marketCap');
  const [filterBy, setFilterBy] = useState<'all' | 'new' | 'trending'>('all');

  const { data: tokens, isLoading, error } = useQuery({
    queryKey: ['tokens', filterBy],
    queryFn: () => {
      if (filterBy === 'trending') {
        return tokenService.getTrendingTokens(50);
      }
      return tokenService.getLatestTokens(50);
    },
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['token-search', searchQuery],
    queryFn: () => tokenService.searchTokens(searchQuery),
    enabled: searchQuery.length >= 2,
  });

  const displayTokens = searchQuery.length >= 2 
    ? (searchResults as Token[] || [])
    : (tokens || []);

  const sortedTokens = [...displayTokens].sort((a, b) => {
    if (sortBy === 'marketCap') {
      return (b.marketCap || 0) - (a.marketCap || 0);
    } else if (sortBy === 'volume24h') {
      return ((b as any).volume24h || 0) - ((a as any).volume24h || 0);
    } else {
      return ((b as any).priceChange24h || 0) - ((a as any).priceChange24h || 0);
    }
  });

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied!');
  };

  return (
    <div className="min-h-screen bg-[#050505] p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <Link href="/" className="text-gray-400 hover:text-white text-sm mb-2 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-4xl font-bold tracking-wider mb-2">TOKEN EXPLORER</h1>
        <p className="text-gray-500">Discover and track Solana tokens</p>
      </div>

      {/* Filters & Search */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, symbol, or address..."
              className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm focus:border-white/40 focus:outline-none"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {['all', 'new', 'trending'].map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterBy(filter as any)}
                className={`flex-1 px-4 py-3 text-xs tracking-wider uppercase transition-colors ${
                  filterBy === filter
                    ? 'bg-white text-black'
                    : 'bg-black/60 border border-white/20 hover:bg-black/80'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-4 mt-4">
          <span className="text-xs text-gray-500 tracking-wider uppercase">Sort by:</span>
          <div className="flex gap-2">
            {[
              { key: 'marketCap', label: 'Market Cap' },
              { key: 'volume24h', label: 'Volume' },
              { key: 'priceChange24h', label: '24h Change' },
            ].map((sort) => (
              <button
                key={sort.key}
                onClick={() => setSortBy(sort.key as any)}
                className={`px-3 py-1 text-xs tracking-wider transition-colors ${
                  sortBy === sort.key
                    ? 'text-white border-b-2 border-white'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                {sort.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Token Grid */}
      <div className="max-w-7xl mx-auto">
        {isLoading || searchLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton
                key={i}
                baseColor="#1a1a1a"
                highlightColor="#2a2a2a"
                height={200}
              />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-400 mb-2">⚠ Error loading tokens</div>
            <div className="text-gray-500 text-sm">{(error as Error).message}</div>
          </div>
        ) : sortedTokens.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-2">No tokens found</div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedTokens.map((token, index) => (
              <motion.div
                key={token.address}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/tokens/${token.address}`}>
                  <div className="panel-base p-6 clip-angled-border hover:scale-105 transition-transform cursor-pointer h-full">
                    {/* Token Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {token.image ? (
                          <img
                            src={token.image}
                            alt={token.symbol}
                            className="w-12 h-12 rounded-full"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-xl font-bold">
                            {token.symbol?.[0] || '?'}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-lg">{token.symbol || 'Unknown'}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[150px]">
                            {token.name || token.address.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleCopyAddress(token.address);
                        }}
                        className="text-gray-500 hover:text-white text-xs"
                      >
                        ⧉
                      </button>
                    </div>

                    {/* Token Stats */}
                    <div className="space-y-2">
                      {token.price !== null && (
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500">Price</span>
                          <span className="text-sm font-semibold">${token.price.toFixed(6)}</span>
                        </div>
                      )}
                      {token.marketCap !== null && (
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500">Market Cap</span>
                          <span className="text-sm font-semibold">
                            ${(token.marketCap / 1000).toFixed(2)}K
                          </span>
                        </div>
                      )}
                      {token.holders > 0 && (
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500">Holders</span>
                          <span className="text-sm font-semibold">{token.holders.toLocaleString()}</span>
                        </div>
                      )}
                      {(token as any).priceChange24h !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500">24h Change</span>
                          <span
                            className={`text-sm font-semibold ${
                              (token as any).priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {(token as any).priceChange24h >= 0 ? '+' : ''}
                            {(token as any).priceChange24h.toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* View Details Button */}
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="text-xs text-center text-gray-400 hover:text-white transition-colors">
                        View Details →
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

