'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { api, type QueryLog } from '@/lib/api';

export default function RecentActivityPanel() {
  const [queries, setQueries] = useState<QueryLog[]>([]);

  useEffect(() => {
    async function loadQueries() {
      try {
        const logs = await api.getQueryLogs(10);
        setQueries(logs);
      } catch (err) {
        // Show empty state if backend is unavailable
        console.error('Failed to load recent queries:', err);
        setQueries([]);
      }
    }

    loadQueries();
    const interval = setInterval(loadQueries, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.3 }}
      className="panel-base p-6 rounded-[16px] clip-angled-border"
      style={{ 
        width: '800px',
        maxHeight: '180px',
      }}
    >
      <h3 className="text-[11px] font-semibold mb-4 tracking-[0.15em] text-center">
        RECENT ACTIVITY
      </h3>

      <div className="grid grid-cols-3 gap-4">
        {queries.length === 0 ? (
          <div className="col-span-3 text-center py-8">
            <div className="text-gray-600 text-xs mb-2">⚠</div>
            <div className="text-gray-500 text-[10px]">No query activity</div>
            <div className="text-gray-600 text-[9px] mt-1">Backend offline or no queries yet</div>
          </div>
        ) : (
          queries.slice(0, 6).map((query, i) => (
            <div 
              key={i}
              className="flex items-center justify-between px-3 py-2 bg-black/40 border border-white/5"
            >
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs truncate">{query.method}</div>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <span className="text-[10px] text-gray-500">{query.response_time}ms</span>
                <span className={query.status === 'success' ? 'text-white text-xs' : 'text-gray-600 text-xs'}>
                  {query.status === 'success' ? '✓' : '✗'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
