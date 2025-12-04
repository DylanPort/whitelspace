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

const ENDPOINTS = [
  { name: 'RPC', url: 'rpc.whistle.ninja', desc: 'JSON-RPC 2.0' },
  { name: 'WSS', url: 'wss://rpc.whistle.ninja', desc: 'WebSocket' },
  { name: 'GEYSER', url: 'geyser.whistle.ninja', desc: 'Real-time data' },
];

// Treasury wallet for RPC payments
const TREASURY_WALLET = new PublicKey('BMiSBoT5aPCrFcxaTrHuzXMkfrtzCLMcDYqrPTVymNbU');

export default function QueryInterfacePanel() {
  const { publicKey, sendTransaction, connected } = useWallet();
  const [loading, setLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

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

  const copyEndpoint = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <PanelFrame
      cornerType="silver"
      className="min-h-[620px] flex flex-col"
      motionProps={{
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.6 }
      }}
    >
      {/* Endpoints Section */}
      <div className="mb-4">
        <h3 className="text-[11px] font-semibold tracking-[0.15em] mb-3">
          RPC ENDPOINTS
        </h3>
        <div className="space-y-2">
          {ENDPOINTS.map((ep, i) => (
            <motion.div
              key={ep.name}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center justify-between p-2 bg-black/30 rounded border border-white/5 hover:border-emerald-500/30 transition-all group"
            >
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-bold text-emerald-400 w-12">{ep.name}</span>
                <span className="text-[8px] text-gray-400 font-mono">{ep.url}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[7px] text-gray-500">{ep.desc}</span>
                <button
                  onClick={() => copyEndpoint(ep.url)}
                  className="text-[7px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {copied === ep.url ? '✓' : 'COPY'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { icon: '⚡', label: 'Low Latency', desc: '<50ms avg' },
          { icon: '🔄', label: 'WebSocket', desc: 'Real-time updates' },
          { icon: '📊', label: 'Data Stream', desc: 'Account changes' },
          { icon: '🧩', label: 'Widgets', desc: 'Embeddable UI' },
        ].map((feat, i) => (
          <motion.div
            key={feat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            className="p-2 bg-black/20 rounded border border-white/5 text-center"
          >
            <div className="text-sm mb-1">{feat.icon}</div>
            <div className="text-[8px] font-semibold text-white">{feat.label}</div>
            <div className="text-[7px] text-gray-500">{feat.desc}</div>
          </motion.div>
        ))}
      </div>

      {/* Packages Section */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-semibold tracking-[0.15em]">
            PACKAGES
          </h3>
          <div className="text-[7px] text-emerald-400 tracking-wider">
            100% TO COMMUNITY
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          {RPC_PACKAGES.map((pkg, i) => (
            <motion.div 
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className={`flex-1 p-2 rounded border transition-all cursor-pointer ${
                pkg.popular 
                  ? 'border-blue-500/50 bg-blue-500/10' 
                  : 'border-white/10 bg-black/20 hover:border-white/20'
              }`}
            >
              <div className="text-center mb-2">
                <div className="flex items-center justify-center gap-1">
                  <span className={`text-[9px] font-bold ${
                    pkg.color === 'emerald' ? 'text-emerald-400' :
                    pkg.color === 'blue' ? 'text-blue-400' : 'text-purple-400'
                  }`}>
                    {pkg.name}
                  </span>
                  {pkg.popular && (
                    <span className="text-[6px] px-1 py-0.5 bg-blue-500/30 text-blue-300 rounded">★</span>
                  )}
                </div>
                <div className="text-[14px] font-bold text-white mt-1">{pkg.price}</div>
                <div className="text-[7px] text-gray-500">SOL</div>
              </div>
              
              <div className="text-[7px] text-gray-400 text-center mb-2 h-6 flex items-center justify-center">
                {pkg.tag}
              </div>

              <button
                onClick={() => handlePurchase(pkg)}
                disabled={loading !== null || !connected}
                className={`w-full py-1.5 rounded text-[7px] font-bold tracking-wider transition-all ${
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
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom Info */}
      <div className="pt-2 border-t border-white/10">
        <p className="text-[7px] text-gray-500 text-center">
          Powered by WHISTLE validators • Decentralized infrastructure
        </p>
      </div>
    </PanelFrame>
  );
}
