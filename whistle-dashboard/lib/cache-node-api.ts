/**
 * Cache Node API Integration
 * Connects frontend to cache node metrics and smart contract data
 */

import { Connection, PublicKey } from '@solana/web3.js';

const WHISTLE_PROGRAM_ID = 'whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr';
const COORDINATOR_API = process.env.NEXT_PUBLIC_COORDINATOR_URL || 'https://whistle-backend.onrender.com';
const QUERY_COST_SOL = 0.00001; // Cost per RPC query (10,000 lamports)

// Payment split from smart contract
export const PAYMENT_SPLIT = {
  PROVIDER: 70,  // 70% to cache node operator
  BONUS: 20,     // 20% to top performers
  TREASURY: 5,   // 5% to treasury
  STAKERS: 5,    // 5% to stakers
};

export interface CacheNodeStats {
  nodeId: string;
  status: 'online' | 'offline' | 'syncing';
  location: string;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  uptime: number;
  earnings: {
    today: number;
    week: number;
    month: number;
    total: number;
    pending: number;
  };
  performance: {
    avgResponseTime: number;
    successRate: number;
    cpu: number;
    memory: number;
    bandwidth: number;
  };
}

export interface NetworkStats {
  totalNodes: number;
  activeNodes: number;
  totalCacheHits: number;
  avgResponseTime: number;
  totalQueriesServed: number;
  totalEarningsDistributed: number;
  topPerformers: Array<{
    nodeId: string;
    location: string;
    cacheHits: number;
    earnings: number;
  }>;
}

export interface EarningsBreakdown {
  queriesServed: number;
  queryCost: number;
  totalRevenue: number;
  providerShare: number;  // 70%
  bonusPool: number;       // 20%
  treasuryShare: number;   // 5%
  stakersShare: number;    // 5%
}

/**
 * Calculate earnings breakdown for cache hits
 */
export function calculateEarnings(cacheHits: number): EarningsBreakdown {
  const totalRevenue = cacheHits * QUERY_COST_SOL;
  
  return {
    queriesServed: cacheHits,
    queryCost: QUERY_COST_SOL,
    totalRevenue,
    providerShare: (totalRevenue * PAYMENT_SPLIT.PROVIDER) / 100,
    bonusPool: (totalRevenue * PAYMENT_SPLIT.BONUS) / 100,
    treasuryShare: (totalRevenue * PAYMENT_SPLIT.TREASURY) / 100,
    stakersShare: (totalRevenue * PAYMENT_SPLIT.STAKERS) / 100,
  };
}

/**
 * Get cache node stats from coordinator
 */
export async function getCacheNodeStats(walletAddress: string): Promise<CacheNodeStats[]> {
  try {
    const response = await fetch(`${COORDINATOR_API}/api/nodes/${walletAddress}`);
    if (!response.ok) {
      throw new Error('Failed to fetch node stats');
    }
    
    const data = await response.json();
    
    // Map coordinator data to our format
    return data.nodes.map((node: any) => ({
      nodeId: node.nodeId,
      status: node.isActive ? 'online' : 'offline',
      location: node.location || 'Unknown',
      cacheHits: node.cacheHits || 0,
      cacheMisses: node.cacheMisses || 0,
      hitRate: node.hitRate || 0,
      uptime: node.uptime || 0,
      earnings: {
        today: node.earningsToday || 0,
        week: node.earningsWeek || 0,
        month: node.earningsMonth || 0,
        total: node.totalEarnings || 0,
        pending: node.pendingEarnings || 0,
      },
      performance: {
        avgResponseTime: node.avgResponseTime || 0,
        successRate: node.successRate || 100,
        cpu: node.cpuUsage || 0,
        memory: node.memoryUsage || 0,
        bandwidth: node.bandwidthUsage || 0,
      },
    }));
  } catch (error) {
    console.error('Error fetching cache node stats:', error);
    return [];
  }
}

/**
 * Get network-wide statistics
 */
export async function getNetworkStats(): Promise<NetworkStats> {
  try {
    const response = await fetch(`${COORDINATOR_API}/api/network/stats`);
    if (!response.ok) {
      throw new Error('Failed to fetch network stats');
    }
    
    const data = await response.json();
    
    return {
      totalNodes: data.totalNodes || 0,
      activeNodes: data.activeNodes || 0,
      totalCacheHits: data.totalCacheHits || 0,
      avgResponseTime: data.avgResponseTime || 0,
      totalQueriesServed: data.totalQueriesServed || 0,
      totalEarningsDistributed: data.totalEarningsDistributed || 0,
      topPerformers: data.topPerformers || [],
    };
  } catch (error) {
    console.error('Error fetching network stats:', error);
    return {
      totalNodes: 0,
      activeNodes: 0,
      totalCacheHits: 0,
      avgResponseTime: 0,
      totalQueriesServed: 0,
      totalEarningsDistributed: 0,
      topPerformers: [],
    };
  }
}

/**
 * Get earnings history from smart contract
 */
export async function getEarningsHistory(
  walletAddress: string,
  connection: Connection
): Promise<Array<{ date: string; amount: number; cacheHits: number }>> {
  try {
    // In production, this would query the smart contract for actual earnings
    // For now, return mock data
    const mockHistory = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Simulate varying cache hits
      const cacheHits = Math.floor(Math.random() * 10000) + 5000;
      const earnings = calculateEarnings(cacheHits);
      
      mockHistory.push({
        date: date.toISOString().split('T')[0],
        amount: earnings.providerShare,
        cacheHits,
      });
    }
    
    return mockHistory;
  } catch (error) {
    console.error('Error fetching earnings history:', error);
    return [];
  }
}

/**
 * Claim pending earnings from smart contract
 */
export async function claimEarnings(
  walletAddress: string,
  connection: Connection
): Promise<{ success: boolean; amount: number; signature?: string }> {
  try {
    // In production, this would create and send a transaction to claim earnings
    // For now, simulate the claim
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock successful claim
    return {
      success: true,
      amount: Math.random() * 10, // Random amount between 0-10 SOL
      signature: 'mock_' + Math.random().toString(36).substring(7),
    };
  } catch (error) {
    console.error('Error claiming earnings:', error);
    return {
      success: false,
      amount: 0,
    };
  }
}

/**
 * Register a new cache node
 */
export async function registerCacheNode(
  walletAddress: string,
  endpoint: string,
  location: string
): Promise<{ success: boolean; nodeId?: string; error?: string }> {
  try {
    const response = await fetch(`${COORDINATOR_API}/api/nodes/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        endpoint,
        location,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      nodeId: data.nodeId,
    };
  } catch (error: any) {
    console.error('Error registering cache node:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get real-time metrics via WebSocket
 */
export function subscribeToMetrics(
  nodeId: string,
  onUpdate: (metrics: any) => void
): () => void {
  const ws = new WebSocket(`${COORDINATOR_API.replace('https', 'wss')}/ws`);
  
  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'SUBSCRIBE',
      nodeId,
    }));
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'METRICS_UPDATE') {
        onUpdate(data.metrics);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  // Return cleanup function
  return () => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  };
}

export default {
  calculateEarnings,
  getCacheNodeStats,
  getNetworkStats,
  getEarningsHistory,
  claimEarnings,
  registerCacheNode,
  subscribeToMetrics,
};
