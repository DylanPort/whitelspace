/**
 * Wallet Service
 * Handles wallet-related operations and data fetching
 */

import { PublicKey } from '@solana/web3.js';

export interface TokenBalance {
  mint: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  name?: string;
  symbol?: string;
  image?: string;
  price?: number;
  value?: number;
}

export interface NFT {
  mint: string;
  name: string;
  symbol: string;
  image: string;
  description?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
  collection?: {
    name: string;
    family: string;
    verified: boolean;
  };
  externalUrl?: string;
}

export interface WalletOverview {
  address: string;
  solBalance: number;
  totalValue: number;
  tokenCount: number;
  nftCount: number;
  transactionCount: number;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://152.53.130.177:8080';

export const walletService = {
  /**
   * Get wallet overview
   */
  async getWalletOverview(address: string): Promise<WalletOverview> {
    try {
      const [balances, nfts, transactions] = await Promise.allSettled([
        this.getTokenBalances(address),
        this.getNFTs(address),
        fetch(`${BASE_URL}/api/transactions?wallet=${address}&limit=1`)
          .then((r) => r.json())
          .then((d) => d.count || 0),
      ]);

      const tokenBalances = balances.status === 'fulfilled' ? balances.value : [];
      const nftList = nfts.status === 'fulfilled' ? nfts.value : [];
      const txCount = transactions.status === 'fulfilled' ? transactions.value : 0;

      const solBalance = tokenBalances.find((t) => t.mint === 'So11111111111111111111111111111111111111112')?.uiAmount || 0;

      const totalValue = tokenBalances.reduce((sum, token) => sum + (token.value || 0), 0);

      return {
        address,
        solBalance,
        totalValue,
        tokenCount: tokenBalances.length,
        nftCount: nftList.length,
        transactionCount: txCount,
      };
    } catch (error) {
      console.error('Error fetching wallet overview:', error);
      return {
        address,
        solBalance: 0,
        totalValue: 0,
        tokenCount: 0,
        nftCount: 0,
        transactionCount: 0,
      };
    }
  },

  /**
   * Get token balances for wallet
   */
  async getTokenBalances(address: string): Promise<TokenBalance[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/balances?wallet=${address}`);
      if (!response.ok) throw new Error('Failed to fetch token balances');

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching token balances:', error);
      return [];
    }
  },

  /**
   * Get NFTs for wallet
   */
  async getNFTs(address: string): Promise<NFT[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/nfts?wallet=${address}`);
      if (!response.ok) throw new Error('Failed to fetch NFTs');

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching NFTs:', error);
      return [];
    }
  },

  /**
   * Validate Solana address
   */
  isValidAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Format address for display
   */
  formatAddress(address: string, chars: number = 4): string {
    if (!address) return '';
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  },

  /**
   * Format SOL amount
   */
  formatSOL(lamports: number): string {
    return (lamports / 1e9).toFixed(4);
  },

  /**
   * Format USD value
   */
  formatUSD(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  },
};

