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
    features: ['10 req/sec', '10M requests'],
  },
  { 
    id: 'advanced',
    name: 'ADVANCED',
    price: 1,
    features: ['20 req/sec', '30M requests', 'Widgets'],
    popular: true
  },
  { 
    id: 'premium',
    name: 'PREMIUM',
    price: 2,
    features: ['Unlimited', 'Geyser Stream', 'Widgets'],
    gold: true
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
      className="h-[280px] flex flex-col overflow-hidden"
      motionProps={{
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.6 }
      }}
    >
      {/* Packages Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-semibold tracking-[0.15em]">
          RPC PACKAGES
        </h3>
        <div className="text-[7px] text-cyan-400 tracking-wider">
          100% TO COMMUNITY
        </div>
      </div>

      {/* Packages List */}
      <div className="space-y-1.5 flex-1 overflow-y-auto">
        {RPC_PACKAGES.map((pkg, i) => (
          <motion.div 
            key={pkg.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.1 }}
            whileHover={{ scale: 1.01 }}
            className={`p-2 rounded border transition-all ${
              pkg.gold 
                ? 'border-yellow-500/50 bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-yellow-500/10' 
                : pkg.popular
                ? 'border-white/30 bg-white/5'
                : 'border-white/10 bg-black/20 hover:border-white/20'
            }`}
            style={pkg.gold ? {
              boxShadow: '0 0 15px rgba(234, 179, 8, 0.15), inset 0 0 20px rgba(234, 179, 8, 0.05)'
            } : {}}
          >
            <div className="flex items-center justify-between">
              {/* Left: Price + Name */}
              <div className="flex items-center gap-2">
                <div className={`text-[16px] font-bold ${pkg.gold ? 'text-yellow-400' : 'text-white'}`}>
                  {pkg.price}
                  <span className="text-[8px] text-gray-500 ml-0.5">SOL</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[9px] font-bold ${pkg.gold ? 'text-yellow-400' : 'text-white'}`}>
                    {pkg.name}
                  </span>
                  {pkg.popular && (
                    <span className="text-[6px] px-1 py-0.5 bg-white/10 text-white/70 rounded">★</span>
                  )}
                  {pkg.gold && (
                    <motion.span 
                      className="text-[6px] px-1 py-0.5 bg-yellow-500/20 text-yellow-400 rounded"
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      ✦
                    </motion.span>
                  )}
                </div>
              </div>

              {/* Right: Button */}
              <button
                onClick={() => handlePurchase(pkg)}
                disabled={loading !== null || !connected}
                className={`px-3 py-1 rounded text-[7px] font-bold tracking-wider transition-all ${
                  success === pkg.id
                    ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                    : loading === pkg.id
                    ? 'bg-gray-500/20 border border-gray-500/30 text-gray-400 cursor-wait'
                    : !connected
                    ? 'bg-gray-500/10 border border-gray-500/20 text-gray-500'
                    : pkg.gold
                    ? 'bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/20'
                    : 'bg-white/5 border border-white/20 text-white hover:bg-white/10'
                }`}
              >
                {success === pkg.id ? '✓' : loading === pkg.id ? '...' : 'BUY'}
              </button>
            </div>
            
            {/* Features */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {pkg.features.map((feature, fi) => (
                <span 
                  key={fi}
                  className={`text-[7px] px-1.5 py-0.5 rounded ${
                    pkg.gold 
                      ? 'bg-yellow-500/10 text-yellow-300/80' 
                      : 'bg-white/5 text-gray-400'
                  }`}
                >
                  {feature}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom Info */}
      <div className="pt-1.5 mt-1.5 border-t border-white/10">
        <p className="text-[7px] text-gray-500 text-center">
          Powered by WHISTLE validators
        </p>
      </div>
    </PanelFrame>
  );
}
