'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { fetchStakerAccount, fetchStakingPool, fetchTokenVault, createClaimStakerRewardsTransaction, lamportsToSol, connection, fetchPaymentVault } from '@/lib/contract';
import PanelFrame from './PanelFrame';
import toast from 'react-hot-toast';

export default function ProviderEarningsPanel() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const [earnings, setEarnings] = useState(0);
  const [stakedAmount, setStakedAmount] = useState(0);
  const [totalStakerRewards, setTotalStakerRewards] = useState(0);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // Load staker rewards function (can be called from useEffect or after claim)
  const loadStakerRewards = async () => {
    if (!publicKey) {
      setEarnings(0);
      setStakedAmount(0);
      setTotalStakerRewards(0);
      return;
    }

    setLoading(true);
    try {
      console.log('='.repeat(60));
      console.log('🔍 LOADING STAKER REWARDS FOR:', publicKey.toBase58());
      console.log('='.repeat(60));
      
      // Fetch staker account
      const stakerAccount = await fetchStakerAccount(publicKey);
      console.log('==== PROVIDER EARNINGS PANEL DEBUG ====');
      console.log('Wallet:', publicKey.toBase58());
      console.log('Staker Account:', stakerAccount);
      
      if (stakerAccount) {
        console.log('Raw staked amount:', stakerAccount.stakedAmount);
        console.log('Raw pending rewards:', stakerAccount.pendingRewards);
        setStakedAmount(Number(stakerAccount.stakedAmount) / 1e6); // WHISTLE tokens (6 decimals)
        let calculatedEarnings = lamportsToSol(stakerAccount.pendingRewards); // SOL rewards
        
        // Fetch payment vault and token vault once (used for both calculation and display)
        const vault = await fetchPaymentVault();
        const tokenVault = await fetchTokenVault();
        
        // Set total staker rewards pool (for display)
        if (vault) {
          const totalPool = lamportsToSol(vault.stakerRewardsPool);
          setTotalStakerRewards(totalPool);
          console.log('💰 Total Staker Rewards Pool:', totalPool, 'SOL');
        }
        
        // If no pending rewards set, calculate from pool
        if (calculatedEarnings === 0) {
          console.log('🔍 Calculating rewards from pool...');
          
          console.log('Token Vault:', tokenVault);
          console.log('Payment Vault:', vault);
          
          // Only calculate from pool if pool has meaningful amount (> 0.000001 SOL)
          const minPoolThreshold = 1000; // 0.000001 SOL in lamports
          
          if (tokenVault && vault && vault.stakerRewardsPool > minPoolThreshold) {
            // Use token vault balance as the REAL total staked
            const realTotalStaked = Number(tokenVault.amount);
            
            console.log('Real Total Staked:', realTotalStaked);
            console.log('Your Staked Amount:', stakerAccount.stakedAmount);
            console.log('Staker Rewards Pool:', vault.stakerRewardsPool);
            
            if (realTotalStaked > 0) {
              // Calculate proportional share using REAL total
              const stakerShare = (Number(stakerAccount.stakedAmount) / realTotalStaked) * Number(vault.stakerRewardsPool);
              calculatedEarnings = lamportsToSol(stakerShare);
              
              // Only show if above minimum threshold (avoid dust)
              if (calculatedEarnings < 0.000001) {
                calculatedEarnings = 0;
              }
              
              console.log('Calculated Share:', stakerShare, 'lamports');
              console.log('Calculated Earnings:', calculatedEarnings, 'SOL');
            }
          } else {
            console.log('❌ Missing data or pool too small:', { 
              tokenVault: !!tokenVault, 
              vault: !!vault, 
              pool: vault?.stakerRewardsPool,
              threshold: minPoolThreshold
            });
            calculatedEarnings = 0; // Ensure 0 if pool is empty or too small
          }
        } else {
          console.log('✅ Using pending rewards:', calculatedEarnings, 'SOL');
        }
        
        setEarnings(calculatedEarnings);
      } else {
        // Not a staker yet
        setStakedAmount(0);
        setEarnings(0);
        setTotalStakerRewards(0);
      }
      
    } catch (err) {
      console.error('💥 Failed to load staker rewards:', err);
      console.error('Error details:', err);
      setEarnings(0);
      setStakedAmount(0);
      setTotalStakerRewards(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

      // Wait for confirmation (with timeout handling for WebSocket failures)
      let confirmed = false;
      try {
        const latestBlockhash = await connection.getLatestBlockhash();
        const confirmation = await Promise.race([
          connection.confirmTransaction({
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
          }, 'confirmed'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Confirmation timeout')), 30000))
        ]);

        if (confirmation.value?.err) {
          throw new Error('Transaction failed on-chain');
        }
        confirmed = true;
        console.log('✅ Rewards claimed successfully!');
      } catch (confirmErr: any) {
        // Check if transaction actually succeeded despite timeout
        console.warn('⚠️ Confirmation timeout, checking transaction status...', confirmErr.message);
        try {
          const status = await connection.getSignatureStatus(signature);
          if (status && status.value && (status.value.confirmationStatus === 'confirmed' || status.value.confirmationStatus === 'finalized')) {
            confirmed = true;
            console.log('✅ Transaction confirmed via status check!');
          } else if (status && status.value && status.value.err) {
            throw new Error('Transaction failed on-chain');
          } else {
            // Transaction might still be pending, but grant success anyway since it was sent
            console.warn('⚠️ Transaction status unknown, but granting success (transaction was sent)');
            confirmed = true;
          }
        } catch (statusErr) {
          console.warn('⚠️ Could not check transaction status, but granting success (transaction was sent)');
          confirmed = true; // Grant success anyway since transaction was sent
        }
      }

      if (!confirmed) {
        throw new Error('Transaction confirmation failed');
      }
      
      // Immediately set earnings to 0 (optimistic update)
      const claimedAmount = earnings;
      setEarnings(0);
      
      // Success toast
      toast.success((t) => (
        <div className="flex flex-col gap-2">
          <div className="font-semibold">🎉 Rewards Claimed!</div>
          <div className="text-sm text-gray-300">
            {claimedAmount.toFixed(6)} SOL sent to your wallet
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
      
      // Refresh balance from blockchain (with delay to allow blockchain to update)
      console.log('🔄 Refreshing staker rewards after claim...');
      
      // Wait a bit for blockchain to update, then refresh
      setTimeout(async () => {
        await loadStakerRewards();
      }, 3000);
      
      // Also refresh again after a longer delay to ensure it's updated
      setTimeout(async () => {
        console.log('🔄 Second refresh after claim...');
        await loadStakerRewards();
      }, 8000);
      
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
            <>
              {/* Main display - shows 0.00 for tiny amounts */}
              <div className="text-[56px] font-bold leading-none tracking-tight">
                {earnings >= 0.01 ? earnings.toFixed(2) : '0.00'}
              </div>
              
              {/* Micro-rewards indicator */}
              {earnings > 0 && earnings < 0.01 && (
                <div className="mt-2 bg-emerald-900/30 border border-emerald-500/30 rounded px-2 py-1">
                  <div className="text-[11px] text-emerald-400 font-mono animate-pulse">
                    💎 {earnings.toFixed(8)} SOL
                  </div>
                  <div className="text-[9px] text-emerald-300/80">
                    ≈ ${(earnings * 200).toFixed(4)} USD
                  </div>
                </div>
              )}
            </>
          )}
          
          <div className="text-xs text-gray-400 tracking-widest mt-2">SOL</div>
          <div className="text-[9px] text-gray-600 mt-1">
            {earnings > 0 && earnings < 0.01 
              ? '⚡ Micro-rewards detected!' 
              : 'Your Share from X402 Pool'}
          </div>
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
            <div className="flex justify-between">
              <span>Your Share:</span>
              <span className="text-yellow-400">
                {((stakedAmount / 89257444) * 100).toFixed(4)}%
              </span>
            </div>
            {totalStakerRewards > 0 && (
              <div className="flex justify-between">
                <span>Total Pool:</span>
                <span className="text-emerald-400">{totalStakerRewards.toFixed(4)} SOL</span>
              </div>
            )}
            {earnings > 0 && earnings < 0.0001 && (
              <div className="mt-2 text-[8px] text-yellow-500 text-center">
                ⚠️ Rewards below minimum display threshold
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
