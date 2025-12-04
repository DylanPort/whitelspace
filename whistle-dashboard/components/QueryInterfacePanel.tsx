'use client';

import { useState } from 'react';
import PanelFrame from './PanelFrame';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { motion } from 'framer-motion';

const RPC_PACKAGES = [
  { 
    id: 'basic',
    name: 'BASIC',
    price: 0.2,
    tag: '100 req/min',
    color: 'emerald'
  },
  { 
    id: 'advanced',
    name: 'ADVANCED',
    price: 1,
    tag: 'No limits',
    color: 'blue',
    popular: true
  },
  { 
    id: 'premium',
    name: 'PREMIUM',
    price: 2,
    tag: 'Unlimited + Stream',
    color: 'purple'
  },
];

// Treasury wallet for RPC payments
const TREASURY_WALLET = new PublicKey('BMiSBoT5aPCrFcxaTrHuzXMkfrtzCLMcDYqrPTVymNbU');

export default function QueryInterfacePanel() {
  const { publicKey, sendTransaction, connected } = useWallet();
  const [loading, setLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePurchase = async (pkg: typeof RPC_PACKAGES[0]) => {
    if (!publicKey || !sendTransaction) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(pkg.id);
    setSuccess(null);

    try {
      const connection = new Connection('https://rpc.whistle.ninja', 'confirmed');
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: TREASURY_WALLET,
          lamports: pkg.price * LAMPORTS_PER_SOL,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      setSuccess(pkg.id);
      setTimeout(() => setSuccess(null), 5000);
      
    } catch (err: any) {
      console.error('Purchase failed:', err);
      alert(err.message || 'Purchase failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <PanelFrame
      cornerType="silver"
      className="h-[280px] flex flex-col"
      motionProps={{
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.6 }
      }}
    >
      {/* Packages Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-semibold tracking-[0.15em]">
          RPC PACKAGES
        </h3>
        <div className="text-[7px] text-emerald-400 tracking-wider">
          100% TO COMMUNITY
        </div>
      </div>

      {/* Packages List - Row Layout */}
      <div className="space-y-2 flex-1">
        {RPC_PACKAGES.map((pkg, i) => (
          <motion.div 
            key={pkg.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.1 }}
            whileHover={{ scale: 1.01 }}
            className={`p-2.5 rounded border transition-all flex items-center justify-between ${
              pkg.popular 
                ? 'border-blue-500/50 bg-blue-500/10' 
                : 'border-white/10 bg-black/20 hover:border-white/20'
            }`}
          >
            {/* Left: Name + Tag */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold ${
                  pkg.color === 'emerald' ? 'text-emerald-400' :
                  pkg.color === 'blue' ? 'text-blue-400' : 'text-purple-400'
                }`}>
                  {pkg.name}
                </span>
                {pkg.popular && (
                  <span className="text-[6px] px-1 py-0.5 bg-blue-500/30 text-blue-300 rounded">★</span>
                )}
              </div>
              <span className="text-[8px] text-gray-400">{pkg.tag}</span>
            </div>

            {/* Right: Price + Button */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[14px] font-bold text-white">{pkg.price}</span>
                <span className="text-[8px] text-gray-500 ml-1">SOL</span>
              </div>
              <button
                onClick={() => handlePurchase(pkg)}
                disabled={loading !== null || !connected}
                className={`px-3 py-1.5 rounded text-[8px] font-bold tracking-wider transition-all ${
                  success === pkg.id
                    ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                    : loading === pkg.id
                    ? 'bg-gray-500/20 border border-gray-500/30 text-gray-400 cursor-wait'
                    : !connected
                    ? 'bg-gray-500/10 border border-gray-500/20 text-gray-500'
                    : pkg.color === 'emerald' 
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                    : pkg.color === 'blue'
                    ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                    : 'bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20'
                }`}
              >
                {success === pkg.id ? '✓' : loading === pkg.id ? '...' : 'BUY'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom Info */}
      <div className="pt-2 mt-2 border-t border-white/10">
        <p className="text-[7px] text-gray-500 text-center">
          Powered by WHISTLE validators • Decentralized
        </p>
      </div>
    </PanelFrame>
  );
}
