'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useApiHealth } from '../lib/hooks'

export function Header() {
  const { publicKey } = useWallet()
  const { healthy, loading } = useApiHealth()

  return (
    <header className="border-b border-gray-800 bg-whistle-dark/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold">
              <span className="text-whistle-accent">WHISTLE</span>
            </div>
            <span className="text-gray-500 text-sm font-medium">Provider Dashboard</span>
          </div>

          {/* Status + Wallet */}
          <div className="flex items-center gap-4">
            {/* API Status */}
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                loading ? 'bg-gray-500' :
                healthy ? 'status-healthy' : 'status-unhealthy'
              }`} />
              <span className="text-gray-400">
                {loading ? 'Checking...' : healthy ? 'API Online' : 'API Offline'}
              </span>
            </div>

            {/* Wallet */}
            <WalletMultiButton />
          </div>
        </div>
      </div>
    </header>
  )
}

