'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { fetchStakerAccount, tokensToWhistle } from '@/lib/contract';

export default function CentralCore() {
  const { publicKey, connected } = useWallet();
  const [stakedAmount, setStakedAmount] = useState(0);
  const [accessTokens, setAccessTokens] = useState(0);
  const [loading, setLoading] = useState(false);

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
          setAccessTokens(Number(stakerAccount.accessTokens));
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

  const maskedAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4).toUpperCase()}...${publicKey.toBase58().slice(-4).toUpperCase()}`
    : '4PA8...KDK1';

  return (
    <div className="relative flex flex-col items-center" style={{ width: '400px' }}>
      {/* Concentric rings behind core with depth - reduced to 2 */}
      <div className="absolute" style={{ width: '600px', height: '600px', top: '-140px', left: '50%', transform: 'translateX(-50%)' }}>
        {[0, 1].map((i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 border rounded-full"
            style={{
              width: `${340 + i * 50}px`,
              height: `${340 + i * 50}px`,
              transform: 'translate(-50%, -50%)',
              borderWidth: '1px',
              borderColor: `rgba(255, 255, 255, ${0.05 + i * 0.02})`,
              boxShadow: `0 0 ${25 + i * 15}px rgba(255, 255, 255, 0.05), 0 ${6 + i * 4}px ${18 + i * 8}px rgba(0, 0, 0, 0.6)`,
            }}
          />
        ))}
      </div>

      {/* Main core circle */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="core-circle relative z-10 flex flex-col items-center justify-center rounded-full"
        style={{
          width: '300px',
          height: '300px',
        }}
      >
        {!connected ? (
          <div className="text-center px-8">
            <div className="mb-4 text-gray-500 text-[10px] tracking-[0.2em]">CONNECT WALLET</div>
            <WalletMultiButton />
          </div>
        ) : (
          <div className="text-center space-y-3 px-6">
            <div>
              <div className="text-[9px] text-gray-500 tracking-[0.2em] mb-1">WALLET</div>
              <div className="text-sm font-mono tracking-[0.1em]">{maskedAddress}</div>
            </div>

            <div className="py-3">
              {loading ? (
                <div className="text-[40px] font-bold leading-none tracking-tight text-gray-600">
                  Loading...
                </div>
              ) : (
                <>
                  <div className="text-[50px] font-bold leading-none tracking-tight">
                    {stakedAmount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-gray-500 tracking-[0.2em] mt-1">WHISTLE STAKED</div>
                  <div className="text-[20px] font-semibold leading-none tracking-tight mt-3">
                    {accessTokens.toLocaleString()}
                  </div>
                  <div className="text-[9px] text-gray-500 tracking-[0.2em] mt-1">ACCESS TOKENS</div>
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Pedestal with concentric ellipses */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
        className="relative mt-8 flex items-center justify-center"
        style={{ width: '100%', height: '120px' }}
      >
        {/* Elliptical rings with depth */}
        {[
          { w: 420, h: 100, opacity: 0.15, shadow: 30 },
          { w: 360, h: 75, opacity: 0.12, shadow: 20 },
          { w: 300, h: 50, opacity: 0.10, shadow: 15 },
          { w: 240, h: 25, opacity: 0.08, shadow: 10 },
        ].map((ring, i) => (
          <div
            key={i}
            className="absolute border rounded-full"
            style={{
              width: `${ring.w}px`,
              height: `${ring.h}px`,
              borderWidth: '1px',
              borderColor: `rgba(255, 255, 255, ${ring.opacity})`,
              background: i === 0 ? 'radial-gradient(ellipse, rgba(10, 10, 10, 0.6), rgba(5, 5, 5, 0.8))' : 'transparent',
              boxShadow: `0 ${2 + i * 2}px ${ring.shadow}px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.03)`,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
        ))}

        {/* Center text */}
        <div className="relative z-10 text-lg font-bold tracking-[0.35em]">
          WHISTLE
        </div>
      </motion.div>
    </div>
  );
}
