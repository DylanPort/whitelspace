'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { fetchStakerAccount } from '@/lib/contract';

export default function PersonalStatsPanel() {
  const { publicKey, connected } = useWallet();
  const [stakerData, setStakerData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!publicKey || !connected) {
        setStakerData(null);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchStakerAccount(publicKey);
        setStakerData(data);
      } catch (error) {
        console.error('Error fetching staker data:', error);
        setStakerData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [publicKey, connected]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="panel-base p-4 rounded-[12px] clip-angled-border"
    >
      <h3 className="text-[10px] font-semibold mb-3 tracking-[0.15em]">
        PERSONAL STATS
      </h3>

      {!connected ? (
        <div className="text-center py-6 text-gray-500 text-xs">
          Connect wallet to view stats
        </div>
      ) : loading ? (
        <div className="text-center py-6 text-gray-500 text-xs">
          Loading...
        </div>
      ) : !stakerData ? (
        <div className="text-center py-6 text-gray-500 text-xs">
          No staking data found
        </div>
      ) : (
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Voting Power</span>
            <span className="font-semibold">
              {stakerData.votingPower?.toLocaleString() || '0'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Pending Rewards</span>
            <span className="font-semibold">
              {(Number(stakerData.pendingRewards) / 1e9).toFixed(6)} SOL
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Node Operator</span>
            <span className="font-semibold">
              {stakerData.nodeOperator ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

