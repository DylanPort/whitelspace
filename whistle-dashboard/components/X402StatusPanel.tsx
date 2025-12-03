'use client';

import { useEffect, useState } from 'react';
import PanelFrame from './PanelFrame';
import { getX402Status, formatTimeUntilDistribution, type X402Status } from '@/lib/x402-monitor';

export default function X402StatusPanel() {
  const [status, setStatus] = useState<X402Status | null>(null);
  const [timeUntilNext, setTimeUntilNext] = useState('~1 hour');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStatus() {
      setLoading(true);
      try {
        const x402Status = await getX402Status();
        setStatus(x402Status);
      } catch (err) {
        console.error('Failed to load X402 status:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
    
    // Update time until next distribution
    const updateTime = () => setTimeUntilNext(formatTimeUntilDistribution());
    updateTime();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadStatus();
      updateTime();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    // You could add a toast here for feedback
  };

  return (
    <PanelFrame
      cornerType="gold"
      className="min-h-[320px] flex flex-col"
      motionProps={{
        initial: { opacity: 0, y: -50 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, delay: 0.2 }
      }}
    >
      <h3 className="text-[11px] font-semibold mb-4 tracking-[0.15em] text-emerald-400">
        X402 PAYMENT SYSTEM
      </h3>

      <div className="space-y-4">
        {/* X402 Collection Wallet */}
        <div className="bg-black/40 rounded-lg p-3">
          <div className="text-[9px] text-gray-500 mb-1">COLLECTION WALLET</div>
          <div 
            className="text-[10px] font-mono text-emerald-400 cursor-pointer hover:text-emerald-300 transition-colors"
            onClick={() => copyAddress('BMiSBoT5aPCrFcxaTrHuzXMkfrtzCLMcDYqrPTVymNbU')}
            title="Click to copy"
          >
            BMiSBoT5...ymNbU
          </div>
          <div className="text-[18px] font-bold mt-2">
            {loading || !status ? '...' : status.walletBalance.toFixed(4)}
            <span className="text-[10px] text-gray-400 ml-1">SOL</span>
          </div>
          {status && status.nextDistribution?.willTrigger && !loading && (
            <div className="text-[9px] text-yellow-400 mt-1 animate-pulse">
              Ready for distribution
            </div>
          )}
        </div>

        {/* Distribution Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/40 rounded-lg p-3">
            <div className="text-[9px] text-gray-500 mb-1">90% STAKERS</div>
            <div className="text-[16px] font-bold text-white">
              {loading || !status ? '...' : status.stakerPool.toFixed(2)}
            </div>
            <div className="text-[9px] text-gray-600">SOL Available</div>
          </div>

          <div className="bg-black/40 rounded-lg p-3">
            <div className="text-[9px] text-gray-500 mb-1">10% TREASURY</div>
            <div className="text-[16px] font-bold text-white">
              {loading || !status ? '...' : status.treasuryPool.toFixed(2)}
            </div>
            <div className="text-[9px] text-gray-600">SOL Reserved</div>
          </div>
        </div>

        {/* Payment Vault Status */}
        <div className="bg-black/40 rounded-lg p-3">
          <div className="text-[9px] text-gray-500 mb-1">TOTAL DISTRIBUTED</div>
          <div className="text-[16px] font-bold">
            {loading || !status ? '...' : status.totalDistributed.toFixed(4)}
            <span className="text-[10px] text-gray-400 ml-1">SOL</span>
          </div>
          <div className="text-[9px] text-gray-600 mt-1">All-time X402 payments</div>
        </div>

        {/* Distribution Schedule */}
        <div className="border-t border-white/10 pt-3">
          <div className="text-[9px] text-gray-500 mb-2">DISTRIBUTION SCHEDULE</div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-400">Next Check:</span>
            <span className="text-white">{timeUntilNext}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] mt-1">
            <span className="text-gray-400">Min Threshold:</span>
            <span className="text-white">0.01 SOL</span>
          </div>
          <div className="flex items-center justify-between text-[10px] mt-1">
            <span className="text-gray-400">Status:</span>
            <span className="text-emerald-400">🟢 Active</span>
          </div>
        </div>

        {/* Configuration Note */}
        <div className="text-[9px] text-gray-600 text-center pt-2 border-t border-white/5">
          Configure your X402 gateway to send payments to the collection wallet
        </div>
      </div>
    </PanelFrame>
  );
}
