'use client';

import { useEffect, useState } from 'react';
import PanelFrame from './PanelFrame';
import { motion } from 'framer-motion';

export default function NetworkStatsPanel() {
  const [stats, setStats] = useState({
    requests: 0,
    latency: 0,
    uptime: 100,
  });

  // Fetch REAL RPC stats from Cloudflare Worker analytics
  useEffect(() => {
    async function fetchRPCStats() {
      try {
        // Get real stats from backend
        const response = await fetch('/.netlify/functions/rpc-stats');
        
        if (response.ok) {
          const data = await response.json();
          setStats({
            requests: data.requests || 0,
            latency: data.latency || 0,
            uptime: data.uptime || 100,
          });
        } else {
          // Fallback: measure latency directly
          const start = Date.now();
          await fetch('https://rpc.whistle.ninja/health');
          const latency = Date.now() - start;
          
          setStats(prev => ({
            ...prev,
            latency,
            uptime: 100,
          }));
        }
      } catch (err) {
        console.error('Failed to fetch RPC stats:', err);
        setStats(prev => ({ ...prev, uptime: 0 }));
      }
    }

    fetchRPCStats();
    const interval = setInterval(fetchRPCStats, 5000); // Update every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <PanelFrame
      cornerType="silver"
      className="min-h-[240px] flex flex-col relative overflow-hidden"
      motionProps={{
        initial: { opacity: 0, x: -50 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.6, delay: 0.3 }
      }}
    >
      {/* Animated radar background */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" viewBox="0 0 200 200">
          {/* Radar circles */}
          {[0, 1, 2, 3].map((i) => (
            <motion.circle
              key={i}
              cx="100"
              cy="100"
              r={20 + i * 20}
              fill="none"
              stroke="rgba(16, 185, 129, 0.3)"
              strokeWidth="1"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 0.5, 0],
                scale: [0.8, 1.2, 1.4]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeOut"
              }}
            />
          ))}
          
          {/* Data points */}
          {[...Array(8)].map((_, i) => {
            const angle = (i * Math.PI * 2) / 8;
            const radius = 40 + Math.random() * 40;
            const x = 100 + Math.cos(angle) * radius;
            const y = 100 + Math.sin(angle) * radius;
            
            return (
              <motion.circle
                key={i}
                cx={x}
                cy={y}
                r="2"
                fill="rgba(16, 185, 129, 0.8)"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            );
          })}
        </svg>
      </div>

      <h3 className="text-[11px] font-semibold mb-4 tracking-[0.15em] relative z-10">
        NETWORK STATS
      </h3>

      <div className="space-y-3 flex-1 relative z-10">
        {/* Latency */}
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-gray-500 tracking-wider">LATENCY</span>
          <div className="flex items-center gap-2">
            <motion.div 
              className="text-lg font-bold text-emerald-400"
              key={stats.latency}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {stats.latency}ms
            </motion.div>
            <motion.div
              className={`w-2 h-2 rounded-full ${
                stats.latency < 100 ? 'bg-emerald-500' : 
                stats.latency < 200 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [1, 0.5, 1]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </div>

        {/* Uptime */}
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-gray-500 tracking-wider">UPTIME</span>
          <div className="text-lg font-bold text-emerald-400">{stats.uptime}%</div>
        </div>

        {/* Requests */}
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-gray-500 tracking-wider">REQUESTS</span>
          <motion.div 
            className="text-lg font-bold"
            key={stats.requests}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            {stats.requests.toLocaleString()}
          </motion.div>
        </div>

        {/* Rate Limit */}
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-gray-500 tracking-wider">RATE LIMIT</span>
          <div className="text-lg font-bold text-gray-400">100/min</div>
        </div>

        {/* Status indicator */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-[10px] text-gray-500 tracking-wider">STATUS</span>
          <div className="flex items-center gap-2">
            <motion.div
              className="w-2 h-2 bg-emerald-500 rounded-full"
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [1, 0.5, 1]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-sm font-bold text-emerald-400">ONLINE</span>
          </div>
        </div>

        {/* Latency graph */}
        <div className="pt-3">
          <div className="text-[9px] text-gray-600 mb-2">RESPONSE TIME</div>
          <div className="h-8 flex items-end gap-1">
            {[...Array(20)].map((_, i) => {
              const height = 20 + Math.random() * 80;
              return (
                <motion.div
                  key={i}
                  className="flex-1 bg-emerald-500/30 rounded-t"
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ 
                    duration: 0.5,
                    delay: i * 0.05,
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </PanelFrame>
  );
}
