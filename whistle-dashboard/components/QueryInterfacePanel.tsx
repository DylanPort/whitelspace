'use client';

import { useState } from 'react';
import PanelFrame from './PanelFrame';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

const RPC_PACKAGES = [
  { 
    id: 'basic',
    name: 'BASIC',
    price: 0.2,
    features: ['100 req/min', 'Standard latency', 'HTTP only'],
    color: 'emerald'
  },
  { 
    id: 'advanced',
    name: 'ADVANCED',
    price: 1,
    features: ['No rate limits', 'Priority routing', 'WebSocket access'],
    color: 'blue',
    popular: true
  },
  { 
    id: 'premium',
    name: 'PREMIUM',
    price: 2,
    features: ['Unlimited usage', 'Data streaming', 'Dedicated node', 'Priority support'],
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
      className="min-h-[380px] flex flex-col"
      motionProps={{
        initial: { opacity: 0, x: -50 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.6 }
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-semibold tracking-[0.15em]">
          RPC PACKAGES
        </h3>
        <div className="text-[8px] text-emerald-400 tracking-wider">
          100% TO COMMUNITY
        </div>
      </div>

      <div className="space-y-3 flex-1">
        {RPC_PACKAGES.map((pkg) => (
          <div 
            key={pkg.id}
            className={`p-3 rounded border transition-all ${
              pkg.popular 
                ? 'border-blue-500/50 bg-blue-500/5' 
                : 'border-white/10 bg-black/20 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold text-${pkg.color}-400`}>
                  {pkg.name}
                </span>
                {pkg.popular && (
                  <span className="text-[7px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                    POPULAR
                  </span>
                )}
              </div>
              <span className="text-[12px] font-bold text-white">
                {pkg.price} SOL
              </span>
            </div>
            
            <div className="space-y-1 mb-3">
              {pkg.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-[8px] text-gray-400">
                  <span className={`text-${pkg.color}-400`}>✓</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handlePurchase(pkg)}
              disabled={loading !== null || !connected}
              className={`w-full py-2 rounded text-[9px] font-bold tracking-wider transition-all ${
                success === pkg.id
                  ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                  : loading === pkg.id
                  ? 'bg-gray-500/20 border border-gray-500/30 text-gray-400 cursor-wait'
                  : !connected
                  ? 'bg-gray-500/10 border border-gray-500/20 text-gray-500 cursor-not-allowed'
                  : `bg-${pkg.color}-500/10 border border-${pkg.color}-500/30 text-${pkg.color}-400 hover:bg-${pkg.color}-500/20`
              }`}
            >
              {success === pkg.id ? '✓ PURCHASED' : loading === pkg.id ? 'PROCESSING...' : !connected ? 'CONNECT WALLET' : 'PURCHASE'}
            </button>
          </div>
        ))}
      </div>

      <div className="pt-3 mt-3 border-t border-white/10">
        <p className="text-[8px] text-gray-500 text-center leading-relaxed">
          All payments are redistributed to the WHISTLE community.
          <br />
          No middlemen. 100% decentralized.
        </p>
      </div>
    </PanelFrame>
  );
}
