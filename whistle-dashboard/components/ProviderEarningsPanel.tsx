'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { fetchStakerAccount, createClaimStakerRewardsTransaction, lamportsToSol, connection, fetchPaymentVault } from '@/lib/contract';
import PanelFrame from './PanelFrame';
import toast from 'react-hot-toast';

export default function ProviderEarningsPanel() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const [earnings, setEarnings] = useState(0);
  const [stakedAmount, setStakedAmount] = useState(0);
  const [totalStakerRewards, setTotalStakerRewards] = useState(0);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    async function loadStakerRewards() {
      if (!publicKey) {
        setEarnings(0);
        setStakedAmount(0);
        setTotalStakerRewards(0);
        return;
      }

      setLoading(true);
      try {
        // Fetch staker account
        const stakerAccount = await fetchStakerAccount(publicKey);
        
        if (stakerAccount) {
          setStakedAmount(Number(stakerAccount.stakedAmount) / 1e6); // WHISTLE tokens (6 decimals)
          setEarnings(lamportsToSol(stakerAccount.pendingRewards)); // SOL rewards
        } else {
          // Not a staker yet
          setStakedAmount(0);
          setEarnings(0);
        }

        // Fetch payment vault to show total staker rewards pool
        const vault = await fetchPaymentVault();
        if (vault) {
          setTotalStakerRewards(lamportsToSol(vault.stakerRewardsPool));
        }
        
      } catch (err) {
        console.error('Failed to load staker rewards:', err);
        setEarnings(0);
        setStakedAmount(0);
        setTotalStakerRewards(0);
      } finally {
        setLoading(false);
      }
    }

    loadStakerRewards();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadStakerRewards, 30000);
    return () => clearInterval(interval);
  }, [publicKey]);

  const handleClaim = async () => {
    if (!publicKey || !connected || earnings === 0) return;

    setClaiming(true);
    try {
      console.log('🎁 Claiming staker rewards:', earnings, 'SOL');

      // Create claim transaction
      const transaction = await createClaimStakerRewardsTransaction(publicKey);
      
      console.log('📝 Transaction created, requesting signature...');
      
      // Send transaction
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        maxRetries: 3
      });
      
      console.log('✅ Transaction sent:', signature);
      toast.loading(`Claiming ${earnings.toFixed(4)} SOL...`, { id: 'claim' });

      // Wait for confirmation
      const latestBlockhash = await connection.getLatestBlockhash();
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }, 'confirmed');

      if (confirmation.value.err) {
        throw new Error('Transaction failed on-chain');
      }

      console.log('✅ Rewards claimed successfully!');
      
      // Success toast
      toast.success((t) => (
        <div className="flex flex-col gap-2">
          <div className="font-semibold">🎉 Rewards Claimed!</div>
          <div className="text-sm text-gray-300">
            {earnings.toFixed(4)} SOL sent to your wallet
          </div>
          <a
            href={`https://solscan.io/tx/${signature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-400 hover:text-emerald-300 underline"
            onClick={() => toast.dismiss(t.id)}
          >
            View Transaction →
          </a>
        </div>
      ), {
        id: 'claim',
        duration: 6000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '16px',
          minWidth: '300px',
        },
      });
      
      // Refresh balance
      setEarnings(0);
      
    } catch (err: any) {
      console.error('❌ Claim failed:', err);
      
      toast.error((t) => (
        <div className="flex flex-col gap-2">
          <div className="font-semibold">Claim Failed</div>
          <div className="text-sm text-gray-300 max-w-sm break-words">
            {err?.message || String(err)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Check console (F12) for details
          </div>
        </div>
      ), {
        id: 'claim',
        duration: 6000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '16px',
          minWidth: '300px',
        },
      });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <PanelFrame
      cornerType="gold"
      className="min-h-[240px] flex flex-col"
      motionProps={{
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.6, delay: 0.1 }
      }}
    >
      <h3 className="text-[11px] font-semibold mb-4 tracking-[0.15em]">
        STAKER REWARDS
      </h3>

      <div className="text-center space-y-4">
        {/* Claimable Rewards */}
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
          <div className="text-[9px] text-gray-600 mt-1">Your Share (90% X402)</div>
        </div>

        {/* Claim Button */}
        <button
          disabled={!connected || earnings === 0 || claiming}
          onClick={handleClaim}
          className="btn-primary w-full"
        >
          {claiming ? 'CLAIMING...' : 'CLAIM REWARDS'}
        </button>

        {/* Info */}
        {connected && stakedAmount > 0 && (
          <div className="pt-3 border-t border-white/10 space-y-1 text-[9px] text-gray-500">
            <div className="flex justify-between">
              <span>Your Stake:</span>
              <span className="text-white">{stakedAmount.toLocaleString()} WHISTLE</span>
            </div>
            {totalStakerRewards > 0 && (
              <div className="flex justify-between">
                <span>Total Pool:</span>
                <span className="text-emerald-400">{totalStakerRewards.toFixed(4)} SOL</span>
              </div>
            )}
          </div>
        )}

        {/* Not staking warning */}
        {connected && stakedAmount === 0 && !loading && (
          <div className="text-[9px] text-gray-600 pt-2">
            Stake WHISTLE to earn rewards
          </div>
        )}
      </div>
    </PanelFrame>
  );
}
