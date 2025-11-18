'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { createStakeTransaction, createUnstakeTransaction, fetchStakerAccount, connection } from '@/lib/contract';

export default function StakingPanel() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const [staking, setStaking] = useState(false);
  const [unstaking, setUnstaking] = useState(false);
  const [amount, setAmount] = useState('100');
  const [cooldownRemaining, setCooldownRemaining] = useState<number | null>(null);
  const [lastStakeTime, setLastStakeTime] = useState<bigint | null>(null);

  const handleStake = async () => {
    if (!publicKey || !connected) {
      alert('❌ Please connect your wallet first');
      return;
    }

    const stakeAmount = parseFloat(amount);
    if (isNaN(stakeAmount) || stakeAmount < 100) {
      alert('⚠️ Minimum stake is 100 WHISTLE');
      return;
    }

    setStaking(true);
    try {
      console.log('Creating stake transaction for:', stakeAmount, 'WHISTLE');
      console.log('Wallet:', publicKey.toBase58());
      
      const transaction = await createStakeTransaction(publicKey, stakeAmount);
      console.log('Transaction created, sending...');
      
      // Send with skipPreflight to bypass simulation (known to work from previous successful stakes)
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: true,
        maxRetries: 3,
      });
      console.log('Transaction sent:', signature);
      console.log('Waiting for confirmation...');
      
      // Wait for confirmation and check status
      const latestBlockhash = await connection.getLatestBlockhash();
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }, 'confirmed');
      
      if (confirmation.value.err) {
        const error = confirmation.value.err;
        console.error('Transaction failed on-chain:', error);
        
        // Decode InstructionError
        let errorMsg = 'Transaction failed';
        if (typeof error === 'object' && 'InstructionError' in error) {
          const [index, errCode] = (error as any).InstructionError;
          errorMsg = `Instruction ${index} failed with error: ${JSON.stringify(errCode)}`;
        } else {
          errorMsg = `Transaction failed: ${JSON.stringify(error)}`;
        }
        
        throw new Error(errorMsg);
      }
      
      console.log('✅ Transaction confirmed successfully!');
      console.log('Signature:', signature);
      console.log('View on Solscan:', `https://solscan.io/tx/${signature}`);
      
      alert(`✅ Staking successful!\n\nStaked: ${stakeAmount} WHISTLE\n\nView on Solscan:\nhttps://solscan.io/tx/${signature}`);
      setAmount('100'); // Reset to minimum
    } catch (err: any) {
      console.error('Staking failed:', err);
      console.error('Error details:', {
        message: err?.message,
        name: err?.name,
        stack: err?.stack,
        logs: err?.logs,
        toString: err?.toString()
      });
      
      let errorMsg = 'Unknown error';
      if (err?.message) {
        errorMsg = err.message;
      } else if (typeof err === 'object' && 'InstructionError' in err) {
        const [index, errCode] = (err as any).InstructionError;
        errorMsg = `Instruction ${index} error: ${JSON.stringify(errCode)}`;
      } else if (err?.toString && typeof err.toString === 'function') {
        try {
          errorMsg = err.toString();
        } catch {
          errorMsg = 'Error converting error to string';
        }
      }
      
      alert(`❌ Staking failed: ${errorMsg}\n\nCheck console (F12) for details`);
    } finally {
      setStaking(false);
    }
  };

  const handleUnstake = async () => {
    if (!publicKey || !connected) {
      alert('❌ Please connect your wallet first');
      return;
    }

    const unstakeAmount = parseFloat(amount);
    if (isNaN(unstakeAmount) || unstakeAmount <= 0) {
      alert('⚠️ Invalid unstake amount');
      return;
    }

    if (cooldownRemaining && cooldownRemaining > 0) {
      alert(`⏳ Cooldown active!\n\nYou can unstake in: ${formatTime(cooldownRemaining)}`);
      return;
    }

    setUnstaking(true);
    try {
      console.log('Creating unstake transaction for:', unstakeAmount, 'WHISTLE');
      
      const transaction = await createUnstakeTransaction(publicKey, unstakeAmount);
      
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: true,
        maxRetries: 3,
      });
      console.log('Unstake transaction sent:', signature);
      
      const latestBlockhash = await connection.getLatestBlockhash();
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      console.log('✅ Unstake confirmed!');
      alert(`✅ Unstake successful!\n\nUnstaked: ${unstakeAmount} WHISTLE\n\nView on Solscan:\nhttps://solscan.io/tx/${signature}`);
      setAmount('100');
      
      // Refresh cooldown
      if (publicKey) {
        loadCooldown(publicKey);
      }
    } catch (err: any) {
      console.error('Unstaking failed:', err);
      alert(`❌ Unstaking failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setUnstaking(false);
    }
  };

  // Load cooldown on mount and wallet change
  useEffect(() => {
    if (publicKey && connected) {
      loadCooldown(publicKey);
      
      // Update cooldown every second
      const interval = setInterval(() => {
        loadCooldown(publicKey);
      }, 1000);
      
      return () => clearInterval(interval);
    } else {
      setCooldownRemaining(null);
      setLastStakeTime(null);
    }
  }, [publicKey, connected]);

  const loadCooldown = async (wallet: typeof publicKey) => {
    if (!wallet) return;
    
    try {
      const stakerAccount = await fetchStakerAccount(wallet);
      if (!stakerAccount) {
        setCooldownRemaining(null);
        setLastStakeTime(null);
        return;
      }

      const lastStake = stakerAccount.lastStakeTime;
      setLastStakeTime(lastStake);

      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const cooldownPeriod = BigInt(86400); // 24 hours in seconds
      const timeSinceStake = currentTime - lastStake;
      
      if (timeSinceStake < cooldownPeriod) {
        const remaining = Number(cooldownPeriod - timeSinceStake);
        setCooldownRemaining(remaining);
      } else {
        setCooldownRemaining(0);
      }
    } catch (err) {
      console.error('Error loading cooldown:', err);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="panel-base p-6 rounded-[16px] clip-angled-border min-h-[240px] flex flex-col"
    >
      <h3 className="text-[11px] font-semibold mb-4 tracking-[0.15em]">
        STAKING
      </h3>

      <div className="space-y-3">
        {/* Amount input */}
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (WHISTLE)"
          min="100"
          step="100"
          className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm text-center"
        />

        <button
          disabled={!connected || staking}
          onClick={handleStake}
          className="btn-primary w-full"
        >
          {staking ? 'STAKING...' : 'STAKE'}
        </button>

        <button
          disabled={!connected || unstaking || (cooldownRemaining !== null && cooldownRemaining > 0)}
          onClick={handleUnstake}
          className={`btn-primary w-full ${
            cooldownRemaining && cooldownRemaining > 0 
              ? 'opacity-50 cursor-not-allowed' 
              : ''
          }`}
        >
          {unstaking 
            ? 'UNSTAKING...' 
            : cooldownRemaining && cooldownRemaining > 0 
            ? `⏳ ${formatTime(cooldownRemaining)}` 
            : 'UNSTAKE'}
        </button>

        <div className="text-[9px] text-gray-500 text-center mt-2">
          {cooldownRemaining && cooldownRemaining > 0 
            ? `Cooldown: ${formatTime(cooldownRemaining)} remaining`
            : 'Min: 100 WHISTLE'}
        </div>
      </div>
    </motion.div>
  );
}
