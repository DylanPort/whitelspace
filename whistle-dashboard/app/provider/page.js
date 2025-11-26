'use client'

import '../provider-globals.css'
import { HeaderRpc } from '@/components/provider-dashboard/HeaderRpc'
import { StatsGrid } from '@/components/provider-dashboard/StatsGrid'
import { MetricsChart } from '@/components/provider-dashboard/MetricsChart'
import { ValidatorInfo } from '@/components/provider-dashboard/ValidatorInfo'
import { BrowserCacheNode } from '@/components/provider-dashboard/BrowserCacheNode'
import { ServerCacheSetup } from '@/components/provider-dashboard/ServerCacheSetup'
import { CacheNetworkStats } from '@/components/provider-dashboard/CacheNetworkStats'
import { CacheableMethods } from '@/components/provider-dashboard/CacheableMethods'
import { MyRewards } from '@/components/provider-dashboard/MyRewards'
import { Leaderboard } from '@/components/provider-dashboard/Leaderboard'
import { OnChainProvider } from '@/components/provider-dashboard/OnChainProvider'
import { OnChainLeaderboard } from '@/components/provider-dashboard/OnChainLeaderboard'
import { ProviderOnboarding } from '@/components/provider-dashboard/ProviderOnboarding'
import { CreditAccount } from '@/components/provider-dashboard/CreditAccount'
import { useLiveMetrics, useMetricsHistory } from '@/lib/provider-dashboard/hooks-rpc'
import { RefreshCw } from 'lucide-react'

export default function Dashboard() {
  const { metrics, loading: metricsLoading, error: metricsError, refetch } = useLiveMetrics(5000)
  const { history, loading: historyLoading } = useMetricsHistory()

  return (
    <div className="min-h-screen bg-whistle-darker">
      {/* Video Background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute w-full h-full object-cover opacity-30"
        >
          <source src="/bg-video.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/60" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        <HeaderRpc />

        <main className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
          
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white uppercase tracking-wider mb-1">
                <span className="text-whistle-accent">Provider</span> Dashboard
              </h1>
              <p className="text-gray-500 font-mono text-sm">
                // Real-time Solana mainnet metrics via Whistlenet RPC
              </p>
            </div>
            <button
              onClick={refetch}
              disabled={metricsLoading}
              className="btn-secondary"
            >
              <RefreshCw size={16} className={metricsLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Error banner */}
          {metricsError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-sm">
              <span className="text-red-500">ERROR:</span> {metricsError}
            </div>
          )}

          {/* ================================================================== */}
          {/* MAIN GRID LAYOUT - Matching Whistlenet Dashboard */}
          {/* ================================================================== */}
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT COLUMN - 3 cols */}
            <div className="lg:col-span-3 space-y-6">
              {/* RPC Credits Card */}
              <CreditAccount />
              
              {/* Network Stats Card */}
              <div className="card p-6">
                <div className="card-inner">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="text-whistle-accent">⚡</span>
                    Network Stats
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm uppercase tracking-wider">Latency</span>
                      <span className="text-whistle-accent font-mono font-bold">
                        {metrics?.rpc?.latency || '—'}ms
                        <span className="inline-block w-2 h-2 bg-whistle-accent rounded-full ml-2 animate-pulse" />
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm uppercase tracking-wider">Uptime</span>
                      <span className="text-whistle-accent font-mono font-bold">100%</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm uppercase tracking-wider">Requests</span>
                      <span className="text-white font-mono font-bold">
                        {metrics?.rpc?.totalRequests?.toLocaleString() || '0'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm uppercase tracking-wider">Rate Limit</span>
                      <span className="text-white font-mono">100/min</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm uppercase tracking-wider">Status</span>
                      <span className="status-online font-mono font-bold text-sm">ONLINE</span>
                    </div>
                    
                    <div className="pt-2">
                      <span className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Response Time</span>
                      <div className="response-bars">
                        {[...Array(20)].map((_, i) => (
                          <div 
                            key={i} 
                            className="response-bar" 
                            style={{ height: `${Math.random() * 30 + 10}px` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>

            {/* CENTER COLUMN - 6 cols */}
            <div className="lg:col-span-6 space-y-6">
              {/* Provider Onboarding - Main Focus */}
              <ProviderOnboarding />
              
              {/* Stats Grid */}
              <StatsGrid metrics={metrics} loading={metricsLoading} />
              
              {/* Performance Chart */}
              <div className="card p-6">
                <div className="card-inner">
                  <MetricsChart history={history} loading={historyLoading} />
                </div>
              </div>
              
              {/* Epoch Progress */}
              <div className="card p-6">
                <div className="card-inner">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">
                    <span className="text-whistle-accent">//</span> Epoch Progress
                  </h3>
                  {metrics?.chain ? (
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 uppercase tracking-wider">Epoch {metrics.chain.epoch}</span>
                        <span className="text-whistle-accent font-mono font-bold">{metrics.chain.epochProgress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-bar-fill"
                          style={{ width: `${metrics.chain.epochProgress}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 uppercase text-xs tracking-wider">Slot Index</p>
                          <p className="font-mono text-white">{metrics.chain.slotIndex?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 uppercase text-xs tracking-wider">Slots in Epoch</p>
                          <p className="font-mono text-white">{metrics.chain.slotsInEpoch?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 uppercase text-xs tracking-wider">Remaining</p>
                          <p className="font-mono text-white">
                            {((metrics.chain.slotsInEpoch || 0) - (metrics.chain.slotIndex || 0)).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 bg-whistle-dark animate-pulse" />
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - 3 cols */}
            <div className="lg:col-span-3 space-y-6">
              {/* Validator Info */}
              <ValidatorInfo metrics={metrics} loading={metricsLoading} />
              
              {/* Browser Cache Node */}
              <BrowserCacheNode />
              
              {/* Cacheable Methods */}
              <CacheableMethods />
            </div>
          </div>

          {/* ================================================================== */}
          {/* BOTTOM SECTION - Full Width Cards */}
          {/* ================================================================== */}
          
          <div className="mt-8 space-y-6">
            {/* Server Cache Setup */}
            <ServerCacheSetup />
            
            {/* Rewards & Provider Status Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MyRewards />
              <OnChainProvider />
            </div>
            
            {/* Leaderboards Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Leaderboard />
              <OnChainLeaderboard />
            </div>
          </div>

          {/* Cache Network - Centered at bottom */}
          <div className="mt-8 flex justify-center">
            <div className="w-full max-w-2xl">
              <CacheNetworkStats />
            </div>
          </div>

        </main>

        {/* Footer - Centered at bottom */}
        <footer className="py-8">
          <p className="text-center text-gray-500 text-sm font-mono">
            WHISTLE Provider Dashboard • Powered by{' '}
            <span className="text-whistle-accent">whistle.ninja</span>
          </p>
        </footer>
      </div>
    </div>
  )
}
