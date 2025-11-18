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
import ProviderContactModal from '@/components/ProviderContactModal';
import { api } from '@/lib/api';

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [rpcSource, setRpcSource] = useState('Checking...');
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showProviderContact, setShowProviderContact] = useState(false);

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
        <div className="flex items-center gap-6">
          {/* WHISTLE Button - Provider Contact */}
          <button
            onClick={() => setShowProviderContact(true)}
            className="group relative text-3xl font-bold tracking-[0.35em] px-8 py-3 backdrop-blur-sm bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-white/30 transition-all duration-300"
            style={{
              textShadow: '0 0 20px rgba(255, 255, 255, 0.3), 0 2px 4px rgba(0, 0, 0, 0.9)',
              clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px)',
            }}
          >
            <span className="text-white group-hover:text-gray-200 transition-colors">
              WHISTLE
            </span>
          </button>
          
          {/* How It Works Button */}
          <button
            onClick={() => setShowHowItWorks(true)}
            className="group relative text-xs font-semibold tracking-wider uppercase px-4 py-2 backdrop-blur-sm bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-300"
            style={{
              clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
            }}
          >
            <span className="text-gray-400 group-hover:text-white transition-colors">
              How It Works
            </span>
          </button>
        </div>
        
        <div className="flex items-center gap-3 text-sm backdrop-blur-sm bg-black/20 px-4 py-2 rounded border border-white/5">
          <span className="text-gray-400">{rpcSource}</span>
          <span className="text-gray-600">~</span>
          <span className={backendStatus === 'online' ? 'text-white' : 'text-gray-400'}>
            {backendStatus === 'checking' ? 'Checking...' : 
             backendStatus === 'online' ? 'Active' : 'Syncing'}
          </span>
        </div>
      </header>

      {/* Main content - 5 column layout */}
      <div className="relative z-10 flex-1 px-12 flex flex-col pb-16">
        {/* Top section - panels and core */}
        <div className="max-w-[1800px] mx-auto flex items-start justify-center gap-8 mb-8 pt-8">
          
          {/* FAR LEFT COLUMN - User Info */}
          <div className="w-[240px] space-y-6 flex-shrink-0">
            <RpcEndpointPanel />
            <ApiMethodsPanel />
          </div>

          {/* LEFT COLUMN - User Actions */}
          <div className="w-[280px] space-y-8 flex-shrink-0">
            <QueryInterfacePanel />
            <NetworkStatsPanel />
          </div>

          {/* CENTER - Core (Wallet + Credits) */}
          <div className="flex-shrink-0 -mt-4">
            <CentralCore />
          </div>

          {/* RIGHT COLUMN - Provider Actions */}
          <div className="w-[280px] space-y-8 flex-shrink-0">
            <StakingPanel />
            <ProviderEarningsPanel />
          </div>

          {/* FAR RIGHT COLUMN - Provider Info */}
          <div className="w-[240px] space-y-6 flex-shrink-0">
            <RpcProvidersPanel />
            <ProviderRegistrationPanel />
          </div>

        </div>

        {/* Bottom section - Recent Activity */}
        <div className="max-w-[1800px] mx-auto w-full flex items-center justify-center mt-8">
          <RecentActivityPanel />
        </div>
      </div>

      {/* How It Works Modal */}
      <HowItWorksModal 
        isOpen={showHowItWorks} 
        onClose={() => setShowHowItWorks(false)} 
      />

      {/* Provider Contact Modal */}
      <ProviderContactModal 
        isOpen={showProviderContact} 
        onClose={() => setShowProviderContact(false)} 
      />
      </main>
  );
}
