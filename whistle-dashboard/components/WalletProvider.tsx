'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { MobileWalletAdapter, isMobileDevice, getMobileWalletInfo } from '@/lib/mobile-wallet-bridge';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const [hasMobileWallet, setHasMobileWallet] = useState(false);

  useEffect(() => {
    // Check if user has a mobile wallet from main.html
    if (typeof window !== 'undefined') {
      const isMobile = isMobileDevice();
      const mobileWallet = getMobileWalletInfo();
      setHasMobileWallet(isMobile && mobileWallet !== null && mobileWallet.hasWallet);
    }
  }, []);

  const wallets = useMemo(
    () => {
      const baseWallets = [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
      ];

      // Add mobile wallet adapter if detected
      if (hasMobileWallet) {
        const mobileAdapter = new MobileWalletAdapter() as any;
        mobileAdapter.name = 'Ghost Wallet';
        mobileAdapter.icon = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI4IiBmaWxsPSIjMTBiOTgxIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPjxHPC90ZXh0Pgo8L3N2Zz4=';
        mobileAdapter.url = 'https://whistle.ninja';
        mobileAdapter.readyState = 'Installed';
        return [mobileAdapter, ...baseWallets];
      }

      return baseWallets;
    },
    [hasMobileWallet]
  );

  // Clean up localStorage on mount to prevent quota errors
  useEffect(() => {
    try {
      // Test if we can write to localStorage
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
    } catch (e) {
      // If we can't write, clear wallet-related entries
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, clearing old data...');
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            // Remove all keys except essentials
            if (key && !key.startsWith('_next')) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => {
            try {
              localStorage.removeItem(key);
            } catch (removeErr) {
              console.warn(`Failed to remove ${key}:`, removeErr);
            }
          });
          console.log(`Cleared ${keysToRemove.length} localStorage entries`);
        } catch (cleanupErr) {
          console.error('Failed to cleanup localStorage:', cleanupErr);
        }
      }
    }
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider 
        wallets={wallets} 
        autoConnect={false}
        onError={(error) => {
          // Suppress localStorage quota errors
          if (error.message?.includes('quota') || error.message?.includes('QuotaExceeded')) {
            console.warn('Wallet localStorage quota exceeded - connection will work without persistence');
          } else {
            console.warn('Wallet error:', error);
          }
        }}
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

