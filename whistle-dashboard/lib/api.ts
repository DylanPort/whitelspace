/**
 * WHISTLE Backend API Client
 * Connects to our Netcup server running the provider API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface ProviderStats {
  provider_address: string;
  total_queries: number;
  total_earned: number;
  uptime_percentage: number;
  avg_response_time: number;
  last_heartbeat: string;
}

export interface QueryLog {
  endpoint: string;
  method: string;
  response_time: number;
  status: string;
  created_at: string;
}

export interface TokenData {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  supply: string;
  holders: number;
  price: number | null;
  marketCap: number | null;
  image: string | null;
}

class WhistleAPI {
  public baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch(`${this.baseUrl}/api/health`, { 
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      if (!res.ok) throw new Error('API health check failed');
      return res.json();
    } catch (err) {
      console.warn('Backend API unavailable:', err);
      return { status: 'unavailable', timestamp: new Date().toISOString() };
    }
  }

  async getProviderStats(): Promise<ProviderStats[]> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch(`${this.baseUrl}/providers/stats`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      if (!res.ok) throw new Error('Failed to fetch provider stats');
      const data = await res.json();
      return data.providers || [];
    } catch (err) {
      console.warn('Failed to fetch provider stats:', err);
      return []; // Return empty array instead of throwing
    }
  }

  async getToken(address: string): Promise<TokenData> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch(`${this.baseUrl}/tokens/${address}`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      if (!res.ok) throw new Error('Failed to fetch token data');
      const data = await res.json();
      return data.token;
    } catch (err) {
      console.warn('Failed to fetch token data:', err);
      throw err; // Still throw for token details since it's required
    }
  }

  async searchTokens(query: string): Promise<TokenData[]> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      if (!res.ok) throw new Error('Failed to search tokens');
      const data = await res.json();
      return data.results || [];
    } catch (err) {
      console.warn('Failed to search tokens:', err);
      return []; // Return empty array for graceful degradation
    }
  }

  async getQueryLogs(limit = 100): Promise<QueryLog[]> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch(`${this.baseUrl}/queries/logs?limit=${limit}`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      if (!res.ok) throw new Error('Failed to fetch query logs');
      const data = await res.json();
      return data.logs || [];
    } catch (err) {
      console.warn('Failed to fetch query logs:', err);
      return []; // Return empty array instead of throwing
    }
  }

  // RPC proxy - send queries through our WHISTLE network
  async rpcQuery(method: string, params: any[]): Promise<any> {
    const res = await fetch(`${this.baseUrl}/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
    });

    if (!res.ok) throw new Error('RPC query failed');
    const data = await res.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'RPC error');
    }

    return data.result;
  }
}

export const api = new WhistleAPI(API_BASE_URL);

