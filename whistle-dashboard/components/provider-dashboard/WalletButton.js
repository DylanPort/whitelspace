'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import wallet button with no SSR to avoid hydration issues
const WalletMultiButtonDynamic = dynamic(
  async () => {
    const { WalletMultiButton } = await import('@solana/wallet-adapter-react-ui')
    return WalletMultiButton
  },
  { 
    ssr: false,
    loading: () => (
      <button className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 text-sm cursor-wait">
        Loading...
      </button>
    )
  }
)

export function WalletButton() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Show placeholder during SSR and initial mount
  if (!mounted) {
    return (
      <button className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 text-sm">
        Select Wallet
      </button>
    )
  }

  return <WalletMultiButtonDynamic />
}

// Also export a client-only wrapper for other wallet components
export function ClientOnly({ children, fallback = null }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return fallback
  }

  return children
}
