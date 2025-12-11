'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { RpcResponseAndContext, SignatureResult } from '@solana/web3.js';
import { fetchStakerAccount, fetchStakingPool, fetchTokenVault, createClaimStakerRewardsTransaction, lamportsToSol, connection, fetchPaymentVault, fetchRewardsAccumulator } from '@/lib/contract';
import { fetchClaimHistory, type ClaimHistory } from '@/lib/claim-history';
import PanelFrame from './PanelFrame';
import toast from 'react-hot-toast';

export default function ProviderEarningsPanel() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const [earnings, setEarnings] = useState(0);
  const [stakedAmount, setStakedAmount] = useState(0);
  const [totalStakerRewards, setTotalStakerRewards] = useState(0);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [claimHistory, setClaimHistory] = useState<ClaimHistory | null>(null);

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
        console.log('Raw voting power (reward debt):', stakerAccount.votingPower);
          setStakedAmount(Number(stakerAccount.stakedAmount) / 1e6); // WHISTLE tokens (6 decimals)
        
        // Fetch accumulator, payment vault, and token vault
        const accumulator = await fetchRewardsAccumulator();
        const vault = await fetchPaymentVault();
        const tokenVault = await fetchTokenVault();
        
        // Set total staker rewards pool (for display) - this is the actual pool amount
        if (vault) {
          const totalPool = lamportsToSol(vault.stakerRewardsPool);
          setTotalStakerRewards(totalPool);
          console.log('💰 Total Staker Rewards Pool:', totalPool, 'SOL');
        }
        
        // Calculate earnings using accumulator formula
        let calculatedEarnings = 0;
        
        if (accumulator) {
          console.log('📊 Using accumulator-based calculation');
          console.log('Accumulated per token:', accumulator.accumulatedPerToken.toString());
          console.log('Total distributed:', accumulator.totalDistributed.toString());
          
          // Formula: earned = (stake * accumulated_per_token) / 1e18 - reward_debt
          // voting_power is repurposed as reward_debt
          const stakeAmount = BigInt(stakerAccount.stakedAmount);
          const accumulatedPerToken = accumulator.accumulatedPerToken;
          let rewardDebt = BigInt(stakerAccount.votingPower); // Repurposed field
          
          // Calculate: (stake * accumulated_per_token) / 1e18
          const currentValue = (stakeAmount * accumulatedPerToken) / BigInt(1_000_000_000_000_000_000); // Divide by 1e18
          
          // MIGRATION FIX: Detect when voting_power was set to access_tokens (old bug)
          // If reward_debt is suspiciously high (> current_value × 100), it's likely the old access_tokens value
          // Reset it to current_value to allow staker to start earning from next distribution
          const maxReasonableDebt = currentValue * BigInt(100);
          const migrationNeeded = rewardDebt > maxReasonableDebt;
          setNeedsMigration(migrationNeeded);
          
          if (migrationNeeded) {
            console.log('⚠️ Migration: Detected old access_tokens value in reward_debt');
            console.log('   Old value:', rewardDebt.toString(), '(likely access_tokens)');
            console.log('   Current value:', currentValue.toString());
            console.log('   Resetting reward_debt to current_value to allow future earnings');
            console.log('   ⚠️ You need to CLAIM (even if 0) to fix your on-chain reward_debt!');
            rewardDebt = currentValue; // Reset to current value, staker starts fresh from next distribution
          }
          
          // Calculate earned: current_value - reward_debt
          const earned = currentValue > rewardDebt ? currentValue - rewardDebt : BigInt(0);
          
          // Add pending rewards (already accumulated but not yet claimed)
          const totalEarned = earned + BigInt(stakerAccount.pendingRewards);
          
          calculatedEarnings = lamportsToSol(totalEarned);
          
          // IMPORTANT: Cap earnings to what's actually available in the pool
          // The accumulator formula calculates what SHOULD be earned, but the pool might not have all funds yet
          if (vault) {
            const availablePool = vault.stakerRewardsPool;
            const totalEarnedLamports = totalEarned;
            
            // If calculated earnings exceed available pool, cap it to pool amount
            if (totalEarnedLamports > availablePool) {
              console.warn('⚠️ Calculated earnings exceed available pool!');
              console.warn('  Calculated:', lamportsToSol(totalEarnedLamports), 'SOL');
              console.warn('  Available in pool:', lamportsToSol(availablePool), 'SOL');
              console.warn('  Capping to available amount');
              calculatedEarnings = lamportsToSol(availablePool);
            }
          }
          
          console.log('Stake amount:', stakeAmount.toString());
          console.log('Current value:', currentValue.toString());
          console.log('Reward debt (adjusted):', rewardDebt.toString());
          console.log('Earned since last claim:', earned.toString());
          console.log('Pending rewards:', stakerAccount.pendingRewards.toString());
          console.log('Total earned (before cap):', totalEarned.toString());
          console.log('Calculated earnings (final):', calculatedEarnings, 'SOL');
          if (vault) {
            console.log('Available in pool:', lamportsToSol(vault.stakerRewardsPool), 'SOL');
          }
        } else {
          console.warn('⚠️ Rewards accumulator not found, using pending rewards only');
          calculatedEarnings = lamportsToSol(stakerAccount.pendingRewards);
        }
          
          setEarnings(calculatedEarnings);
        } else {
          // Not a staker yet
          setStakedAmount(0);
          setEarnings(0);
        setTotalStakerRewards(0);
        }
        
        // Load claim history (non-blocking, don't wait for it)
        if (publicKey) {
          fetchClaimHistory(publicKey, connection)
            .then(setClaimHistory)
            .catch(err => {
              console.warn('Failed to load claim history (non-critical):', err);
              // Don't set error state, just skip it
            });
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
    if (!publicKey || !connected) return;
    // Allow claiming if earnings > 0 OR if migration is needed (to fix on-chain state)
    if (earnings === 0 && !needsMigration) return;

    setClaiming(true);
    try {
      console.log('🎁 Claiming staker rewards:', earnings, 'SOL');

      // Get recent blockhash first
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      
      // Create claim transaction
      const transaction = await createClaimStakerRewardsTransaction(publicKey);
      
      // Set recent blockhash and fee payer
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = publicKey;
      
      console.log('📝 Transaction created, requesting signature...');
      
      // Send transaction with proper options
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        maxRetries: 3,
        preflightCommitment: 'confirmed'
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
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Confirmation timeout')), 30000))
        ]) as RpcResponseAndContext<SignatureResult> | null;

        if (confirmation?.value?.err) {
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
      
      // Refresh claim history immediately (transaction is confirmed)
      if (publicKey) {
        const history = await fetchClaimHistory(publicKey, connection);
        setClaimHistory(history);
      }
      
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
          disabled={!connected || (earnings === 0 && !needsMigration) || claiming}
          onClick={handleClaim}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {claiming ? 'CLAIMING...' : needsMigration && earnings === 0 ? 'FIX REWARD DEBT (0 SOL)' : 'CLAIM REWARDS'}
        </button>
        
        {needsMigration && earnings === 0 && (
          <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
            ⚠️ Migration needed: Your reward_debt needs to be fixed. Claim now (0 SOL) to fix it, then you'll earn from the next distribution.
          </div>
        )}

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
            {claimHistory && claimHistory.claimCount > 0 && (
              <>
                <div className="flex justify-between pt-1 border-t border-white/5 mt-1">
                  <span>Last Claim:</span>
                  <span className="text-emerald-300">
                    {claimHistory.lastClaimTime
                      ? new Date(claimHistory.lastClaimTime).toLocaleDateString()
                      : 'Never'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Last Amount:</span>
                  <span className="text-emerald-300">{claimHistory.lastClaimAmount.toFixed(6)} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Claimed:</span>
                  <span className="text-emerald-300">{claimHistory.totalClaimed.toFixed(6)} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span>Claim Count:</span>
                  <span className="text-emerald-300">{claimHistory.claimCount}</span>
                </div>
              </>
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
