'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { connection, STAKING_POOL_ADDRESS } from '@/lib/contract';

export default function PoolInfoPanel() {
  const [poolData, setPoolData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPoolData() {
      try {
        const accountInfo = await connection.getAccountInfo(STAKING_POOL_ADDRESS);
        if (accountInfo) {
          setPoolData({
            balance: accountInfo.lamports / 1e9,
            dataSize: accountInfo.data.length,
          });
        }
      } catch (error) {
        console.error('Error fetching pool data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPoolData();
    const interval = setInterval(fetchPoolData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="panel-base p-4 rounded-[12px] clip-angled-border"
    >
      <h3 className="text-[10px] font-semibold mb-3 tracking-[0.15em]">
        POOL INFO
      </h3>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Contract</span>
          <span className="font-mono text-[10px]">
            {STAKING_POOL_ADDRESS.toBase58().slice(0, 8)}...
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">SOL Balance</span>
          <span className="font-semibold">
            {loading ? '...' : poolData?.balance.toFixed(4) || '0.0000'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Data Size</span>
          <span className="font-semibold">
            {loading ? '...' : poolData?.dataSize || '0'} bytes
          </span>
        </div>
      </div>
    </motion.div>
  );
}
