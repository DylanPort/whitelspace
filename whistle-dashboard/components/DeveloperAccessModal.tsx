'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import { connection } from '@/lib/contract';
import { 
  createRPCPaymentTransaction, 
  verifyAndActivateSubscription,
  RPC_PACKAGES 
} from '@/lib/rpc-subscription';

interface DeveloperAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Package {
  id: string;
  name: string;
  duration: string;
  rateLimit: string;
  maxQueries: string;
  priceSol: number;
  priceUsd: number;
  description: string;
  popular?: boolean;
  bestValue?: boolean;
}

const PACKAGES: Package[] = Object.values(RPC_PACKAGES);

export default function DeveloperAccessModal({ isOpen, onClose }: DeveloperAccessModalProps) {
  const { publicKey, connected, sendTransaction } = useWallet();
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  if (!isOpen) return null;

  const handlePurchase = async (pkg: Package) => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    setSelectedPackage(pkg);
    setPurchasing(true);

    try {
      console.log('📦 Purchasing RPC subscription:', {
        package: pkg.name,
        wallet: publicKey.toBase58(),
        priceSol: pkg.priceSol
      });

      // Create payment transaction
      toast.loading(`Creating payment transaction...`, { id: 'purchase' });
      
      const transaction = await createRPCPaymentTransaction(
        connection,
        publicKey,
        pkg.id
      );

      console.log('📝 Transaction created, requesting signature...');

      // Send transaction
      toast.loading(`Please approve the transaction in your wallet...`, { id: 'purchase' });
      
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        maxRetries: 3
      });

      console.log('✅ Transaction sent:', signature);
      toast.loading(`Payment processing... (${signature.slice(0, 8)}...)`, { id: 'purchase' });

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

      console.log('✅ Payment confirmed, activating subscription...');
      toast.loading(`Activating your ${pkg.name}...`, { id: 'purchase' });

      // Verify and activate subscription
      const result = await verifyAndActivateSubscription(
        signature,
        publicKey.toBase58(),
        pkg.id
      );

      if (!result.ok) {
        throw new Error(result.error || 'Subscription activation failed');
      }

      console.log('✅ Subscription activated:', result.subscription);

      // Success!
      toast.success((t) => (
        <div className="flex flex-col gap-2">
          <div className="font-semibold">🎉 {pkg.name} Activated!</div>
          <div className="text-sm text-gray-300">
            Your RPC access is now live
          </div>
          <div className="text-xs text-gray-500">
            API Key: {publicKey.toBase58().slice(0, 20)}...
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
        id: 'purchase',
        duration: 8000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '16px',
          minWidth: '350px',
        },
      });

      // Close modal after success
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Purchase failed:', error);
      
      toast.error((t) => (
        <div className="flex flex-col gap-2">
          <div className="font-semibold">Purchase Failed</div>
          <div className="text-sm text-gray-300 max-w-sm break-words">
            {error?.message || String(error)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Check console (F12) for details
          </div>
        </div>
      ), {
        id: 'purchase',
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
      setPurchasing(false);
      setSelectedPackage(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border border-emerald-500/30 rounded-2xl shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors"
        >
          <span className="text-white text-lg">×</span>
        </button>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-[11px] font-semibold tracking-[0.15em] mb-2">
              DEVELOPER RPC ACCESS
            </h3>
            <p className="text-xs text-gray-400">
              Get instant access to WHISTLE decentralized RPC network
            </p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-gray-300">Global CDN</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-gray-300">99.9% Uptime</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-gray-300">Instant Activation</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-gray-300">Pay in SOL</span>
            </div>
          </div>

          {/* Package Cards */}
          <div className="space-y-3">
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative border rounded-xl p-4 transition-all cursor-pointer ${
                  selectedPackage?.id === pkg.id
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/30'
                }`}
                onClick={() => !purchasing && handlePurchase(pkg)}
              >
                {/* Badge */}
                {(pkg.popular || pkg.bestValue) && (
                  <div className="absolute -top-2 right-4 px-2 py-0.5 bg-emerald-500 text-black text-[8px] font-bold tracking-wider rounded">
                    {pkg.popular ? '⭐ POPULAR' : '💎 BEST VALUE'}
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    {/* Package Name */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {pkg.name}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {pkg.duration}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-[10px] text-gray-400">
                      {pkg.description}
                    </p>

                    {/* Specs */}
                    <div className="flex items-center gap-4 text-[9px] text-gray-500">
                      <span>{pkg.rateLimit}</span>
                      <span>•</span>
                      <span>{pkg.maxQueries}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-400">
                      {pkg.priceSol}
                    </div>
                    <div className="text-[9px] text-gray-500">
                      SOL
                    </div>
                    <div className="text-[9px] text-gray-600 mt-0.5">
                      ~${pkg.priceUsd}
                    </div>
                  </div>
                </div>

                {/* Purchase Button */}
                {selectedPackage?.id === pkg.id && purchasing ? (
                  <div className="mt-3 text-center text-xs text-emerald-400 animate-pulse">
                    Processing...
                  </div>
                ) : (
                  <div className="mt-3 text-center text-[9px] text-gray-500">
                    Click to purchase
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer Info */}
          <div className="border-t border-white/10 pt-4 space-y-2">
            <div className="text-[9px] text-gray-500">
              <span className="font-semibold text-white">90%</span> of revenue distributed to WHISTLE stakers automatically
            </div>
            <div className="text-[9px] text-gray-500">
              Payments in SOL • Instant activation • Support 24/7
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

