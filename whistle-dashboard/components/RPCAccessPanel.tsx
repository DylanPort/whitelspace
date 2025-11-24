'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AlertCircle, Check, Loader2, Zap, Shield, Clock, TrendingUp } from 'lucide-react';

interface RPCQuote {
  amount: string;
  mint: string;
  nonce: string;
  expires_at: number;
  recipient: string;
  whistle?: {
    queryCount: number;
    totalPrice: number;
    discount: number;
    validFor: number;
  };
}

interface AccessToken {
  token: string;
  queriesAllowed: number;
  queriesUsed: number;
  queriesRemaining: number;
  expiresIn: number;
  expiresAt: number;
  rpcEndpoint?: string;
}

const RPCAccessPanel: React.FC = () => {
  const { publicKey, signTransaction, connected } = useWallet();
  const [step, setStep] = useState<'select' | 'quote' | 'payment' | 'access'>('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Quote state
  const [queryCount, setQueryCount] = useState(100);
  const [quote, setQuote] = useState<RPCQuote | null>(null);
  const [nonce, setNonce] = useState<string | null>(null);
  
  // Access state
  const [accessToken, setAccessToken] = useState<AccessToken | null>(null);
  const [rpcEndpoint, setRpcEndpoint] = useState<string>('');
  
  // Pricing tiers
  const pricingTiers = [
    { queries: 100, price: 0.01, discount: 0, label: 'Starter' },
    { queries: 1000, price: 0.095, discount: 5, label: 'Developer' },
    { queries: 10000, price: 0.9, discount: 10, label: 'Professional' },
    { queries: 100000, price: 8.5, discount: 15, label: 'Enterprise' }
  ];

  // Load saved access token
  useEffect(() => {
    const saved = localStorage.getItem('whistle_rpc_access');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.expiresAt > Date.now()) {
          setAccessToken(data);
          setStep('access');
        } else {
          localStorage.removeItem('whistle_rpc_access');
        }
      } catch (e) {
        console.error('Failed to load saved access:', e);
      }
    }
  }, []);

  // Step 1: Generate Quote
  const generateQuote = async () => {
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rpc/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          queryCount
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate quote');
      }

      setQuote(data.quote);
      setNonce(data.quote.nonce);
      setStep('quote');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Quote
  const verifyQuote = async () => {
    if (!quote || !nonce || !publicKey) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rpc/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote,
          nonce,
          walletAddress: publicKey.toBase58()
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to verify quote');
      }

      // Proceed to payment
      await makePayment();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Step 3: Make Payment
  const makePayment = async () => {
    if (!quote || !publicKey || !signTransaction) return;

    try {
      const connection = new Connection('https://api.mainnet-beta.solana.com');
      
      // Create payment transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(quote.recipient),
          lamports: Math.floor(parseFloat(quote.amount) * LAMPORTS_PER_SOL)
        })
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Sign transaction
      const signedTx = await signTransaction(transaction);
      
      // Send transaction
      const txSig = await connection.sendRawTransaction(signedTx.serialize());
      
      // Wait for confirmation
      await connection.confirmTransaction(txSig, 'confirmed');

      // Unlock access
      await unlockAccess(txSig);
    } catch (err: any) {
      setError(`Payment failed: ${err.message}`);
      setLoading(false);
    }
  };

  // Step 4: Unlock Access
  const unlockAccess = async (txSig: string) => {
    if (!publicKey || !nonce) return;

    try {
      const response = await fetch('/api/rpc/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx: txSig,
          nonce,
          walletAddress: publicKey.toBase58()
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to unlock access');
      }

      // Save access token
      const accessData = {
        token: data.accessToken,
        queriesAllowed: data.queriesAllowed,
        queriesUsed: 0,
        queriesRemaining: data.queriesAllowed,
        expiresAt: Date.now() + (data.expiresIn * 1000),
        expiresIn: data.expiresIn
      };

      setAccessToken(accessData);
      setRpcEndpoint(data.rpcEndpoint);
      localStorage.setItem('whistle_rpc_access', JSON.stringify(accessData));
      
      setStep('access');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Format time remaining
  const formatTimeRemaining = (expiresAt: number) => {
    const remaining = Math.max(0, expiresAt - Date.now());
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-400" />
          RPC Access
        </h2>
        {accessToken && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            Expires in {formatTimeRemaining(accessToken.expiresAt)}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-500 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Step 1: Select Package */}
      {step === 'select' && (
        <div>
          <p className="text-gray-400 mb-6">
            Get secure, nonce-locked RPC access with guaranteed query limits and enterprise-grade protection.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {pricingTiers.map((tier) => (
              <button
                key={tier.queries}
                onClick={() => setQueryCount(tier.queries)}
                className={`p-4 rounded-lg border transition-all ${
                  queryCount === tier.queries
                    ? 'bg-purple-600/20 border-purple-500'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="text-lg font-bold text-white mb-1">{tier.label}</div>
                <div className="text-2xl font-bold text-purple-400 mb-2">
                  {tier.queries.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">queries</div>
                <div className="text-lg text-white mt-2">{tier.price} SOL</div>
                {tier.discount > 0 && (
                  <div className="text-xs text-green-400 mt-1">
                    Save {tier.discount}%
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              Security Features
            </h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                Single-use nonces prevent replay attacks
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                Hash-bound authorization
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                5-minute quote expiration
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                24-hour access tokens
              </li>
            </ul>
          </div>

          <button
            onClick={generateQuote}
            disabled={loading || !connected}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Quote...
              </>
            ) : !connected ? (
              'Connect Wallet First'
            ) : (
              <>
                <TrendingUp className="w-5 h-5" />
                Get Quote for {queryCount.toLocaleString()} Queries
              </>
            )}
          </button>
        </div>
      )}

      {/* Step 2: Review Quote */}
      {step === 'quote' && quote && (
        <div>
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Payment Quote</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Queries:</span>
                <span className="text-white font-mono">{quote.whistle?.queryCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Price:</span>
                <span className="text-white font-mono">{quote.whistle?.totalPrice} SOL</span>
              </div>
              {quote.whistle?.discount && quote.whistle.discount < 1 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Discount:</span>
                  <span className="text-green-400 font-mono">
                    {((1 - quote.whistle.discount) * 100).toFixed(0)}% off
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Nonce:</span>
                <span className="text-white font-mono text-xs">{quote.nonce.substring(0, 16)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Expires:</span>
                <span className="text-white">
                  {new Date(quote.expires_at * 1000).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep('select')}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={verifyQuote}
              disabled={loading}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Pay & Unlock Access
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Access Granted */}
      {step === 'access' && accessToken && (
        <div>
          <div className="bg-green-900/20 border border-green-500 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <Check className="w-5 h-5" />
              <span className="font-semibold">Access Granted!</span>
            </div>
            <p className="text-sm text-gray-300">
              Your RPC access is active. Use the credentials below to make queries.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm text-gray-400">RPC Endpoint:</span>
                <button
                  onClick={() => copyToClipboard(rpcEndpoint || 'https://rpc.whistle.ninja')}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Copy
                </button>
              </div>
              <code className="text-sm text-white font-mono break-all">
                {rpcEndpoint || 'https://rpc.whistle.ninja'}
              </code>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm text-gray-400">Access Token:</span>
                <button
                  onClick={() => copyToClipboard(accessToken.token)}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Copy
                </button>
              </div>
              <code className="text-sm text-white font-mono break-all">
                {accessToken.token.substring(0, 32)}...
              </code>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-sm text-gray-400 mb-3">Usage Stats:</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Queries Used:</span>
                  <span className="text-white">{accessToken.queriesUsed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Queries Remaining:</span>
                  <span className="text-white">{accessToken.queriesRemaining.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${(accessToken.queriesUsed / accessToken.queriesAllowed) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-sm text-gray-400 mb-3">Example Usage:</h4>
              <pre className="text-xs text-gray-300 overflow-x-auto">
{`curl -X POST ${rpcEndpoint || 'https://rpc.whistle.ninja'}/api/rpc \\
  -H "X-Access-Token: ${accessToken.token.substring(0, 20)}..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getBalance",
    "params": ["YourWalletAddress"]
  }'`}
              </pre>
            </div>
          </div>

          <button
            onClick={() => {
              setStep('select');
              setQueryCount(100);
            }}
            className="w-full mt-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold text-white transition-colors"
          >
            Purchase More Queries
          </button>
        </div>
      )}
    </div>
  );
};

export default RPCAccessPanel;
