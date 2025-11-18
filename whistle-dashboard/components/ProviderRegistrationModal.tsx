'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { createRegisterProviderTransaction, connection, MIN_PROVIDER_BOND, WHISTLE_DECIMALS } from '@/lib/contract';
import { getAccount, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

// WHISTLE Token Mint from contract
const WHISTLE_MINT = new PublicKey('6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump');
import toast from 'react-hot-toast';

interface ProviderRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProviderRegistrationModal({ isOpen, onClose }: ProviderRegistrationModalProps) {
  const { publicKey, connected, sendTransaction } = useWallet();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [whistleBalance, setWhistleBalance] = useState<number | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);
  
  // Form state
  const minBond = MIN_PROVIDER_BOND / (10 ** WHISTLE_DECIMALS); // 1000 WHISTLE
  const [formData, setFormData] = useState({
    bondAmount: minBond.toString(),
    endpoint: '',
  });

  // Check WHISTLE balance when modal opens
  useEffect(() => {
    async function checkBalance() {
      if (!publicKey || !isOpen) return;
      
      setCheckingBalance(true);
      try {
        const tokenAccount = getAssociatedTokenAddressSync(WHISTLE_MINT, publicKey);
        const accountInfo = await getAccount(connection, tokenAccount);
        const balance = Number(accountInfo.amount) / (10 ** WHISTLE_DECIMALS);
        setWhistleBalance(balance);
      } catch (err) {
        console.error('Error checking WHISTLE balance:', err);
        setWhistleBalance(0); // Assume no tokens if error
      } finally {
        setCheckingBalance(false);
      }
    }

    checkBalance();
  }, [publicKey, isOpen]);

  const handleSubmit = async () => {
    if (!publicKey || !connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const bondAmount = parseFloat(formData.bondAmount);
      
      // Validation checks
      if (isNaN(bondAmount) || bondAmount < minBond) {
        toast.error(`Minimum bond is ${minBond} WHISTLE`);
        setLoading(false);
        return;
      }

      if (whistleBalance !== null && whistleBalance < bondAmount) {
        toast.error(`Insufficient WHISTLE balance!\n\nYou have: ${whistleBalance.toFixed(2)} WHISTLE\nYou need: ${bondAmount} WHISTLE\n\nBuy WHISTLE tokens first.`);
        setLoading(false);
        return;
      }

      if (!formData.endpoint || formData.endpoint.length < 10) {
        toast.error('Please enter a valid RPC endpoint URL (min 10 characters)');
        setLoading(false);
        return;
      }

      // Validate endpoint format
      try {
        new URL(formData.endpoint);
      } catch {
        toast.error('Invalid endpoint URL format. Must start with https:// or wss://');
        setLoading(false);
        return;
      }

      // Create provider registration transaction
      toast.loading('Creating registration transaction...');
      const transaction = await createRegisterProviderTransaction(
        publicKey,
        formData.endpoint,
        bondAmount
      );
      
      toast.loading('Please approve the transaction in your wallet...');
      const signature = await sendTransaction(transaction, connection);
      
      toast.loading('Confirming transaction...');
      await connection.confirmTransaction(signature, 'confirmed');
      
      console.log('Registration transaction:', signature);
      toast.success(`✅ Provider registration successful!\n\nBond: ${bondAmount} WHISTLE\nEndpoint: ${formData.endpoint}\n\nYour node will be activated once you start serving queries.`, {
        duration: 8000,
      });
      
      // Reset and close
      setStep(1);
      setFormData({
        bondAmount: minBond.toString(),
        endpoint: '',
      });
      onClose();
    } catch (err: any) {
      console.error('Registration failed:', err);
      
      // Better error messages
      let errorMsg = 'Unknown error';
      if (err.message?.includes('User rejected')) {
        errorMsg = 'Transaction cancelled';
      } else if (err.message?.includes('insufficient')) {
        errorMsg = 'Insufficient SOL for transaction fee';
      } else if (err.message?.includes('0x1')) {
        errorMsg = 'Insufficient WHISTLE tokens';
      } else {
        errorMsg = err.message || err.toString();
      }
      
      toast.error(`❌ Registration failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none overflow-y-auto"
          >
            <div 
              className="relative w-full max-w-lg pointer-events-auto my-8 max-h-[90vh] overflow-y-auto"
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
                clipPath: 'polygon(20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px), 0 20px)',
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
              <div className="relative p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold tracking-[0.2em] uppercase">
                    Provider Registration
                  </h2>
                  <button
                    onClick={onClose}
                    className="text-2xl text-gray-400 hover:text-white transition-colors"
                    style={{
                      textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* Progress indicator */}
                <div className="flex items-center gap-2 mb-6">
                  <div 
                    className={`flex-1 h-1 ${step >= 1 ? 'bg-white' : 'bg-gray-700'}`}
                    style={{
                      boxShadow: step >= 1 ? '0 0 10px rgba(255, 255, 255, 0.3)' : 'none',
                    }}
                  />
                  <div 
                    className={`flex-1 h-1 ${step >= 2 ? 'bg-white' : 'bg-gray-700'}`}
                    style={{
                      boxShadow: step >= 2 ? '0 0 10px rgba(255, 255, 255, 0.3)' : 'none',
                    }}
                  />
                </div>

                {/* Step 1: Requirements */}
                {step === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="space-y-4 mb-6">
                      <p className="text-sm text-gray-300">
                        Register as a WHISTLE provider and earn SOL by serving RPC queries.
                      </p>

                      {/* WHISTLE Balance Check */}
                      <div className={`p-4 border ${whistleBalance !== null && whistleBalance >= minBond ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                        <div className="text-xs font-semibold tracking-wider uppercase mb-2">
                          YOUR WHISTLE BALANCE
                        </div>
                        {checkingBalance ? (
                          <div className="text-sm text-gray-400">Checking balance...</div>
                        ) : (
                          <>
                            <div className="text-2xl font-bold mb-1">
                              {whistleBalance !== null ? whistleBalance.toFixed(2) : '0.00'} WHISTLE
                            </div>
                            {whistleBalance !== null && whistleBalance < minBond && (
                              <div className="text-xs text-red-400 mt-2">
                                ⚠ You need at least {minBond} WHISTLE to register as a provider.
                                <br />
                                <span className="text-[10px]">Buy WHISTLE tokens on Jupiter or Raydium first.</span>
                              </div>
                            )}
                            {whistleBalance !== null && whistleBalance >= minBond && (
                              <div className="text-xs text-green-400 mt-2">
                                ✓ You have enough WHISTLE to register!
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div className="space-y-3 p-4 bg-black/40 border border-white/10">
                        <h3 className="text-xs font-semibold tracking-wider uppercase text-gray-400">
                          Requirements
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <span className={whistleBalance !== null && whistleBalance >= minBond ? 'text-green-400' : 'text-white'}>
                              {whistleBalance !== null && whistleBalance >= minBond ? '✓' : '○'}
                            </span>
                            <span className="text-gray-300">1,000 WHISTLE tokens bonded (minimum)</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-white">○</span>
                            <span className="text-gray-300">Dedicated server (2TB NVMe, 64GB RAM)</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-white">○</span>
                            <span className="text-gray-300">99%+ uptime commitment</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-white">○</span>
                            <span className="text-gray-300">Run WHISTLE provider software</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-black/40 border border-white/10">
                        <h3 className="text-xs font-semibold tracking-wider uppercase text-gray-400 mb-2">
                          What You'll Earn
                        </h3>
                        <p className="text-sm text-gray-300">
                          Earn SOL for every query served through your node. Earnings are distributed automatically based on performance and uptime.
                        </p>
                      </div>
                    </div>

                        <button
                          onClick={() => setStep(2)}
                          disabled={!connected || (whistleBalance !== null && whistleBalance < minBond)}
                          className="btn-primary w-full"
                        >
                          {whistleBalance !== null && whistleBalance < minBond 
                            ? 'Insufficient WHISTLE Balance' 
                            : 'Continue'}
                        </button>
                        
                        {whistleBalance !== null && whistleBalance < minBond && (
                          <div className="text-center mt-3">
                            <a
                              href={`https://jup.ag/swap/SOL-${WHISTLE_MINT.toBase58()}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-gray-400 hover:text-white underline"
                            >
                              Buy WHISTLE on Jupiter →
                            </a>
                          </div>
                        )}
                  </motion.div>
                )}

                {/* Step 2: Registration Form */}
                {step === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="space-y-4 mb-6">
                      {/* Bond Amount */}
                      <div>
                        <label className="block text-xs font-semibold tracking-wider uppercase text-gray-400 mb-2">
                          Bond Amount (WHISTLE)
                        </label>
                        <input
                          type="number"
                          value={formData.bondAmount}
                          onChange={(e) => handleInputChange('bondAmount', e.target.value)}
                          min={minBond}
                          step="100"
                          className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm"
                          placeholder={minBond.toString()}
                        />
                        <p className="text-xs text-gray-500 mt-1">Minimum: {minBond} WHISTLE</p>
                      </div>

                      {/* RPC Endpoint */}
                      <div>
                        <label className="block text-xs font-semibold tracking-wider uppercase text-gray-400 mb-2">
                          RPC Endpoint URL
                        </label>
                        <input
                          type="text"
                          value={formData.endpoint}
                          onChange={(e) => handleInputChange('endpoint', e.target.value)}
                          className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm"
                          placeholder="https://your-rpc.example.com:8899"
                        />
                        <p className="text-xs text-gray-500 mt-1">Your public RPC endpoint (HTTPS or WSS)</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep(1)}
                        className="btn-primary flex-1"
                        disabled={loading}
                      >
                        Back
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={!connected || loading}
                        className="btn-primary flex-1"
                      >
                        {loading ? 'Registering...' : 'Register'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

