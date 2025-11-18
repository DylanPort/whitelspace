/**
 * Transaction Service
 * Handles all transaction-related API calls
 */

export interface Transaction {
  signature: string;
  slot: number;
  blockTime: number;
  fromAddress: string;
  toAddress: string;
  amount: number;
  fee: number;
  programId: string;
  status: 'success' | 'failed';
  logs?: string[];
  memo?: string;
}

export interface TransactionDetails extends Transaction {
  instructions: Array<{
    programId: string;
    accounts: string[];
    data: string;
  }>;
  preBalances: number[];
  postBalances: number[];
  rewards?: Array<{
    pubkey: string;
    lamports: number;
    postBalance: number;
    rewardType: string;
  }>;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://152.53.130.177:8080';

export const transactionService = {
  /**
   * Get transactions for a wallet
   */
  async getWalletTransactions(
    wallet: string,
    options?: {
      from?: number;
      to?: number;
      limit?: number;
      offset?: number;
      program?: string;
      status?: 'success' | 'failed';
    }
  ): Promise<{ transactions: Transaction[]; total: number }> {
    try {
      const params = new URLSearchParams({ wallet });
      if (options?.from) params.append('from', options.from.toString());
      if (options?.to) params.append('to', options.to.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.offset) params.append('offset', options.offset.toString());
      if (options?.program) params.append('program', options.program);
      if (options?.status) params.append('status', options.status);

      const response = await fetch(`${BASE_URL}/api/transactions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');

      const data = await response.json();
      return {
        transactions: data.data || [],
        total: data.count || 0,
      };
    } catch (error) {
      console.error('Error fetching wallet transactions:', error);
      throw error;
    }
  },

  /**
   * Get transaction details by signature
   */
  async getTransactionDetails(signature: string): Promise<TransactionDetails> {
    try {
      const response = await fetch(`${BASE_URL}/api/transaction/${signature}`);
      if (!response.ok) throw new Error('Failed to fetch transaction details');

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      throw error;
    }
  },

  /**
   * Search transactions by signature
   */
  async searchTransactions(query: string): Promise<Transaction[]> {
    try {
      if (!query || query.length < 10) return [];

      const response = await fetch(`${BASE_URL}/api/transactions/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        // If search endpoint doesn't exist, try getting by signature
        return [await this.getTransactionDetails(query)] as Transaction[];
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error searching transactions:', error);
      return [];
    }
  },

  /**
   * Get recent transactions (global)
   */
  async getRecentTransactions(limit: number = 20): Promise<Transaction[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/transactions/recent?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch recent transactions');

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      return [];
    }
  },
};

