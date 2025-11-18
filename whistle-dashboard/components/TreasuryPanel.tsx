'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { connection, PAYMENT_VAULT_ADDRESS } from '@/lib/contract';

export default function TreasuryPanel() {
  const [balance, setBalance] = useState<number>(0);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const accountInfo = await connection.getAccountInfo(PAYMENT_VAULT_ADDRESS);
        if (accountInfo) {
          setBalance(accountInfo.lamports / 1e9);
          setInitialized(true);
        } else {
          setInitialized(false);
        }
      } catch (error) {
        console.error('Error fetching treasury balance:', error);
        setInitialized(false);
      } finally {
        setLoading(false);
      }
    }

    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="panel-base p-4 rounded-[12px] clip-angled-border"
    >
      <h3 className="text-[10px] font-semibold mb-3 tracking-[0.15em]">
        TREASURY
      </h3>

      {loading ? (
        <div className="text-center py-6 text-gray-500 text-xs">
          Loading...
        </div>
      ) : !initialized ? (
        <div className="text-center py-6">
          <div className="text-gray-500 text-xs mb-2">Payment vault not initialized yet</div>
          <div className="text-gray-600 text-[10px]">
            Vault will activate with first query payment
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Payment Vault</span>
            <span className="font-semibold text-green-400">
              Active
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">SOL Balance</span>
            <span className="font-semibold">
              {balance.toFixed(6)} SOL
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Address</span>
            <span className="font-mono text-[10px]">
              {PAYMENT_VAULT_ADDRESS.toBase58().slice(0, 8)}...
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

