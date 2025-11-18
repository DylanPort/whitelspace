/**
 * Token Service
 * Handles all token-related API calls
 */

import { api } from '../api';

export interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  supply: string;
  holders: number;
  price: number | null;
  marketCap: number | null;
  liquidity: number | null;
  volume24h: number | null;
  priceChange24h: number | null;
  image: string | null;
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  createdAt: string;
}

export interface TokenSearchResult {
  address: string;
  name: string;
  symbol: string;
  image: string | null;
  price: number | null;
  marketCap: number | null;
}

export const tokenService = {
  /**
   * Get latest tokens
   */
  async getLatestTokens(limit: number = 50): Promise<Token[]> {
    try {
      const response = await fetch(`${api.baseUrl}/tokens/latest?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch latest tokens');
      const data = await response.json();
      return data.tokens || [];
    } catch (error) {
      console.error('Error fetching latest tokens:', error);
      throw error;
    }
  },

  /**
   * Search tokens by name or symbol
   */
  async searchTokens(query: string): Promise<TokenSearchResult[]> {
    try {
      if (!query || query.length < 2) return [];
      const response = await fetch(`${api.baseUrl}/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Failed to search tokens');
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error searching tokens:', error);
      throw error;
    }
  },

  /**
   * Get token details by address
   */
  async getTokenDetails(address: string): Promise<Token> {
    try {
      const response = await fetch(`${api.baseUrl}/tokens/${address}`);
      if (!response.ok) throw new Error('Failed to fetch token details');
      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('Error fetching token details:', error);
      throw error;
    }
  },

  /**
   * Get trending tokens
   */
  async getTrendingTokens(limit: number = 10): Promise<Token[]> {
    try {
      const response = await fetch(`${api.baseUrl}/tokens/trending?limit=${limit}`);
      if (!response.ok) {
        // Fallback to latest if trending not implemented
        return this.getLatestTokens(limit);
      }
      const data = await response.json();
      return data.tokens || [];
    } catch (error) {
      console.error('Error fetching trending tokens:', error);
      // Fallback to latest
      return this.getLatestTokens(limit);
    }
  },

  /**
   * Get token price history
   */
  async getTokenPriceHistory(
    address: string,
    timeframe: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<{ timestamp: number; price: number }[]> {
    try {
      const response = await fetch(
        `${api.baseUrl}/tokens/${address}/history?timeframe=${timeframe}`
      );
      if (!response.ok) {
        // Return empty array if not implemented
        return [];
      }
      const data = await response.json();
      return data.history || [];
    } catch (error) {
      console.error('Error fetching token price history:', error);
      return [];
    }
  },
};

