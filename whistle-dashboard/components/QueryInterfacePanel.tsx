'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { api } from '@/lib/api';
import { PublicKey } from '@solana/web3.js';

const RPC_METHODS = [
  'getAccountInfo',
  'getBalance',
  'getTokenAccountBalance',
  'getTransaction',
  'getBlockHeight',
];

export default function QueryInterfacePanel() {
  const { connected } = useWallet();
  const [method, setMethod] = useState('getAccountInfo');
  const [params, setParams] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSendQuery = async () => {
    if (!connected || !params.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let queryParams: any[] = [];

      // Parse params based on method
      if (method === 'getAccountInfo' || method === 'getBalance') {
        queryParams = [params.trim()];
      } else if (method === 'getTokenAccountBalance') {
        queryParams = [params.trim()];
      } else if (method === 'getTransaction') {
        queryParams = [params.trim()];
      } else if (method === 'getBlockHeight') {
        queryParams = [];
      }

      const response = await api.rpcQuery(method, queryParams);
      setResult(JSON.stringify(response, null, 2));
    } catch (err: any) {
      setError(err.message || 'Query failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
      className="panel-base p-6 rounded-[16px] clip-angled-border"
    >
      <h3 className="text-[11px] font-semibold mb-4 tracking-[0.15em]">
        QUERY
      </h3>

      <div className="space-y-3">
        {/* Query method dropdown */}
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm"
          style={{ appearance: 'none' }}
        >
          {RPC_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {/* Params input */}
        {method !== 'getBlockHeight' && (
          <input
            type="text"
            value={params}
            onChange={(e) => setParams(e.target.value)}
            placeholder={
              method === 'getAccountInfo' || method === 'getBalance'
                ? 'Enter address...'
                : method === 'getTransaction'
                ? 'Enter signature...'
                : 'Enter token account...'
            }
            className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm"
          />
        )}

        {/* Send button */}
        <button
          disabled={!connected || loading}
          onClick={handleSendQuery}
          className="btn-primary w-full mt-4"
        >
          {loading ? 'QUERYING...' : 'SEND'}
        </button>

        {/* Result/Error display */}
        {(result || error) && (
          <div className="mt-4 p-3 bg-black/60 border border-white/10 text-xs font-mono max-h-32 overflow-auto">
            {error ? (
              <div className="text-gray-400">{error}</div>
            ) : (
              <div className="text-white">{result}</div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
