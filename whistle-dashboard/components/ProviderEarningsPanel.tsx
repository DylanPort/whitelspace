'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { fetchProviderAccount, createClaimProviderEarningsTransaction, lamportsToSol, connection } from '@/lib/contract';

export default function ProviderEarningsPanel() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const [earnings, setEarnings] = useState(0);
  const [loading, setLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    async function loadProviderData() {
      if (!publicKey) {
        setEarnings(0);
        return;
      }

      setLoading(true);
      try {
        const providerAccount = await fetchProviderAccount(publicKey);
        if (providerAccount) {
          setEarnings(lamportsToSol(providerAccount.pendingEarnings));
        } else {
          // Not a provider yet
          setEarnings(0);
        }
      } catch (err) {
        console.error('Failed to load provider account:', err);
        // Not a provider or error - show 0
        setEarnings(0);
      } finally {
        setLoading(false);
      }
    }

    loadProviderData();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadProviderData, 30000);
    return () => clearInterval(interval);
  }, [publicKey]);

  const handleWithdraw = async () => {
    if (!publicKey || !connected || earnings === 0) return;

    setWithdrawing(true);
    try {
      const transaction = await createClaimProviderEarningsTransaction(publicKey);
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      console.log('Claim earnings transaction:', signature);
      alert(`✅ Earnings claimed successfully!\n\nAmount: ${earnings.toFixed(4)} SOL\nSignature: ${signature}`);
      
      // Refresh balance
      setEarnings(0);
    } catch (err: any) {
      console.error('Claim failed:', err);
      alert(`❌ Claim failed: ${err.message || 'Unknown error'}`);
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="panel-base p-6 rounded-[16px] clip-angled-border"
    >
      <h3 className="text-[11px] font-semibold mb-6 tracking-[0.15em]">
        PROVIDER EARNINGS
      </h3>

      <div className="text-center space-y-6">
        <div>
          {loading ? (
            <div className="text-[40px] font-bold leading-none tracking-tight text-gray-600">
              --
            </div>
          ) : (
            <div className="text-[56px] font-bold leading-none tracking-tight">
              {earnings.toFixed(2)}
            </div>
          )}
          <div className="text-xs text-gray-400 tracking-widest mt-2">SOL</div>
        </div>

        <button
          disabled={!connected || earnings === 0 || withdrawing}
          onClick={handleWithdraw}
          className="btn-primary w-full"
        >
          {withdrawing ? 'CLAIMING...' : 'CLAIM EARNINGS'}
        </button>
      </div>
    </motion.div>
  );
}
