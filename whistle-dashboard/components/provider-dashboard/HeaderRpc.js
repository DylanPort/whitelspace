'use client'

import { useRpcHealth } from '@/lib/provider-dashboard/hooks-rpc'
import { WalletButton } from './WalletButton'

export function HeaderRpc() {
  const { healthy, loading, latency } = useRpcHealth()

  return (
    <header className="border-b border-gray-800/50 bg-black/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold tracking-widest">
              <span className="text-white">W</span>
              <span className="text-white">H</span>
              <span className="text-white">I</span>
              <span className="text-white">S</span>
              <span className="text-white">T</span>
              <span className="text-white">L</span>
              <span className="text-white">E</span>
            </div>
            <div className="hidden sm:block h-6 w-px bg-gray-700" />
            <span className="hidden sm:block text-gray-500 text-sm font-mono uppercase tracking-wider">
              Provider Dashboard
            </span>
          </div>

          {/* Status + Wallet */}
          <div className="flex items-center gap-6">
            {/* RPC Status */}
            <div className="hidden md:flex items-center gap-3 text-sm font-mono">
              <div className={`w-2 h-2 ${
                loading ? 'bg-gray-500 animate-pulse' :
                healthy ? 'bg-whistle-accent shadow-[0_0_8px_#00cc00]' : 'bg-red-500'
              }`} />
              <span className="text-gray-400 uppercase tracking-wider text-xs">
                {loading ? 'Connecting...' : healthy ? (
                  <>
                    <span className="text-whistle-accent">Online</span>
                    {latency && <span className="text-gray-500 ml-2">{latency}ms</span>}
                  </>
                ) : (
                  <span className="text-red-400">Offline</span>
                )}
              </span>
            </div>

            {/* Wallet */}
            <WalletButton />
          </div>
        </div>
      </div>
    </header>
  )
}
