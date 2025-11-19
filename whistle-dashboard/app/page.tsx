'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { isMobileDevice, getMobileWalletInfo } from '@/lib/mobile-wallet-bridge';
import toast from 'react-hot-toast';
import CentralCore from '@/components/CentralCore';
import RpcProvidersPanel from '@/components/RpcProvidersPanel';
import QueryInterfacePanel from '@/components/QueryInterfacePanel';
import StakingPanel from '@/components/StakingPanel';
import ProviderEarningsPanel from '@/components/ProviderEarningsPanel';
import RpcEndpointPanel from '@/components/RpcEndpointPanel';
import NetworkStatsPanel from '@/components/NetworkStatsPanel';
import RecentActivityPanel from '@/components/RecentActivityPanel';
import ApiMethodsPanel from '@/components/ApiMethodsPanel';
import ProviderRegistrationPanel from '@/components/ProviderRegistrationPanel';
import HowItWorksModal from '@/components/HowItWorksModal';
import PoolInfoPanel from '@/components/PoolInfoPanel';
import PersonalStatsPanel from '@/components/PersonalStatsPanel';
import NetworkProviderPanel from '@/components/NetworkProviderPanel';
import TreasuryPanel from '@/components/TreasuryPanel';
import WhyStakePanel from '@/components/WhyStakePanel';
import OurPlansPanel from '@/components/OurPlansPanel';
import GhostWhistlePanel from '@/components/GhostWhistlePanel';
import ResourcesPanel from '@/components/ResourcesPanel';
import DecentralizationProgress from '@/components/DecentralizationProgress';
import GovernancePanel from '@/components/GovernancePanel';
import { api } from '@/lib/api';

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [rpcSource, setRpcSource] = useState('Checking...');
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const { connected, publicKey } = useWallet();

  useEffect(() => {
    async function checkBackend() {
      try {
        const health = await api.checkHealth();
        setBackendStatus('online');
        setRpcSource('WHISTLE Network');
      } catch (err) {
        console.error('Backend health check failed:', err);
        setBackendStatus('offline');
        setRpcSource('WHISTLE Network');
      }
    }

    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check for existing mobile wallet from main.html
  useEffect(() => {
    // Only check if not already connected and on mobile
    if (connected || !isMobileDevice()) return;

    const checkMobileWallet = () => {
      const mobileWallet = getMobileWalletInfo();
      
      if (mobileWallet && mobileWallet.hasWallet) {
        const shortAddress = `${mobileWallet.publicKey.slice(0, 4)}...${mobileWallet.publicKey.slice(-4)}`;
        
        toast((t) => (
          <div className="flex flex-col gap-2">
            <div className="font-semibold text-sm">Mobile Wallet Detected</div>
            <div className="text-xs text-gray-300">
              Found wallet: {shortAddress}
            </div>
            <div className="text-xs text-gray-400">
              Tap "Connect" above to use your existing wallet
            </div>
          </div>
        ), {
          duration: 8000,
          position: 'bottom-center',
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '16px',
            minWidth: '280px',
            maxWidth: '90vw',
          },
        });
      }
    };

    // Check after a small delay to let the wallet adapter initialize
    const timer = setTimeout(checkMobileWallet, 1000);
    return () => clearTimeout(timer);
  }, [connected]);

  return (
    <main className="relative min-h-screen overflow-x-hidden overflow-y-auto flex flex-col">
      {/* Layered background effects */}
      <div className="manga-speedlines" />
      
      {/* Subtle grid overlay */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          opacity: 0.3,
        }}
      />

      {/* Monochrome radial gradient for depth */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(circle at 50% 50%, transparent 0%, rgba(0, 0, 0, 0.5) 100%),
            radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.02) 0%, transparent 40%),
            radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.015) 0%, transparent 40%)
          `,
        }}
      />

      {/* Header with enhanced styling - Mobile Responsive */}
      <header className="relative z-10 flex items-center justify-between px-4 md:px-8 lg:px-16 py-4 md:py-6 lg:py-8 border-b border-white/5">
        {/* WHISTLE Logo - Non-clickable */}
        <div
          className="text-xl md:text-2xl lg:text-3xl font-bold tracking-[0.25em] md:tracking-[0.35em] text-white"
          style={{
            textShadow: '0 0 20px rgba(255, 255, 255, 0.3), 0 2px 4px rgba(0, 0, 0, 0.9)',
          }}
        >
          WHISTLE
        </div>
        
        {/* How It Works Button */}
        <button
          onClick={() => setShowHowItWorks(true)}
          className="group relative text-[10px] md:text-xs font-semibold tracking-wider uppercase px-3 md:px-5 py-2 md:py-2.5 border border-emerald-600/20 hover:border-emerald-500/30 transition-all duration-300"
          style={{
            clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
            background: 'rgba(16, 185, 129, 0.08)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.15), inset 0 0 20px rgba(16, 185, 129, 0.05)',
          }}
        >
          <span className="text-emerald-200 group-hover:text-emerald-100 transition-colors">
            How It Works
          </span>
        </button>
      </header>

      {/* Main content - Responsive layout */}
      <div className="relative z-10 flex-1 px-3 md:px-6 lg:px-0 flex flex-col pb-8" style={{ zoom: isDesktop ? 0.85 : 1 }}>
        {/* Top section - panels and core */}
        <div className="w-full flex flex-col lg:flex-row items-start lg:items-center lg:justify-center gap-3 md:gap-4 lg:gap-3 mb-4 md:mb-6 pt-4 md:pt-6">
          
          {/* FAR LEFT COLUMN - User Info */}
          <div className="w-full lg:w-[200px] space-y-3 md:space-y-4 flex-shrink-0 lg:mr-0">
            <RpcEndpointPanel />
            <ApiMethodsPanel />
          </div>

          {/* LEFT COLUMN - User Actions */}
          <div className="w-full lg:w-[250px] space-y-3 md:space-y-5 flex-shrink-0 lg:mr-0">
            <QueryInterfacePanel />
            <NetworkStatsPanel />
            <WhyStakePanel />
          </div>

          {/* CENTER - Core (Wallet + Credits) + Info Buttons */}
          <div className="w-full lg:w-auto lg:flex-shrink-0 lg:-mt-4 flex flex-col gap-3 items-center lg:mx-0">
            <CentralCore />
            
            {/* Ghost Whistle & Resources Buttons Row */}
            <div className="flex gap-2 lg:gap-1.5 w-full lg:w-auto">
              <div className="flex-1 lg:flex-none lg:w-[180px]">
                <GhostWhistlePanel />
              </div>
              <div className="flex-1 lg:flex-none lg:w-[140px]">
                <ResourcesPanel />
              </div>
            </div>

            {/* Decentralization Progress Bar */}
            <DecentralizationProgress />

            {/* Governance Button */}
            <GovernancePanel />
          </div>

          {/* RIGHT COLUMN - Provider Actions */}
          <div className="w-full lg:w-[250px] space-y-3 md:space-y-5 flex-shrink-0 lg:ml-0">
            <StakingPanel />
            <ProviderEarningsPanel />
            <OurPlansPanel />
          </div>

          {/* FAR RIGHT COLUMN - Provider Info */}
          <div className="w-full lg:w-[200px] space-y-3 md:space-y-4 flex-shrink-0 lg:ml-0">
            <RpcProvidersPanel />
            <ProviderRegistrationPanel />
          </div>

        </div>

        {/* System Info Section - Responsive Grid */}
        <div className="max-w-[1400px] mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          <PoolInfoPanel />
          <PersonalStatsPanel />
          <NetworkProviderPanel />
          <TreasuryPanel />
        </div>

        {/* Bottom section - Recent Activity */}
        <div className="max-w-[1400px] mx-auto w-full flex items-center justify-center">
          <RecentActivityPanel />
        </div>
      </div>

      {/* How It Works Modal */}
      <HowItWorksModal 
        isOpen={showHowItWorks} 
        onClose={() => setShowHowItWorks(false)} 
      />
    </main>
  );
}
