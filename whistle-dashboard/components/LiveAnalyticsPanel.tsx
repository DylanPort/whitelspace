'use client';

import { useEffect, useState, useCallback } from 'react';
import PanelFrame from './PanelFrame';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { fetchStakerCount } from '@/lib/contract';

interface AnalyticsData {
  totalVisitors: number;
  uniqueWallets: number;
  stakersCount: number;
  todayVisitors: number;
  weeklyGrowth: number;
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
    todayVisitors: 0,
    weeklyGrowth: 0,
  });
  const [loading, setLoading] = useState(true);

  // Track visit on mount
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

  // Fetch real staker count from blockchain
  useEffect(() => {
    async function loadStakerCount() {
      try {
        const count = await fetchStakerCount();
        setAnalytics(prev => ({
          ...prev,
          stakersCount: count,
        }));
      } catch (err) {
        console.error('Error fetching staker count:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStakerCount();
    const interval = setInterval(loadStakerCount, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const stats = [
    {
      label: 'TOTAL VISITORS',
      value: analytics.totalVisitors,
      color: 'text-white',
    },
    {
      label: 'WALLETS CONNECTED',
      value: analytics.uniqueWallets,
      color: 'text-emerald-400',
    },
    {
      label: 'ON-CHAIN STAKERS',
      value: analytics.stakersCount,
      color: 'text-yellow-400',
      isRealtime: true,
    },
    {
      label: 'TODAY',
      value: analytics.todayVisitors,
      color: 'text-blue-400',
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
            className="text-center p-2 bg-black/20 rounded border border-white/5"
          >
            <div className="text-[7px] text-gray-500 tracking-wider mb-1">
              {stat.label}
              {stat.isRealtime && (
                <span className="ml-1 text-emerald-400">●</span>
              )}
            </div>
            <div className={`text-lg font-bold ${stat.color}`}>
              {loading && stat.isRealtime ? (
                <span className="text-gray-500 animate-pulse">...</span>
              ) : (
                stat.value.toLocaleString()
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Growth Indicator */}
      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
        <span className="text-[8px] text-gray-500">Weekly Growth</span>
        <div className={`flex items-center gap-1 text-[10px] font-bold ${
          analytics.weeklyGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'
        }`}>
          <span>{analytics.weeklyGrowth >= 0 ? '↑' : '↓'}</span>
          <span>{Math.abs(analytics.weeklyGrowth)}%</span>
        </div>
      </div>
    </PanelFrame>
  );
}

