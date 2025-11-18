'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { createRegisterProviderTransaction, connection, MIN_PROVIDER_BOND, WHISTLE_DECIMALS } from '@/lib/contract';
import { getAccount, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

// WHISTLE Token Mint from contract
const WHISTLE_MINT = new PublicKey('6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump');

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
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
        setWhistleBalance(0);
      } finally {
        setCheckingBalance(false);
      }
    }

    checkBalance();
  }, [publicKey, isOpen]);

  const handleSubmit = async () => {
    if (!publicKey || !connected) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const bondAmount = parseFloat(formData.bondAmount);
      
      // Validation checks
      if (isNaN(bondAmount) || bondAmount < minBond) {
        setError(`Minimum bond is ${minBond} WHISTLE`);
        setLoading(false);
        return;
      }

      if (whistleBalance !== null && whistleBalance < bondAmount) {
        setError(`Insufficient WHISTLE balance. You have ${whistleBalance.toFixed(2)} but need ${bondAmount}`);
        setLoading(false);
        return;
      }

      if (!formData.endpoint || formData.endpoint.length < 10) {
        setError('Please enter a valid RPC endpoint URL (min 10 characters)');
        setLoading(false);
        return;
      }

      // Validate endpoint format
      try {
        new URL(formData.endpoint);
      } catch {
        setError('Invalid endpoint URL format. Must start with https:// or wss://');
        setLoading(false);
        return;
      }

      // Create provider registration transaction
      console.log('Creating registration transaction...');
      const transaction = await createRegisterProviderTransaction(
        publicKey,
        formData.endpoint,
        bondAmount
      );
      
      console.log('Sending transaction...');
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: true,
        maxRetries: 3,
      });
      
      console.log('Confirming transaction...');
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }, 'confirmed');
      
      setSuccess(`Registration successful! Bonded ${bondAmount} WHISTLE. Signature: ${signature.slice(0, 8)}...`);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setStep(1);
        setFormData({
          bondAmount: minBond.toString(),
          endpoint: '',
        });
        onClose();
      }, 3000);
      
    } catch (err: any) {
      console.error('Registration failed:', err);
      
      let errorMsg = 'Unknown error';
      if (err.message?.includes('User rejected')) {
        errorMsg = 'Transaction cancelled by user';
      } else if (err.message?.includes('insufficient')) {
        errorMsg = 'Insufficient SOL for transaction fee';
      } else if (err.message?.includes('0x1')) {
        errorMsg = 'Insufficient WHISTLE tokens';
      } else {
        errorMsg = err.message || err.toString();
      }
      
      setError(`Registration failed: ${errorMsg}`);
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
            className="fixed inset-0 z-50"
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ pointerEvents: 'none' }}
          >
            <div 
              className="relative w-full max-w-2xl bg-black border border-white/15 flex flex-col"
              style={{
                maxHeight: '90vh',
                height: 'auto',
                pointerEvents: 'auto',
                clipPath: 'polygon(20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px), 0 20px)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-8 pb-4 border-b border-white/10 flex-shrink-0">
                <h2 className="text-2xl font-bold tracking-[0.2em] uppercase">
                  PROVIDER REGISTRATION
                </h2>
                <button
                  onClick={onClose}
                  className="text-3xl text-gray-400 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Progress indicator */}
              <div className="flex items-center gap-2 px-8 pt-4 flex-shrink-0">
                <div 
                  className={`flex-1 h-1 transition-all ${step >= 1 ? 'bg-white' : 'bg-white/20'}`}
                />
                <div 
                  className={`flex-1 h-1 transition-all ${step >= 2 ? 'bg-white' : 'bg-white/20'}`}
                />
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-8" style={{ minHeight: 0 }}>
                
                {/* Step 1: Requirements */}
                {step === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="p-6 bg-white/5 border border-white/10">
                      <p className="text-sm text-gray-300 leading-relaxed">
                        Register as a WHISTLE provider and earn SOL by serving RPC queries to the network. Providers are the backbone of the decentralized infrastructure.
                      </p>
                    </div>

                    {/* WHISTLE Balance Check */}
                    <div className="p-6 bg-black/40 border border-white/10">
                      <div className="text-xs font-semibold tracking-wider uppercase text-gray-400 mb-3">
                        YOUR WHISTLE BALANCE
                      </div>
                      {checkingBalance ? (
                        <div className="text-sm text-gray-400">Checking balance...</div>
                      ) : (
                        <>
                          <div className="text-3xl font-bold mb-2">
                            {whistleBalance !== null ? whistleBalance.toFixed(2) : '0.00'}
                          </div>
                          <div className="text-xs text-gray-500">WHISTLE TOKENS</div>
                          
                          {whistleBalance !== null && whistleBalance < minBond && (
                            <div className="mt-4 p-3 bg-white/5 border border-white/10 text-xs text-gray-400">
                              You need at least {minBond} WHISTLE to register as a provider.
                              <br />
                              <a
                                href={`https://jup.ag/swap/SOL-${WHISTLE_MINT.toBase58()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white hover:underline mt-2 inline-block"
                              >
                                Buy WHISTLE on Jupiter
                              </a>
                            </div>
                          )}
                          {whistleBalance !== null && whistleBalance >= minBond && (
                            <div className="mt-4 p-3 bg-white/5 border border-white/10 text-xs text-white">
                              You have enough WHISTLE to register
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Requirements */}
                    <div className="p-6 bg-black/40 border border-white/10">
                      <h3 className="text-xs font-semibold tracking-wider uppercase text-gray-400 mb-4">
                        REQUIREMENTS
                      </h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-3">
                          <span className="text-white mt-0.5">—</span>
                          <div>
                            <strong className="text-white block mb-1">1,000 WHISTLE Minimum Bond</strong>
                            <p className="text-gray-400 text-xs">Locked as collateral, slashed if you misbehave</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-white mt-0.5">—</span>
                          <div>
                            <strong className="text-white block mb-1">Dedicated Server</strong>
                            <p className="text-gray-400 text-xs">2TB NVMe storage, 64GB RAM recommended</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-white mt-0.5">—</span>
                          <div>
                            <strong className="text-white block mb-1">99%+ Uptime</strong>
                            <p className="text-gray-400 text-xs">High availability required for reputation</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-white mt-0.5">—</span>
                          <div>
                            <strong className="text-white block mb-1">Public RPC Endpoint</strong>
                            <p className="text-gray-400 text-xs">HTTPS or WSS accessible URL</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Earnings */}
                    <div className="p-6 bg-white/5 border border-white/10">
                      <h3 className="text-xs font-semibold tracking-wider uppercase text-gray-400 mb-3">
                        WHAT YOU'LL EARN
                      </h3>
                      <div className="space-y-2 text-sm text-gray-300">
                        <p>70% of all query fees (0.000007 SOL per query)</p>
                        <p>Bonus pool rewards for top performers</p>
                        <p>Reputation-based query routing</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Registration Form */}
                {step === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* Bond Amount */}
                    <div>
                      <label className="block text-xs font-semibold tracking-wider uppercase text-gray-400 mb-3">
                        BOND AMOUNT (WHISTLE)
                      </label>
                      <input
                        type="number"
                        value={formData.bondAmount}
                        onChange={(e) => handleInputChange('bondAmount', e.target.value)}
                        min={minBond}
                        step="100"
                        className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm focus:border-white/40 focus:outline-none transition-colors"
                        placeholder={minBond.toString()}
                      />
                      <p className="text-xs text-gray-500 mt-2">Minimum: {minBond} WHISTLE</p>
                    </div>

                    {/* RPC Endpoint */}
                    <div>
                      <label className="block text-xs font-semibold tracking-wider uppercase text-gray-400 mb-3">
                        RPC ENDPOINT URL
                      </label>
                      <input
                        type="text"
                        value={formData.endpoint}
                        onChange={(e) => handleInputChange('endpoint', e.target.value)}
                        className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm focus:border-white/40 focus:outline-none transition-colors"
                        placeholder="https://your-rpc.example.com:8899"
                      />
                      <p className="text-xs text-gray-500 mt-2">Your public RPC endpoint (HTTPS or WSS)</p>
                    </div>

                    {/* Error/Success Messages */}
                    {error && (
                      <div className="p-4 bg-white/5 border border-white/10 text-sm text-gray-300">
                        {error}
                      </div>
                    )}
                    
                    {success && (
                      <div className="p-4 bg-white/5 border border-white/10 text-sm text-white">
                        {success}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 flex items-center justify-between flex-shrink-0">
                {step === 1 ? (
                  <>
                    <div className="text-[10px] text-gray-500">
                      Step 1 of 2
                    </div>
                    <button
                      onClick={() => setStep(2)}
                      disabled={!connected || (whistleBalance !== null && whistleBalance < minBond)}
                      className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all text-sm font-semibold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
                      }}
                    >
                      {whistleBalance !== null && whistleBalance < minBond 
                        ? 'Insufficient Balance' 
                        : 'CONTINUE'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setStep(1)}
                      className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all text-sm font-semibold tracking-wider disabled:opacity-50"
                      disabled={loading}
                      style={{
                        clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
                      }}
                    >
                      BACK
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!connected || loading}
                      className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all text-sm font-semibold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
                      }}
                    >
                      {loading ? 'REGISTERING...' : 'REGISTER'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
