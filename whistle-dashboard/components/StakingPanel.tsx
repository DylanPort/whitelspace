'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { createStakeTransaction, connection } from '@/lib/contract';

export default function StakingPanel() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const [staking, setStaking] = useState(false);
  const [amount, setAmount] = useState('100');

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
      
      const signature = await sendTransaction(transaction, connection);
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
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
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
      } else if (err?.toString) {
        errorMsg = err.toString();
      }
      
      alert(`❌ Staking failed: ${errorMsg}`);
    } finally {
      setStaking(false);
    }
  };

  const handleBuyWhistle = () => {
    // TODO: Integrate with DEX or token purchase flow
    alert('$WHISTLE token sale coming soon!');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="panel-base p-6 rounded-[16px] clip-angled-border"
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
          disabled={!connected}
          onClick={handleBuyWhistle}
          className="btn-primary w-full"
        >
          $WHISTLE
        </button>

        <div className="text-[9px] text-gray-500 text-center mt-2">
          Min: 100 WHISTLE
        </div>
      </div>
    </motion.div>
  );
}
