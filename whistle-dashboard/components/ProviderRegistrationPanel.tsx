'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import ProviderRegistrationModal from './ProviderRegistrationModal';
import PanelFrame from './PanelFrame';

export default function ProviderRegistrationPanel() {
  const { connected } = useWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRegister = () => {
    if (!connected) {
      alert('Please connect your wallet first');
      return;
    }
    setIsModalOpen(true);
  };

  return (
    <>
    <PanelFrame
      cornerType="gold"
      motionProps={{
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.6, delay: 0.4 }
      }}
    >
      <h3 className="text-[11px] font-semibold mb-4 tracking-[0.15em]">
        BECOME A PROVIDER
      </h3>

      <div className="space-y-4">
        <div className="text-xs text-gray-400 leading-relaxed">
          Run a WHISTLE node and earn SOL by serving RPC queries to the network.
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-white text-xs mt-0.5">✓</span>
            <span className="text-xs text-gray-300">Earn SOL per query</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-white text-xs mt-0.5">✓</span>
            <span className="text-xs text-gray-300">No rate limits</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-white text-xs mt-0.5">✓</span>
            <span className="text-xs text-gray-300">Decentralized network</span>
          </div>
        </div>

        <div className="pt-3 border-t border-white/10">
          <div className="text-[9px] text-gray-500 tracking-widest mb-2">REQUIREMENTS</div>
          <div className="space-y-1 text-[10px] text-gray-400">
            <div>• Min stake: 10k WHISTLE</div>
            <div>• 2TB NVMe storage</div>
            <div>• 64GB RAM (recommended)</div>
            <div>• 99%+ uptime</div>
          </div>
        </div>

        <button
          onClick={handleRegister}
          disabled={!connected}
          className="btn-primary w-full mt-4"
        >
          REGISTER NOW
        </button>
      </div>
    </PanelFrame>

    {/* Registration Modal - Rendered outside panel */}
    <ProviderRegistrationModal 
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
    />
    </>
  );
}
