'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { createStakeTransaction, createUnstakeTransaction, fetchStakerAccount, connection } from '@/lib/contract';
import toast from 'react-hot-toast';
import PanelFrame from './PanelFrame';

export default function StakingPanel() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const [staking, setStaking] = useState(false);
  const [unstaking, setUnstaking] = useState(false);
  const [amount, setAmount] = useState('100');
  const [cooldownRemaining, setCooldownRemaining] = useState<number | null>(null);

  const handleStake = async () => {
    if (!publicKey || !connected) {
      toast.error('Wallet connection required', {
        duration: 4000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '16px',
          fontSize: '14px',
        },
      });
      return;
    }

    const stakeAmount = parseFloat(amount);
    if (isNaN(stakeAmount) || stakeAmount < 100) {
      toast.error('Minimum stake amount is 100 WHISTLE', {
        duration: 4000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          padding: '16px',
          fontSize: '14px',
        },
      });
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
      
      toast.success((t) => (
        <div className="flex flex-col gap-2">
          <div className="font-semibold">Staking Successful</div>
          <div className="text-sm text-gray-300">
            Staked {stakeAmount} WHISTLE
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
        duration: 6000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '16px',
          minWidth: '300px',
        },
      });
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
      
      toast.error((t) => (
        <div className="flex flex-col gap-2">
          <div className="font-semibold">Staking Failed</div>
          <div className="text-sm text-gray-300 max-w-sm break-words">
            {errorMsg}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Check console (F12) for details
          </div>
        </div>
      ), {
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
      setStaking(false);
    }
  };

  const handleUnstake = async () => {
    if (!publicKey || !connected) {
      toast.error('Wallet connection required', {
        duration: 4000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '16px',
          fontSize: '14px',
        },
      });
      return;
    }

    const unstakeAmount = parseFloat(amount);
    if (isNaN(unstakeAmount) || unstakeAmount <= 0) {
      toast.error('Invalid unstake amount', {
        duration: 4000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '16px',
          fontSize: '14px',
        },
      });
      return;
    }

    setUnstaking(true);
    try {
      console.log('Creating unstake transaction for:', unstakeAmount, 'WHISTLE');
      console.log('Wallet:', publicKey.toBase58());
      
      const transaction = await createUnstakeTransaction(publicKey, unstakeAmount);
      console.log('Transaction created, sending...');
      
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: true,
        maxRetries: 3,
      });
      console.log('Transaction sent:', signature);
      console.log('Waiting for confirmation...');
      
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
      
      console.log('✅ Unstake confirmed successfully!');
      console.log('Signature:', signature);
      console.log('View on Solscan:', `https://solscan.io/tx/${signature}`);
      
      toast.success((t) => (
        <div className="flex flex-col gap-2">
          <div className="font-semibold">Unstaking Successful</div>
          <div className="text-sm text-gray-300">
            Unstaked {unstakeAmount} WHISTLE
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
        duration: 6000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '16px',
          minWidth: '300px',
        },
      });
      setAmount('100');
    } catch (err: any) {
      console.error('Unstaking failed:', err);
      console.error('Error details:', {
        message: err?.message,
        name: err?.name,
        stack: err?.stack,
        logs: err?.logs,
        toString: err?.toString()
      });
      
      let errorMsg = 'Unknown error';
      let isCooldownError = false;
      
      if (err?.message) {
        errorMsg = err.message;
        // Check if it's a cooldown error (InvalidInstructionData from unstake)
        if (errorMsg.includes('InvalidInstructionData') || errorMsg.includes('Instruction 1')) {
          isCooldownError = true;
          errorMsg = 'Cannot unstake yet - 24 hour cooldown period has not elapsed since your last stake';
        }
      } else if (typeof err === 'object' && 'InstructionError' in err) {
        const [index, errCode] = (err as any).InstructionError;
        // Instruction 1 is the unstake instruction (after ComputeBudgetProgram)
        if (index === 1 && JSON.stringify(errCode).includes('InvalidInstructionData')) {
          isCooldownError = true;
          errorMsg = 'Cannot unstake yet - 24 hour cooldown period has not elapsed since your last stake';
        } else {
          errorMsg = `Instruction ${index} error: ${JSON.stringify(errCode)}`;
        }
      } else if (err?.toString && typeof err.toString === 'function') {
        try {
          errorMsg = err.toString();
        } catch {
          errorMsg = 'Error converting error to string';
        }
      }
      
      toast.error((t) => (
        <div className="flex flex-col gap-2">
          <div className="font-semibold">Unstaking Failed</div>
          <div className="text-sm text-gray-300 max-w-sm break-words">
            {errorMsg}
          </div>
          {isCooldownError && (
            <div className="text-xs text-yellow-400 mt-2">
              You must wait 24 hours after staking before you can unstake
            </div>
          )}
          <div className="text-xs text-gray-500 mt-1">
            Check console (F12) for details
          </div>
        </div>
      ), {
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
      setUnstaking(false);
    }
  };

  // Load cooldown info on mount and wallet change
  useEffect(() => {
    if (publicKey && connected) {
      loadCooldown();
      
      // Update every 10 seconds (less aggressive than before)
      const interval = setInterval(loadCooldown, 10000);
      
      return () => clearInterval(interval);
    } else {
      setCooldownRemaining(null);
    }
  }, [publicKey, connected]);

  const loadCooldown = async () => {
    if (!publicKey) return;
    
    try {
      const stakerAccount = await fetchStakerAccount(publicKey);
      if (!stakerAccount) {
        setCooldownRemaining(null);
        return;
      }

      const lastStake = stakerAccount.lastStakeTime;
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
      setCooldownRemaining(null);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <PanelFrame
      cornerType="silver"
      className="min-h-[240px] flex flex-col"
      motionProps={{
        initial: { opacity: 0, x: -50 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.6, delay: 0.1 }
      }}
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
          {unstaking ? 'UNSTAKING...' : 'UNSTAKE'}
        </button>

        {cooldownRemaining !== null && cooldownRemaining > 0 ? (
          <div className="text-[9px] text-amber-400 text-center mt-2 font-semibold">
            ⏳ Cooldown: {formatTime(cooldownRemaining)}
          </div>
        ) : (
        <div className="text-[9px] text-gray-500 text-center mt-2">
            Min: 100 WHISTLE • 24h cooldown after stake
        </div>
        )}
      </div>
    </PanelFrame>
  );
}
