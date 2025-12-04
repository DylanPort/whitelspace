'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import PanelFrame from './PanelFrame';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface Subscription {
  apiKey: string;
  packageName: string;
  rateLimit: number;
  expiresAt: number;
  isActive: boolean;
}

// Mini bar chart component
const MiniChart = ({ data, color }: { data: number[], color: string }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((value, i) => (
        <motion.div
          key={i}
          className={`w-1.5 rounded-t ${color}`}
          initial={{ height: 0 }}
          animate={{ height: `${(value / max) * 100}%` }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          style={{ minHeight: value > 0 ? '2px' : '1px', opacity: value > 0 ? 1 : 0.2 }}
        />
      ))}
    </div>
  );
};

export default function SubscriptionStatusPanel() {
  const { publicKey, connected } = useWallet();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  // Mock usage data (all zeros for preview)
  const usageData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const queryData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  useEffect(() => {
    if (connected && publicKey) {
      loadSubscription();
    } else {
      setSubscription(null);
      setLoading(false);
    }
  }, [connected, publicKey]);

  const loadSubscription = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      // TODO: Fetch subscription from backend/KV
      const mockSub: Subscription = {
        apiKey: publicKey.toBase58(),
        packageName: 'Month Pass',
        rateLimit: 200,
        expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        isActive: false // No active subscription yet
      };
      
      setSubscription(mockSub);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyApiKey = async () => {
    if (!subscription) return;

    setCopying(true);
    try {
      await navigator.clipboard.writeText(subscription.apiKey);
      toast.success('API key copied!');
    } catch (error) {
      toast.error('Failed to copy');
    } finally {
      setCopying(false);
    }
  };

  const formatTimeRemaining = (expiresAt: number) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = expiresAt - now;

    if (remaining <= 0) return 'Expired';

    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  if (!connected) {
    return (
      <PanelFrame
        cornerType="silver"
        className="min-h-[200px] flex items-center justify-center"
      >
        <div className="text-center text-gray-500 text-sm">
          Connect wallet to view subscription
        </div>
      </PanelFrame>
    );
  }

  if (loading) {
    return (
      <PanelFrame
        cornerType="silver"
        className="min-h-[200px] flex items-center justify-center"
      >
        <div className="text-center text-gray-500 text-sm animate-pulse">
          Loading subscription...
        </div>
      </PanelFrame>
    );
  }

  if (!subscription?.isActive) {
    return (
      <PanelFrame
        cornerType="silver"
        className="min-h-[200px]"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold tracking-[0.15em]">
              API DASHBOARD
            </h3>
            <div className="px-2 py-0.5 rounded text-[8px] font-bold bg-gray-500/20 text-gray-400">
              NO SUBSCRIPTION
            </div>
          </div>

          {/* API Key Preview */}
          <div className="space-y-2">
            <div className="text-[9px] text-gray-500 font-semibold tracking-wider">
              YOUR API KEY
            </div>
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded p-2">
              <code className="flex-1 text-[10px] text-gray-600 font-mono">
                ••••••••••••••••••••••••••••••••
              </code>
              <div className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[9px] text-gray-500">
                LOCKED
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-4 gap-3">
            {/* Total Queries */}
            <div className="bg-black/30 rounded border border-white/5 p-2">
              <div className="text-[8px] text-gray-500 mb-1">TOTAL QUERIES</div>
              <div className="text-lg font-bold text-white">0</div>
              <MiniChart data={queryData} color="bg-emerald-500/50" />
            </div>

            {/* Requests Today */}
            <div className="bg-black/30 rounded border border-white/5 p-2">
              <div className="text-[8px] text-gray-500 mb-1">TODAY</div>
              <div className="text-lg font-bold text-white">0</div>
              <MiniChart data={usageData} color="bg-blue-500/50" />
            </div>

            {/* Rate Limit */}
            <div className="bg-black/30 rounded border border-white/5 p-2">
              <div className="text-[8px] text-gray-500 mb-1">RATE LIMIT</div>
              <div className="text-lg font-bold text-gray-500">--</div>
              <div className="text-[8px] text-gray-600 mt-1">req/sec</div>
            </div>

            {/* Quota */}
            <div className="bg-black/30 rounded border border-white/5 p-2">
              <div className="text-[8px] text-gray-500 mb-1">QUOTA LEFT</div>
              <div className="text-lg font-bold text-gray-500">--</div>
              <div className="w-full h-1 bg-white/5 rounded mt-2">
                <div className="h-full bg-gray-500/30 rounded" style={{ width: '0%' }} />
              </div>
            </div>
          </div>

          {/* Usage Chart Preview */}
          <div className="bg-black/30 rounded border border-white/5 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[9px] text-gray-500 font-semibold">USAGE (24H)</div>
              <div className="text-[8px] text-gray-600">No data</div>
            </div>
            <div className="flex items-end justify-between h-12 gap-1">
              {Array(24).fill(0).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-white/5 rounded-t"
                  style={{ height: '4px' }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[7px] text-gray-600">00:00</span>
              <span className="text-[7px] text-gray-600">12:00</span>
              <span className="text-[7px] text-gray-600">24:00</span>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center pt-2 border-t border-white/10">
            <div className="text-[10px] text-gray-400 mb-1">
              Purchase a package to unlock your API key
            </div>
            <div className="text-[8px] text-gray-600">
              Metrics and usage tracking will appear here
            </div>
          </div>
        </div>
      </PanelFrame>
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const isExpired = subscription.expiresAt <= now;
  const expiringSoon = subscription.expiresAt - now < 7 * 24 * 60 * 60; // Less than 7 days

  return (
    <PanelFrame
      cornerType="silver"
      className="min-h-[200px]"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold tracking-[0.15em]">
            SUBSCRIPTION STATUS
          </h3>
          <div className={`px-2 py-0.5 rounded text-[8px] font-bold ${
            isExpired 
              ? 'bg-red-500/20 text-red-400'
              : expiringSoon
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            {isExpired ? 'EXPIRED' : 'ACTIVE'}
          </div>
        </div>

        {/* Package Info */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Package:</span>
            <span className="font-semibold text-white">{subscription.packageName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Rate Limit:</span>
            <span className="text-white">{subscription.rateLimit} req/min</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Status:</span>
            <span className={isExpired ? 'text-red-400' : 'text-emerald-400'}>
              {formatTimeRemaining(subscription.expiresAt)}
            </span>
          </div>
        </div>

        {/* API Key */}
        <div className="border-t border-white/10 pt-4 space-y-2">
          <div className="text-[9px] text-gray-500 font-semibold tracking-wider">
            YOUR API KEY
          </div>
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded p-2">
            <code className="flex-1 text-[10px] text-gray-300 font-mono truncate">
              {subscription.apiKey}
            </code>
            <button
              onClick={copyApiKey}
              disabled={copying}
              className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[9px] text-white transition-colors"
            >
              {copying ? '✓' : 'COPY'}
            </button>
          </div>
        </div>

        {/* Quick Start */}
        <div className="border-t border-white/10 pt-4 space-y-2">
          <div className="text-[9px] text-gray-500 font-semibold tracking-wider">
            QUICK START
          </div>
          <div className="bg-black/40 border border-white/10 rounded p-3 space-y-2">
            <div className="text-[9px] text-gray-400">Add header to your requests:</div>
            <code className="block text-[9px] text-emerald-400 font-mono">
              X-API-Key: {subscription.apiKey.slice(0, 20)}...
            </code>
          </div>
        </div>

        {/* RPC Endpoint */}
        <div className="text-center">
          <div className="text-[9px] text-gray-500 mb-1">Endpoint:</div>
          <code className="text-xs text-emerald-400 font-mono">
            https://rpc.whistlenet.io
          </code>
        </div>

        {/* Expiring Warning */}
        {expiringSoon && !isExpired && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 text-center">
            <div className="text-xs text-yellow-400">
              ⚠️ Subscription expiring soon
            </div>
            <div className="text-[9px] text-gray-400 mt-1">
              Renew now to avoid service interruption
            </div>
          </div>
        )}

        {/* Expired Warning */}
        {isExpired && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-center">
            <div className="text-xs text-red-400">
              🔒 Subscription expired
            </div>
            <div className="text-[9px] text-gray-400 mt-1">
              Purchase a new package to restore access
            </div>
          </div>
        )}
      </div>
    </PanelFrame>
  );
}



