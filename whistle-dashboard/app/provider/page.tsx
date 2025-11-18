'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useQuery } from '@tanstack/react-query';
import { fetchProviderAccount, lamportsToSol, createClaimProviderEarningsTransaction, connection } from '@/lib/contract';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ProviderRegistrationModal from '@/components/ProviderRegistrationModal';
import toast from 'react-hot-toast';

export default function ProviderDashboardPage() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const { data: providerAccount, isLoading, refetch } = useQuery({
    queryKey: ['provider-account', publicKey?.toBase58()],
    queryFn: () => fetchProviderAccount(publicKey!),
    enabled: !!publicKey,
  });

  const handleClaimEarnings = async () => {
    if (!publicKey || !providerAccount) return;

    setWithdrawing(true);
    try {
      const transaction = await createClaimProviderEarningsTransaction(publicKey);
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      toast.success(`✅ Earnings claimed: ${lamportsToSol(providerAccount.pendingEarnings).toFixed(4)} SOL`);
      refetch();
    } catch (err: any) {
      console.error('Claim failed:', err);
      toast.error(`❌ Claim failed: ${err.message || 'Unknown error'}`);
    } finally {
      setWithdrawing(false);
    }
  };

  // Mock earnings history (replace with real data from backend)
  const earningsHistory = [
    { date: 'Mon', earned: 0.12 },
    { date: 'Tue', earned: 0.18 },
    { date: 'Wed', earned: 0.15 },
    { date: 'Thu', earned: 0.22 },
    { date: 'Fri', earned: 0.19 },
    { date: 'Sat', earned: 0.25 },
    { date: 'Sun', earned: 0.21 },
  ];

  const queryVolume = [
    { date: 'Mon', queries: 120 },
    { date: 'Tue', queries: 180 },
    { date: 'Wed', queries: 150 },
    { date: 'Thu', queries: 220 },
    { date: 'Fri', queries: 190 },
    { date: 'Sat', queries: 250 },
    { date: 'Sun', queries: 210 },
  ];

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold mb-4 tracking-wider">PROVIDER DASHBOARD</h1>
          <p className="text-gray-400 mb-8">Connect your wallet to view provider dashboard</p>
          <WalletMultiButton />
        </motion.div>
      </div>
    );
  }

  // Show registration button if not a provider
  const showRegisterButton = !providerAccount && !isLoading;

  return (
    <div className="min-h-screen bg-[#050505] p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-gray-400 hover:text-white text-sm mb-2 inline-block">
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-bold tracking-wider">PROVIDER DASHBOARD</h1>
            <p className="text-gray-500 text-sm mt-1">
              {showRegisterButton ? 'Register to become a provider and start earning' : 'Monitor your RPC provider performance'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {showRegisterButton && (
              <button
                onClick={() => setShowRegistrationModal(true)}
                className="btn-primary px-6 py-3"
              >
                REGISTER AS PROVIDER
              </button>
            )}
            <WalletMultiButton />
          </div>
        </div>
      </div>

      {/* Empty state message if not registered */}
      {showRegisterButton && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          <div className="panel-base p-16 clip-angled-border text-center">
            <div className="text-6xl mb-6 opacity-20">🔒</div>
            <h2 className="text-3xl font-bold mb-3 tracking-wider">NOT REGISTERED AS PROVIDER</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Click "REGISTER AS PROVIDER" to start earning SOL by serving RPC queries
            </p>
            <button
              onClick={() => setShowRegistrationModal(true)}
              className="btn-primary px-8 py-3"
            >
              REGISTER NOW
            </button>
          </div>
        </motion.div>
      )}

      {/* Stats Overview - Only show if provider is registered */}
      {providerAccount && (
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel-base p-6 clip-angled-border"
        >
          <div className="text-gray-500 text-xs tracking-wider mb-2">PENDING EARNINGS</div>
          {isLoading ? (
            <Skeleton baseColor="#1a1a1a" highlightColor="#2a2a2a" height={32} />
          ) : (
            <>
              <div className="text-3xl font-bold">{lamportsToSol(providerAccount?.pendingEarnings || BigInt(0)).toFixed(4)}</div>
              <div className="text-xs text-gray-500 mt-1">SOL</div>
              <button
                onClick={handleClaimEarnings}
                disabled={!providerAccount || providerAccount.pendingEarnings === BigInt(0) || withdrawing}
                className="btn-primary w-full mt-3 text-xs"
              >
                {withdrawing ? 'CLAIMING...' : 'CLAIM'}
              </button>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="panel-base p-6 clip-angled-border"
        >
          <div className="text-gray-500 text-xs tracking-wider mb-2">TOTAL EARNED</div>
          {isLoading ? (
            <Skeleton baseColor="#1a1a1a" highlightColor="#2a2a2a" height={32} />
          ) : (
            <>
              <div className="text-3xl font-bold">{lamportsToSol(providerAccount?.totalEarned || BigInt(0)).toFixed(4)}</div>
              <div className="text-xs text-gray-500 mt-1">SOL</div>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="panel-base p-6 clip-angled-border"
        >
          <div className="text-gray-500 text-xs tracking-wider mb-2">QUERIES SERVED</div>
          {isLoading ? (
            <Skeleton baseColor="#1a1a1a" highlightColor="#2a2a2a" height={32} />
          ) : (
            <div className="text-3xl font-bold">{Number(providerAccount?.queriesServed || 0).toLocaleString()}</div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="panel-base p-6 clip-angled-border"
        >
          <div className="text-gray-500 text-xs tracking-wider mb-2">REPUTATION</div>
          {isLoading ? (
            <Skeleton baseColor="#1a1a1a" highlightColor="#2a2a2a" height={32} />
          ) : (
            <>
              <div className="text-3xl font-bold">{Number(providerAccount?.reputationScore || 0)}</div>
              <div className="text-xs text-gray-500 mt-1">/ 10000</div>
            </>
          )}
        </motion.div>
      </div>

      )}

      {/* Charts - Only show if provider is registered */}
      {providerAccount && (
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Earnings Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="panel-base p-6 clip-angled-border"
        >
          <h2 className="text-xl font-bold tracking-wider mb-4">EARNINGS (7 DAYS)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={earningsHistory}>
              <XAxis dataKey="date" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                }}
                formatter={(value: any) => [`${value.toFixed(4)} SOL`, 'Earned']}
              />
              <Line type="monotone" dataKey="earned" stroke="#fff" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Query Volume Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="panel-base p-6 clip-angled-border"
        >
          <h2 className="text-xl font-bold tracking-wider mb-4">QUERY VOLUME (7 DAYS)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={queryVolume}>
              <XAxis dataKey="date" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                }}
                formatter={(value: any) => [`${value} queries`, 'Served']}
              />
              <Bar dataKey="queries" fill="#fff" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      )}

      {/* Performance Metrics - Only show if provider is registered */}
      {providerAccount && (
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="panel-base p-6 clip-angled-border"
        >
          <h2 className="text-xl font-bold tracking-wider mb-4">PERFORMANCE METRICS</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-xs text-gray-500 tracking-wider mb-2">UPTIME</div>
              <div className="text-2xl font-bold mb-1">{Number(providerAccount?.uptimePercentage || 0) / 100}%</div>
              <div className="w-full bg-gray-800 h-2">
                <div
                  className="bg-white h-2"
                  style={{ width: `${Number(providerAccount?.uptimePercentage || 0) / 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 tracking-wider mb-2">AVG RESPONSE TIME</div>
              <div className="text-2xl font-bold">{Number(providerAccount?.responseTimeAvg || 0)}ms</div>
            </div>

            <div>
              <div className="text-xs text-gray-500 tracking-wider mb-2">ACCURACY</div>
              <div className="text-2xl font-bold">{Number(providerAccount?.accuracyScore || 0) / 100}%</div>
            </div>
          </div>

          {providerAccount && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="text-xs text-gray-500 tracking-wider mb-2">ENDPOINT</div>
              <div className="font-mono text-sm text-gray-300">{providerAccount.endpoint}</div>
            </div>
          )}
        </motion.div>
      </div>
      )}

      {/* Registration Modal - Always rendered, shows as popup */}
      <ProviderRegistrationModal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
      />
    </div>
  );
}

