'use client';

import { useState } from 'react';
import PanelFrame from './PanelFrame';
import QueryResultModal from './QueryResultModal';

const RPC_METHODS = [
  { value: 'getHealth', label: 'getHealth', params: false },
  { value: 'getSlot', label: 'getSlot', params: false },
  { value: 'getBlockHeight', label: 'getBlockHeight', params: false },
  { value: 'getEpochInfo', label: 'getEpochInfo', params: false },
  { value: 'getVersion', label: 'getVersion', params: false },
  { value: 'getRecentBlockhash', label: 'getRecentBlockhash (deprecated)', params: false },
  { value: 'getLatestBlockhash', label: 'getLatestBlockhash', params: false },
  { value: 'getGenesisHash', label: 'getGenesisHash', params: false },
  { value: 'getClusterNodes', label: 'getClusterNodes', params: false },
  { value: 'getSupply', label: 'getSupply', params: false },
  { value: 'getInflationRate', label: 'getInflationRate', params: false },
  { value: 'getInflationReward', label: 'getInflationReward', params: true, placeholder: 'Enter addresses (comma separated)...' },
  { value: 'getBalance', label: 'getBalance', params: true, placeholder: 'Enter address...' },
  { value: 'getAccountInfo', label: 'getAccountInfo', params: true, placeholder: 'Enter address...' },
  { value: 'getMultipleAccounts', label: 'getMultipleAccounts', params: true, placeholder: 'Enter addresses (comma separated)...' },
  { value: 'getProgramAccounts', label: 'getProgramAccounts', params: true, placeholder: 'Enter program ID...' },
  { value: 'getTransaction', label: 'getTransaction', params: true, placeholder: 'Enter signature...' },
  { value: 'getSignaturesForAddress', label: 'getSignaturesForAddress', params: true, placeholder: 'Enter address...' },
  { value: 'getBlock', label: 'getBlock', params: true, placeholder: 'Enter slot number...' },
  { value: 'getBlocks', label: 'getBlocks', params: true, placeholder: 'Enter start slot...' },
  { value: 'getBlockTime', label: 'getBlockTime', params: true, placeholder: 'Enter slot number...' },
  { value: 'getTokenAccountBalance', label: 'getTokenAccountBalance', params: true, placeholder: 'Enter token account...' },
  { value: 'getTokenAccountsByOwner', label: 'getTokenAccountsByOwner', params: true, placeholder: 'Enter owner address...' },
  { value: 'getTokenSupply', label: 'getTokenSupply', params: true, placeholder: 'Enter mint address...' },
  { value: 'getTokenLargestAccounts', label: 'getTokenLargestAccounts', params: true, placeholder: 'Enter mint address...' },
  { value: 'getVoteAccounts', label: 'getVoteAccounts', params: false },
  { value: 'getLeaderSchedule', label: 'getLeaderSchedule', params: false },
  { value: 'getRecentPerformanceSamples', label: 'getRecentPerformanceSamples', params: false },
  { value: 'minimumLedgerSlot', label: 'minimumLedgerSlot', params: false },
  { value: 'getFirstAvailableBlock', label: 'getFirstAvailableBlock', params: false },
];

export default function QueryInterfacePanel() {
  const [method, setMethod] = useState('getHealth');
  const [params, setParams] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const currentMethod = RPC_METHODS.find(m => m.value === method);

  const handleSendQuery = async () => {
    if (currentMethod?.params && !params.trim()) {
      alert('Please enter parameters for this method');
      return;
    }

    setLoading(true);

    try {
      // Build params array
      let queryParams: any[] = [];
      
      if (currentMethod?.params && params.trim()) {
        // Methods that need slot numbers
        if (['getBlock', 'getBlockTime', 'getBlocks'].includes(method)) {
          queryParams = [parseInt(params.trim())];
        }
        // Methods that accept multiple addresses (comma separated)
        else if (['getMultipleAccounts', 'getInflationReward'].includes(method)) {
          const addresses = params.split(',').map(a => a.trim()).filter(a => a);
          queryParams = [addresses];
        }
        // Token account methods need mint filter
        else if (method === 'getTokenAccountsByOwner') {
          // Simple format: just owner address, we'll use a common token (USDC)
          queryParams = [
            params.trim(),
            { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' } // USDC
          ];
        }
        // Single parameter methods
        else {
          queryParams = [params.trim()];
        }
      }

      // Make RPC call to public endpoint
      const response = await fetch('https://rpc.whistle.ninja/rpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method,
          params: queryParams,
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        setResult({ error: data.error });
      } else {
        setResult(data);
      }
      
      setShowModal(true);
      
    } catch (err: any) {
      console.error('Query failed:', err);
      setResult({ error: { message: err.message || 'Query failed' } });
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PanelFrame
        cornerType="silver"
        className="min-h-[280px] flex flex-col"
        motionProps={{
          initial: { opacity: 0, x: -50 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.6 }
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-semibold tracking-[0.15em]">
            QUERY
          </h3>
          <div className="text-[9px] text-emerald-400 tracking-wider">
            FREE
          </div>
        </div>

        <div className="space-y-3">
          {/* Query method dropdown */}
          <div>
            <label className="text-[9px] text-gray-500 mb-1 block">METHOD</label>
            <select
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                setParams(''); // Clear params when method changes
              }}
              className="w-full px-3 py-2 bg-black/60 border border-white/20 rounded text-[10px] text-white focus:border-emerald-500/50 focus:outline-none transition-colors"
            >
              {RPC_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Params input */}
          {currentMethod?.params && (
            <div>
              <label className="text-[9px] text-gray-500 mb-1 block">PARAMS</label>
              <input
                type="text"
                value={params}
                onChange={(e) => setParams(e.target.value)}
                placeholder={currentMethod.placeholder}
                className="w-full px-3 py-2 bg-black/60 border border-white/20 rounded text-[10px] text-white placeholder-gray-600 focus:border-emerald-500/50 focus:outline-none transition-colors"
              />
            </div>
          )}

          {/* Info */}
          <div className="text-[9px] text-gray-500 pt-2 border-t border-white/10">
            Test our public RPC endpoint with any Solana method
          </div>

          {/* Send button */}
          <button
            disabled={loading}
            onClick={handleSendQuery}
            className={`w-full px-4 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded text-[10px] font-bold text-emerald-400 tracking-wider transition-all duration-200 ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'SENDING...' : 'SEND QUERY'}
          </button>
        </div>
      </PanelFrame>

      {/* Result Modal */}
      <QueryResultModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        result={result}
        method={method}
        params={params}
      />
    </>
  );
}
