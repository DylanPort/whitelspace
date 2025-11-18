'use client';

import { useEffect, useState } from 'react';
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

      {/* Header with enhanced styling */}
      <header className="relative z-10 flex items-center justify-between px-16 py-8 border-b border-white/5">
        {/* WHISTLE Logo - Non-clickable */}
        <div
          className="relative text-3xl font-bold tracking-[0.35em] px-8 py-3 backdrop-blur-sm bg-white/5 border-2 border-white/10"
          style={{
            textShadow: '0 0 20px rgba(255, 255, 255, 0.3), 0 2px 4px rgba(0, 0, 0, 0.9)',
            clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px)',
          }}
        >
          <span className="text-white">
            WHISTLE
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Network Status */}
          <div className="flex items-center gap-3 text-sm backdrop-blur-sm bg-black/20 px-4 py-2 rounded border border-white/5">
            <span className="text-gray-400">{rpcSource}</span>
            <span className="text-gray-600">~</span>
            <span className={backendStatus === 'online' ? 'text-white' : 'text-gray-400'}>
              {backendStatus === 'checking' ? 'Checking...' : 
               backendStatus === 'online' ? 'Active' : 'Syncing'}
            </span>
          </div>

          {/* How It Works Button */}
          <button
            onClick={() => setShowHowItWorks(true)}
            className="group relative text-xs font-semibold tracking-wider uppercase px-5 py-2.5 backdrop-blur-sm bg-emerald-600/90 hover:bg-emerald-500/90 border border-emerald-500/50 hover:border-emerald-400/70 transition-all duration-300"
            style={{
              clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
            }}
          >
            <span className="text-white group-hover:text-white transition-colors">
              How It Works
            </span>
          </button>
        </div>
      </header>

      {/* Main content - 5 column layout */}
      <div className="relative z-10 flex-1 px-6 flex flex-col pb-8" style={{ zoom: 0.85 }}>
        {/* Top section - panels and core */}
        <div className="max-w-[1400px] mx-auto flex items-start justify-center gap-4 mb-6 pt-6">
          
          {/* FAR LEFT COLUMN - User Info */}
          <div className="w-[200px] space-y-4 flex-shrink-0">
            <RpcEndpointPanel />
            <ApiMethodsPanel />
          </div>

          {/* LEFT COLUMN - User Actions */}
          <div className="w-[250px] space-y-5 flex-shrink-0">
            <QueryInterfacePanel />
            <NetworkStatsPanel />
            <WhyStakePanel />
          </div>

          {/* CENTER - Core (Wallet + Credits) + Info Buttons */}
          <div className="flex-shrink-0 -mt-4 flex flex-col gap-3">
            <CentralCore />
            
            {/* Ghost Whistle & Resources Buttons Row */}
            <div className="flex gap-2">
              <div style={{ width: '169px' }}>
                <GhostWhistlePanel />
              </div>
              <div style={{ width: '169px' }}>
                <ResourcesPanel />
              </div>
            </div>

            {/* Decentralization Progress Bar */}
            <DecentralizationProgress />

            {/* Governance Button */}
            <GovernancePanel />
          </div>

          {/* RIGHT COLUMN - Provider Actions */}
          <div className="w-[250px] space-y-5 flex-shrink-0">
            <StakingPanel />
            <ProviderEarningsPanel />
            <OurPlansPanel />
          </div>

          {/* FAR RIGHT COLUMN - Provider Info */}
          <div className="w-[200px] space-y-4 flex-shrink-0">
            <RpcProvidersPanel />
            <ProviderRegistrationPanel />
          </div>

        </div>

        {/* System Info Section - 4 Column Grid */}
        <div className="max-w-[1400px] mx-auto w-full grid grid-cols-4 gap-4 mb-6">
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
