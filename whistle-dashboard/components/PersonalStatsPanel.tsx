'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { fetchStakerAccount, lamportsToSol, connection } from '@/lib/contract';
import PanelFrame from './PanelFrame';

export default function PersonalStatsPanel() {
  const { publicKey } = useWallet();
  const [stats, setStats] = useState({
    votingPower: 0,
    pendingRewards: 0,
    isOperator: false
  });

  useEffect(() => {
    async function loadStats() {
      if (!publicKey) {
        setStats({ votingPower: 0, pendingRewards: 0, isOperator: false });
        return;
      }

      try {
        const staker = await fetchStakerAccount(publicKey);
        if (staker) {
          setStats({
            votingPower: Number(staker.votingPower), // Raw units for now
            pendingRewards: 0, // Would need logic to calc
            isOperator: false // Would check provider account
          });
        }
      } catch (err) {
        console.error('Failed to load personal stats:', err);
      }
    }

    loadStats();
  }, [publicKey]);

  return (
    <PanelFrame
      cornerType="none"
      variant="darker"
      className="p-4 rounded-[12px]"
      motionProps={{
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, delay: 0.2 }
      }}
    >
      <h3 className="text-[10px] font-semibold mb-3 tracking-[0.15em]">
        PERSONAL STATS
      </h3>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Voting Power</span>
          <span className="font-semibold">{stats.votingPower.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Pending Rewards</span>
          <span className="font-semibold">{stats.pendingRewards.toFixed(6)} SOL</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Node Operator</span>
          <span className="font-semibold">{stats.isOperator ? 'Yes' : 'No'}</span>
        </div>
      </div>
    </PanelFrame>
  );
}
