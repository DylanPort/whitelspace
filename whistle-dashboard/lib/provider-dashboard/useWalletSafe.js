'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

/**
 * Safe wrapper around useWallet that handles SSR and missing context
 * Returns default values when wallet context isn't available
 */
export function useWalletSafe() {
  const [mounted, setMounted] = useState(false)
  
  // Try to get wallet context - this will throw during SSR
  let walletContext = null
  try {
    walletContext = useWallet()
  } catch (e) {
    // Context not available yet
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  // Return safe defaults if not mounted or context unavailable
  if (!mounted || !walletContext) {
    return {
      publicKey: null,
      connected: false,
      connecting: false,
      disconnecting: false,
      wallet: null,
      wallets: [],
      select: () => {},
      connect: async () => {},
      disconnect: async () => {},
      sendTransaction: async () => { throw new Error('Wallet not connected') },
      signTransaction: undefined,
      signAllTransactions: undefined,
      signMessage: undefined,
    }
  }

  return walletContext
}

