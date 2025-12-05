'use client';

import { useEffect, useState, useCallback } from 'react';
import PanelFrame from './PanelFrame';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { fetchStakerCount, connection, WHISTLE_PROGRAM_ID } from '@/lib/contract';
import { createClient } from '@supabase/supabase-js';

// Supabase client for historical data
const SUPABASE_URL = 'https://avhmgbkwfwlatykotxwv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2aG1nYmt3ZndsYXR5a290eHd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMjMxOTksImV4cCI6MjA3Njc5OTE5OX0.s8DxqkwH-ZJtJdr1ve1HRGTw-038KEfYf8rlowYKtlE';

let supabase: any = null;
if (typeof window !== 'undefined') {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

interface AnalyticsData {
  totalVisitors: number;
  uniqueWallets: number;
  stakersCount: number;
  totalStakerWallets: number;
  todayVisitors: number;
  weeklyGrowth: number;
  totalNodes: number;
  totalRelays: number;
  totalClaims: number;
}

// Simple analytics storage keys
const ANALYTICS_KEY = 'whistle_analytics';
const WALLETS_KEY = 'whistle_connected_wallets';
const VISITORS_KEY = 'whistle_visitors';

function getStoredAnalytics(): AnalyticsData {
  if (typeof window === 'undefined') {
    return { totalVisitors: 0, uniqueWallets: 0, stakersCount: 0, todayVisitors: 0, weeklyGrowth: 0 };
  }
  
  try {
    const stored = localStorage.getItem(ANALYTICS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading analytics:', e);
  }
  
  return { totalVisitors: 0, uniqueWallets: 0, stakersCount: 0, todayVisitors: 0, weeklyGrowth: 0 };
}

function trackVisit() {
  if (typeof window === 'undefined') return;
  
  try {
    const today = new Date().toDateString();
    const visitorsData = JSON.parse(localStorage.getItem(VISITORS_KEY) || '{}');
    
    // Track unique session
    const sessionId = sessionStorage.getItem('whistle_session');
    if (!sessionId) {
      sessionStorage.setItem('whistle_session', Date.now().toString());
      
      // Increment visitor count
      visitorsData.total = (visitorsData.total || 0) + 1;
      
      // Track daily visitors
      if (!visitorsData.daily) visitorsData.daily = {};
      visitorsData.daily[today] = (visitorsData.daily[today] || 0) + 1;
      
      // Keep last 30 days
      const days = Object.keys(visitorsData.daily).sort();
      if (days.length > 30) {
        delete visitorsData.daily[days[0]];
      }
      
      localStorage.setItem(VISITORS_KEY, JSON.stringify(visitorsData));
    }
    
    return visitorsData;
  } catch (e) {
    console.error('Error tracking visit:', e);
    return { total: 0, daily: {} };
  }
}

function trackWallet(walletAddress: string) {
  if (typeof window === 'undefined' || !walletAddress) return;
  
  try {
    const walletsData = JSON.parse(localStorage.getItem(WALLETS_KEY) || '{"wallets":[],"count":0}');
    
    if (!walletsData.wallets.includes(walletAddress)) {
      walletsData.wallets.push(walletAddress);
      walletsData.count = walletsData.wallets.length;
      
      // Keep only last 1000 wallets to save space
      if (walletsData.wallets.length > 1000) {
        walletsData.wallets = walletsData.wallets.slice(-1000);
      }
      
      localStorage.setItem(WALLETS_KEY, JSON.stringify(walletsData));
    }
    
    return walletsData.count;
  } catch (e) {
    console.error('Error tracking wallet:', e);
    return 0;
  }
}

function calculateGrowth(visitorsData: any): number {
  if (!visitorsData?.daily) return 0;
  
  const today = new Date();
  const lastWeekStart = new Date(today);
  lastWeekStart.setDate(lastWeekStart.getDate() - 14);
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  
  let lastWeekTotal = 0;
  let thisWeekTotal = 0;
  
  Object.entries(visitorsData.daily).forEach(([dateStr, count]) => {
    const date = new Date(dateStr);
    if (date >= thisWeekStart) {
      thisWeekTotal += count as number;
    } else if (date >= lastWeekStart && date < thisWeekStart) {
      lastWeekTotal += count as number;
    }
  });
  
  if (lastWeekTotal === 0) return thisWeekTotal > 0 ? 100 : 0;
  return Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100);
}

export default function LiveAnalyticsPanel() {
  const { publicKey, connected } = useWallet();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalVisitors: 0,
    uniqueWallets: 0,
    stakersCount: 0,
    totalStakerWallets: 0,
    todayVisitors: 0,
    weeklyGrowth: 0,
    totalNodes: 0,
    totalRelays: 0,
    totalClaims: 0,
  });
  const [loading, setLoading] = useState(true);

  // Track visit on mount (for new visitors)
  useEffect(() => {
    const visitorsData = trackVisit();
    const walletsData = JSON.parse(localStorage.getItem(WALLETS_KEY) || '{"count":0}');
    const today = new Date().toDateString();
    
    setAnalytics(prev => ({
      ...prev,
      totalVisitors: visitorsData?.total || 0,
      todayVisitors: visitorsData?.daily?.[today] || 0,
      uniqueWallets: walletsData.count || 0,
      weeklyGrowth: calculateGrowth(visitorsData),
    }));
  }, []);

  // Track wallet connection
  useEffect(() => {
    if (connected && publicKey) {
      const walletCount = trackWallet(publicKey.toBase58());
      setAnalytics(prev => ({
        ...prev,
        uniqueWallets: walletCount || prev.uniqueWallets,
      }));
    }
  }, [connected, publicKey]);

  // Fetch REAL data from blockchain and Supabase
  useEffect(() => {
    async function loadRealData() {
      try {
        // 1. Get staker count from blockchain (REAL)
        const stakerCount = await fetchStakerCount();
        
        // 2. Get unique staker wallet addresses from blockchain
        let uniqueStakerWallets = 0;
        try {
          const accounts = await connection.getProgramAccounts(WHISTLE_PROGRAM_ID, {
            filters: [{ dataSize: 82 }] // StakerAccount size
          });
          const uniqueWallets = new Set(
            accounts.map(acc => acc.account.data.slice(0, 32).toString('hex'))
          );
          uniqueStakerWallets = uniqueWallets.size;
        } catch (e) {
          console.error('Error fetching unique wallets:', e);
        }

        // 3. Fetch historical node data from Supabase
        let totalNodes = 0;
        let totalRelays = 0;
        let totalClaims = 0;
        
        if (supabase) {
          try {
            // Get total unique nodes
            const { count: nodesCount } = await supabase
              .from('node_performance')
              .select('*', { count: 'exact', head: true });
            totalNodes = nodesCount || 0;
            
            // Get total relays
            const { data: relayData } = await supabase
              .from('node_performance')
              .select('total_relays')
              .limit(1000);
            if (relayData) {
              totalRelays = relayData.reduce((sum: number, r: any) => sum + (r.total_relays || 0), 0);
            }
            
            // Get total claims
            const { count: claimsCount } = await supabase
              .from('claim_history')
              .select('*', { count: 'exact', head: true });
            totalClaims = claimsCount || 0;
          } catch (e) {
            console.error('Supabase fetch error:', e);
          }
        }

        setAnalytics(prev => ({
          ...prev,
          stakersCount: stakerCount,
          totalStakerWallets: uniqueStakerWallets || stakerCount,
          totalNodes,
          totalRelays,
          totalClaims,
        }));
      } catch (err) {
        console.error('Error loading real data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadRealData();
    const interval = setInterval(loadRealData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const stats = [
    {
      label: 'UNIQUE STAKERS',
      value: analytics.stakersCount,
      color: 'text-yellow-400',
      isRealtime: true,
      source: 'blockchain',
    },
    {
      label: 'TOTAL NODES',
      value: analytics.totalNodes,
      color: 'text-emerald-400',
      isRealtime: true,
      source: 'supabase',
    },
    {
      label: 'TOTAL RELAYS',
      value: analytics.totalRelays,
      color: 'text-blue-400',
      source: 'supabase',
    },
    {
      label: 'REWARD CLAIMS',
      value: analytics.totalClaims,
      color: 'text-purple-400',
      source: 'supabase',
    },
  ];

  return (
    <PanelFrame
      cornerType="silver"
      className="min-h-[140px]"
      motionProps={{
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5 }
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-semibold tracking-[0.15em]">
          LIVE ANALYTICS
        </h3>
        <div className="flex items-center gap-1.5">
          <motion.div
            className="w-2 h-2 rounded-full bg-emerald-400"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-[8px] text-emerald-400">LIVE</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="text-center p-2 bg-black/20 rounded border border-white/5 relative group"
          >
            <div className="text-[7px] text-gray-500 tracking-wider mb-1">
              {stat.label}
              {stat.isRealtime && (
                <motion.span 
                  className="ml-1 text-emerald-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >●</motion.span>
              )}
            </div>
            <div className={`text-lg font-bold ${stat.color}`}>
              {loading ? (
                <span className="text-gray-500 animate-pulse">...</span>
              ) : (
                stat.value.toLocaleString()
              )}
            </div>
            {/* Source tooltip */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className={`text-[6px] px-1 py-0.5 rounded ${
                stat.source === 'blockchain' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
              }`}>
                {stat.source === 'blockchain' ? '⛓ ON-CHAIN' : '📊 DATABASE'}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Session visitors */}
      <div className="mt-3 pt-2 border-t border-white/5">
        <div className="flex items-center justify-between text-[8px]">
          <span className="text-gray-500">Session Visitors (local)</span>
          <span className="text-white font-bold">{analytics.totalVisitors.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-[8px] mt-1">
          <span className="text-gray-500">Wallets Connected (local)</span>
          <span className="text-emerald-400 font-bold">{analytics.uniqueWallets.toLocaleString()}</span>
        </div>
      </div>

      {/* Data source note */}
      <div className="mt-2 pt-2 border-t border-white/5 text-center">
        <span className="text-[7px] text-gray-600">
          ⛓ = Solana blockchain • 📊 = Supabase DB
        </span>
      </div>
    </PanelFrame>
  );
}

