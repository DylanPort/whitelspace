'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { fetchStakerAccount, fetchStakingPool, fetchStakerCount, tokensToWhistle, TOKEN_VAULT_ADDRESS } from '@/lib/contract';

export default function CentralCore() {
  const { publicKey, connected, disconnect } = useWallet();
  const [stakedAmount, setStakedAmount] = useState(0);
  const [accessTokens, setAccessTokens] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAccessTokenModal, setShowAccessTokenModal] = useState(false);
  
  // Pool stats
  const [totalStaked, setTotalStaked] = useState(0);
  const [totalStakers, setTotalStakers] = useState(0);

  useEffect(() => {
    async function loadStakerData() {
      if (!publicKey) {
        setStakedAmount(0);
        setAccessTokens(0);
        return;
      }

      setLoading(true);
      try {
        const stakerAccount = await fetchStakerAccount(publicKey);
        if (stakerAccount) {
          setStakedAmount(tokensToWhistle(stakerAccount.stakedAmount));
          // Access tokens are calculated as: staked_lamports * tokens_per_whistle
          // Since WHISTLE has 6 decimals, divide by 1,000,000 for display
          setAccessTokens(Number(stakerAccount.accessTokens) / 1_000_000);
        } else {
          // No account yet - new staker
          setStakedAmount(0);
          setAccessTokens(0);
        }
      } catch (err) {
        console.error('Failed to load staker account:', err);
        // Show demo data
        setStakedAmount(0);
        setAccessTokens(0);
      } finally {
        setLoading(false);
      }
    }

    loadStakerData();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadStakerData, 30000);
    return () => clearInterval(interval);
  }, [publicKey]);

  // Load pool stats
  useEffect(() => {
    async function loadPoolStats() {
      try {
        // Fetch pool data
        const pool = await fetchStakingPool();
        if (pool) {
          setTotalStaked(tokensToWhistle(pool.totalStaked));
        }
        
        // Fetch REAL staker count from blockchain
        const count = await fetchStakerCount();
        setTotalStakers(count);
      } catch (err) {
        console.error('Failed to load pool stats:', err);
      }
    }

    loadPoolStats();
    
    // Refresh every 10 seconds
    const interval = setInterval(loadPoolStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const maskedAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4).toUpperCase()}`
    : '7BZQ...EKHR';

  const handleWalletClick = () => {
    if (connected && disconnect) {
      disconnect();
    }
  };

  const handleStakedClick = () => {
    if (stakedAmount > 0) {
      // Open TOKEN VAULT (where actual tokens are held)
      window.open(`https://solscan.io/account/${TOKEN_VAULT_ADDRESS.toBase58()}`, '_blank');
    }
  };

  return (
    <>
    <div className="relative flex flex-col items-center w-full max-w-[340px] mx-auto">
      {/* Concentric rings behind core with depth - reduced to 2 - Hidden on mobile */}
      <div className="absolute hidden md:block" style={{ width: '500px', height: '500px', top: '-120px', left: '50%', transform: 'translateX(-50%)' }}>
        {[0, 1].map((i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 border rounded-full"
            style={{
              width: `${280 + i * 40}px`,
              height: `${280 + i * 40}px`,
              transform: 'translate(-50%, -50%)',
              borderWidth: '1px',
              borderColor: `rgba(255, 255, 255, ${0.05 + i * 0.02})`,
              boxShadow: `0 0 ${20 + i * 12}px rgba(255, 255, 255, 0.05), 0 ${5 + i * 3}px ${15 + i * 6}px rgba(0, 0, 0, 0.6)`,
            }}
          />
        ))}
      </div>

      {/* Main core circle */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="core-circle relative z-10 flex flex-col items-center justify-center rounded-full w-[220px] h-[220px] md:w-[260px] md:h-[260px]"
      >
        {!connected ? (
          <div className="text-center px-4 md:px-8">
            <div className="mb-3 md:mb-4 text-gray-500 text-[9px] md:text-[10px] tracking-[0.2em]">CONNECT WALLET</div>
            <WalletMultiButton />
          </div>
        ) : (
          <div className="text-center space-y-2 md:space-y-3 px-4 md:px-6">
              {/* Wallet Address - Clickable to Disconnect */}
            <div>
              <div className="text-[8px] md:text-[9px] text-gray-500 tracking-[0.2em] mb-1">WALLET</div>
                <button
                  onClick={handleWalletClick}
                  className="text-xs md:text-sm font-mono tracking-[0.1em] hover:text-red-400 transition-colors cursor-pointer group relative"
                  title="Click to disconnect"
                >
                  {maskedAddress}
                  <span className="absolute -right-3 md:-right-4 top-0 text-[9px] md:text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                    ⨯
                  </span>
                </button>
            </div>

            <div className="py-1 md:py-2">
              {loading ? (
                <div className="text-[28px] md:text-[36px] font-bold leading-none tracking-tight text-gray-600">
                  Loading...
                </div>
              ) : (
                <>
                    {/* Staked Amount - Clickable to view on Solscan */}
                    <button
                      onClick={handleStakedClick}
                      disabled={stakedAmount === 0}
                      className={`text-[36px] md:text-[44px] font-bold leading-none tracking-tight ${
                        stakedAmount > 0 ? 'hover:text-blue-400 cursor-pointer transition-colors' : ''
                      }`}
                      title={stakedAmount > 0 ? "Click to view pool on Solscan" : ""}
                    >
                    {stakedAmount.toLocaleString()}
                    </button>
                  <div className="text-[8px] md:text-[9px] text-gray-500 tracking-[0.2em] mt-1">WHISTLE STAKED</div>
                    
                    {/* Access Tokens - Clickable to show use cases */}
                    <button
                      onClick={() => setShowAccessTokenModal(true)}
                      className="text-[16px] md:text-[18px] font-semibold leading-none tracking-tight mt-2 hover:text-green-400 cursor-pointer transition-colors"
                      title="Click to learn about access tokens"
                    >
                    {accessTokens.toLocaleString()}
                    </button>
                    <div className="text-[7px] md:text-[8px] text-gray-500 tracking-[0.2em] mt-1">
                      ACCESS TOKENS <span className="text-[6px] md:text-[7px]">ⓘ</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>

        {/* Pool Stats - Clean Professional Design */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
        className="relative mt-6 md:mt-8 flex items-center justify-center w-full"
        >
          <div className="relative z-10 text-center p-3 md:p-4 rounded-lg bg-black/40 border border-white/10">
            <div className="flex gap-4 md:gap-6 items-center">
              {/* Total Staked */}
              <div className="text-center">
                <div className="text-[8px] md:text-[9px] text-gray-500 tracking-[0.2em] mb-1">
                  TOTAL STAKED
                </div>
                <div className="text-[22px] md:text-[28px] font-bold leading-none tracking-tight">
                  {totalStaked.toLocaleString()}
                </div>
                <div className="text-[9px] md:text-[10px] text-gray-400 mt-1">
                  WHISTLE
                </div>
              </div>

              {/* Divider */}
              <div className="w-px h-10 md:h-12 bg-white/10" />

              {/* Total Stakers */}
              <div className="text-center">
                <div className="text-[8px] md:text-[9px] text-gray-500 tracking-[0.2em] mb-1">
                  STAKERS
                </div>
                <div className="text-[22px] md:text-[28px] font-bold leading-none tracking-tight">
                  {totalStakers}
                </div>
                <div className="text-[9px] md:text-[10px] text-gray-400 mt-1">
                  ACTIVE
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Access Token Use Cases Modal */}
      <AnimatePresence>
        {showAccessTokenModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAccessTokenModal(false)}
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{
                background: 'rgba(0, 0, 0, 0.95)',
                backdropFilter: 'blur(10px)',
              }}
            />

            {/* Modal */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 pointer-events-none"
            >
              <div 
                className="relative w-full max-w-2xl pointer-events-auto max-h-[95vh] overflow-y-auto"
                style={{
                  background: 'linear-gradient(135deg, rgba(22, 22, 22, 0.98) 0%, rgba(12, 12, 12, 0.98) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(30px)',
                  boxShadow: `
                    0 30px 100px rgba(0, 0, 0, 0.95),
                    0 15px 50px rgba(0, 0, 0, 0.85),
                    0 8px 25px rgba(0, 0, 0, 0.75),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2),
                    inset 0 -1px 0 rgba(0, 0, 0, 0.9)
                  `,
                  clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px)',
                }}
              >
                {/* Gradient overlay */}
                <div 
                  className="absolute inset-0 pointer-events-none"
            style={{
                    background: 'radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.08) 0%, transparent 40%, rgba(0, 0, 0, 0.4) 100%)',
                    clipPath: 'inherit',
                  }}
                />

                {/* Content */}
                <div className="relative p-4 md:p-6 lg:p-8">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h2 className="text-lg md:text-2xl font-bold tracking-[0.15em] md:tracking-[0.2em] uppercase">
                      ACCESS TOKENS
                    </h2>
                    <button
                      onClick={() => setShowAccessTokenModal(false)}
                      className="text-xl md:text-2xl text-gray-400 hover:text-white transition-colors"
                      style={{
                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
                      }}
                    >
                      ×
                    </button>
                  </div>

                  {/* Your Current Balance */}
                  <div className="mb-4 md:mb-6 p-3 md:p-4 bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-600/30">
                    <div className="text-center">
                      <div className="text-[9px] md:text-[10px] text-green-400 tracking-wider mb-1">YOUR BALANCE</div>
                      <div className="text-2xl md:text-3xl font-bold text-green-300">{accessTokens.toLocaleString()}</div>
                      <div className="text-[9px] md:text-[10px] text-green-500 mt-1">Access Tokens</div>
                    </div>
                  </div>

                  {/* Use Cases */}
                  <div className="space-y-3 md:space-y-4 text-xs md:text-sm">
                    <div className="p-4 bg-black/40 border border-white/10">
                      <h3 className="text-xs font-semibold tracking-wider uppercase text-white mb-3 flex items-center gap-2">
                        <span>🗳️</span> GOVERNANCE VOTING
                      </h3>
                      <p className="text-gray-300 text-xs leading-relaxed">
                        <strong className="text-white">1 Access Token = 1 Vote</strong> in protocol governance. Participate in decisions about fee structures, parameter changes, and network upgrades. Your voice scales with your stake commitment.
                      </p>
                    </div>

                    <div className="p-4 bg-black/40 border border-white/10">
                      <h3 className="text-xs font-semibold tracking-wider uppercase text-white mb-3 flex items-center gap-2">
                        <span>💎</span> EXCLUSIVE ACCESS
                      </h3>
                      <p className="text-gray-300 text-xs leading-relaxed">
                        <strong className="text-white">Future feature:</strong> Access token holders will unlock premium network features including priority query routing, dedicated provider access, and enhanced analytics dashboards.
                      </p>
                    </div>

                    <div className="p-4 bg-black/40 border border-white/10">
                      <h3 className="text-xs font-semibold tracking-wider uppercase text-white mb-3 flex items-center gap-2">
                        <span>🎯</span> REPUTATION & WEIGHT
                      </h3>
                      <p className="text-gray-300 text-xs leading-relaxed">
                        Your access token balance represents your <strong className="text-white">commitment to the network</strong>. Higher balances unlock governance privileges and demonstrate long-term alignment with protocol success.
                      </p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-white/10 to-white/5 border border-white/20">
                      <h3 className="text-xs font-semibold tracking-wider uppercase text-white mb-3 flex items-center gap-2">
                        <span>📊</span> HOW TO EARN MORE
                      </h3>
                      <div className="text-gray-300 text-xs space-y-2">
                        <p>• <strong className="text-white">Stake more WHISTLE:</strong> 1 WHISTLE = 1,000 Access Tokens (1:1000 ratio)</p>
                        <p>• <strong className="text-white">Lock longer:</strong> Your tokens remain as long as you're staked</p>
                        <p>• <strong className="text-white">No dilution:</strong> Your voting power is preserved over time</p>
                      </div>
                    </div>
                  </div>

                  {/* Current Ratio Info */}
                  <div className="mt-6 p-4 bg-black/60 border border-white/10">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Conversion Rate:</span>
                      <strong className="text-white">1 WHISTLE = 1,000 Access Tokens</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs mt-2">
                      <span className="text-gray-400">Your Staked WHISTLE:</span>
                      <strong className="text-white">{stakedAmount.toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* Close Button */}
                  <div className="mt-6">
                    <button
                      onClick={() => setShowAccessTokenModal(false)}
                      className="btn-primary w-full"
                    >
                      Got It!
                    </button>
                  </div>
                </div>
        </div>
      </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
