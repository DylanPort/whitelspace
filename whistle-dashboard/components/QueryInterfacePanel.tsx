'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { fetchAllProviders, createProcessQueryPaymentTransaction, connection, QUERY_COST } from '@/lib/contract';
import toast from 'react-hot-toast';
import PanelFrame from './PanelFrame';

const RPC_METHODS = [
  'getAccountInfo',
  'getBalance',
  'getTokenAccountBalance',
  'getTransaction',
  'getBlockHeight',
  'getBlock',
  'getSignaturesForAddress',
  'getTokenAccountsByOwner',
  'getMultipleAccounts',
  'getRecentBlockhash',
  'getEpochInfo',
  'getSlot',
  'getVersion',
  'getProgramAccounts',
  'simulateTransaction',
];

export default function QueryInterfacePanel() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const [method, setMethod] = useState('getAccountInfo');
  const [params, setParams] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Array<{ pubkey: PublicKey; isActive: boolean; endpoint: string }>>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  // Load providers on mount
  useEffect(() => {
    async function loadProviders() {
      try {
        const allProviders = await fetchAllProviders();
        setProviders(allProviders.filter(p => p.isActive));
      } catch (err) {
        console.error('Failed to load providers:', err);
      } finally {
        setLoadingProviders(false);
      }
    }

    loadProviders();
    const interval = setInterval(loadProviders, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleSendQuery = async () => {
    if (!connected || !publicKey || !params.trim()) {
      toast.error('Please connect wallet and enter query parameters', {
        duration: 4000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '16px',
          fontSize: '14px',
        },
      });
      return;
    }

    if (providers.length === 0) {
      toast.error((t) => (
        <div className="flex flex-col gap-2">
          <div className="font-semibold">No Providers Available</div>
          <div className="text-sm text-gray-300">
            RPC providers need to register before queries can be processed
          </div>
        </div>
      ), {
        duration: 5000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          padding: '16px',
          minWidth: '300px',
        },
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Select a random active provider
      const provider = providers[Math.floor(Math.random() * providers.length)];
      
      console.log(`💰 Paying 0.00001 SOL to provider: ${provider.pubkey.toBase58()}`);
      
      // Step 1: Create and send payment transaction
      const paymentTx = await createProcessQueryPaymentTransaction(
        publicKey,
        provider.pubkey,
        QUERY_COST
      );
      
      const signature = await sendTransaction(paymentTx, connection, {
        skipPreflight: true,
        maxRetries: 3,
      });
      
      console.log('✅ Payment transaction sent:', signature);
      
      // Wait for confirmation
      const latestBlockhash = await connection.getLatestBlockhash();
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Payment failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log('✅ Payment confirmed!');
      console.log(`📡 Routing query to provider: ${provider.endpoint}`);

      // Step 2: Make the actual RPC call to the provider's endpoint
      let queryParams: any[] = [];
      
      // Methods that don't require parameters
      if (['getBlockHeight', 'getEpochInfo', 'getSlot', 'getVersion', 'getRecentBlockhash'].includes(method)) {
        queryParams = [];
      }
      // Methods that need a single address/signature/id parameter
      else if ([
        'getAccountInfo',
        'getBalance',
        'getTokenAccountBalance',
        'getTransaction',
        'getSignaturesForAddress',
        'getTokenAccountsByOwner',
        'getProgramAccounts'
      ].includes(method)) {
        queryParams = [params.trim()];
      }
      // Methods that might need a number (slot)
      else if (method === 'getBlock') {
        queryParams = [parseInt(params.trim())];
      }
      // Default
      else {
        queryParams = params.trim() ? [params.trim()] : [];
      }

      // Make RPC call to provider's endpoint
      const rpcResponse = await fetch(provider.endpoint, {
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

      const rpcData = await rpcResponse.json();
      
      if (rpcData.error) {
        throw new Error(rpcData.error.message || 'RPC query failed');
      }

      setResult(JSON.stringify(rpcData.result, null, 2));
      
      console.log('✅ Query completed successfully!');
      console.log(`💸 Cost: ${QUERY_COST / LAMPORTS_PER_SOL} SOL`);
      console.log(`📊 Split: 70% provider, 20% bonus, 5% stakers, 5% treasury`);
      
    } catch (err: any) {
      console.error('Query failed:', err);
      setError(err.message || 'Query failed');
    } finally {
      setLoading(false);
    }
  };

  const queryCostSOL = (QUERY_COST / LAMPORTS_PER_SOL).toFixed(5);

  return (
    <PanelFrame
      cornerType="silver"
      className="min-h-[280px] flex flex-col"
      motionProps={{
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.6 }
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-semibold tracking-[0.15em]">
          QUERY
        </h3>
        <div className="text-[9px] text-gray-500 tracking-wider">
          {queryCostSOL} SOL/query
        </div>
      </div>

      {loadingProviders ? (
        <div className="flex-1 flex items-center justify-center text-[10px] text-gray-500">
          Loading providers...
        </div>
      ) : providers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2">
          <div className="text-2xl">⚠️</div>
          <div className="text-[10px] text-gray-400">No providers registered</div>
          <div className="text-[9px] text-gray-600">
            Providers need to register before queries can be processed
          </div>
        </div>
      ) : (
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
        {!['getBlockHeight', 'getEpochInfo', 'getSlot', 'getVersion', 'getRecentBlockhash'].includes(method) && (
          <input
            type="text"
            value={params}
            onChange={(e) => setParams(e.target.value)}
            placeholder={
              method === 'getAccountInfo' || method === 'getBalance'
                ? 'Enter address...'
                : method === 'getTransaction'
                ? 'Enter signature...'
                : method === 'getSignaturesForAddress'
                ? 'Enter address...'
                : method === 'getBlock'
                ? 'Enter slot number...'
                : method === 'getTokenAccountsByOwner'
                ? 'Enter owner address...'
                : method === 'getProgramAccounts'
                ? 'Enter program ID...'
                : 'Enter parameter...'
            }
            className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm"
          />
        )}

          {/* Provider count */}
          <div className="text-[9px] text-gray-500 tracking-wider">
            {providers.length} active provider{providers.length !== 1 ? 's' : ''} available
          </div>

          {/* Send button */}
          <button
            disabled={!connected || loading || providers.length === 0}
            onClick={handleSendQuery}
            className={`btn-primary w-full mt-4 ${loading ? 'opacity-50' : ''}`}
          >
            {loading ? 'PROCESSING...' : `SEND (${queryCostSOL} SOL)`}
          </button>

          {/* Result/Error display */}
          {(result || error) && (
            <div className="mt-4 p-3 bg-black/60 border border-white/10 text-xs font-mono max-h-32 overflow-auto">
              {error ? (
                <div className="text-red-400">❌ {error}</div>
              ) : (
                <div className="text-green-300">
                  <div className="text-gray-400 mb-2">✅ Query successful!</div>
                  <div className="text-white">{result}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </PanelFrame>
  );
}
