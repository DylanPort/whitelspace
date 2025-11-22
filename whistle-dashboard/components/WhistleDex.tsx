'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { X, ArrowDownUp, Settings, Info, TrendingUp, Zap } from 'lucide-react';

const RPC_ENDPOINT = 'https://rpc.whistle.ninja';

interface WhistleDexProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TokenInfo {
  symbol: string;
  name: string;
  mint: string;
  logoURI?: string;
  decimals: number;
}

const POPULAR_TOKENS: TokenInfo[] = [
  {
    symbol: 'SOL',
    name: 'Solana',
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    decimals: 6,
  },
  {
    symbol: 'WHISTLE',
    name: 'Whistle Token',
    mint: '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump',
    decimals: 6,
  },
];

export default function WhistleDex({ isOpen, onClose }: WhistleDexProps) {
  const { publicKey, signTransaction } = useWallet();
  const [connection] = useState(() => new Connection(RPC_ENDPOINT, 'confirmed'));
  
  const [fromToken, setFromToken] = useState<TokenInfo>(POPULAR_TOKENS[0]);
  const [toToken, setToToken] = useState<TokenInfo>(POPULAR_TOKENS[1]);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [isSwapping, setIsSwapping] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [rpcStats, setRpcStats] = useState({ latency: 0, requests: 0 });

  // Track RPC performance
  useEffect(() => {
    const startTime = Date.now();
    connection.getLatestBlockhash().then(() => {
      setRpcStats(prev => ({
        latency: Date.now() - startTime,
        requests: prev.requests + 1
      }));
    });
  }, [connection]);

  // Fetch quote from Jupiter API
  useEffect(() => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setToAmount('');
      setQuote(null);
      return;
    }

    const fetchQuote = async () => {
      setLoadingQuote(true);
      try {
        const amount = Math.floor(parseFloat(fromAmount) * Math.pow(10, fromToken.decimals));
        const response = await fetch(
          `https://quote-api.jup.ag/v6/quote?inputMint=${fromToken.mint}&outputMint=${toToken.mint}&amount=${amount}&slippageBps=${Math.floor(parseFloat(slippage) * 100)}`
        );
        const data = await response.json();
        setQuote(data);
        
        if (data.outAmount) {
          const outputAmount = parseFloat(data.outAmount) / Math.pow(10, toToken.decimals);
          setToAmount(outputAmount.toFixed(6));
        }
      } catch (err) {
        console.error('Quote error:', err);
      } finally {
        setLoadingQuote(false);
      }
    };

    const debounce = setTimeout(fetchQuote, 500);
    return () => clearTimeout(debounce);
  }, [fromAmount, fromToken, toToken, slippage, connection]);

  const handleSwap = async () => {
    if (!publicKey || !signTransaction || !quote) return;

    setIsSwapping(true);
    const startTime = Date.now();
    
    try {
      // Get swap transaction from Jupiter
      const response = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: publicKey.toBase58(),
          wrapAndUnwrapSol: true,
        }),
      });

      const { swapTransaction } = await response.json();
      const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      // Sign transaction
      const signed = await signTransaction(transaction as any);

      // Send via OUR RPC (this is the showcase!)
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      // Confirm via OUR RPC
      await connection.confirmTransaction(signature, 'confirmed');

      const latency = Date.now() - startTime;
      setRpcStats(prev => ({ ...prev, latency, requests: prev.requests + 2 }));

      alert(`✅ Swap successful!\n\nSignature: ${signature}\n\nPowered by Whistle RPC\nTotal time: ${latency}ms`);
      
      setFromAmount('');
      setToAmount('');
      setQuote(null);
    } catch (err: any) {
      console.error('Swap error:', err);
      alert(`❌ Swap failed: ${err.message}`);
    } finally {
      setIsSwapping(false);
    }
  };

  const switchTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-cyan-500/20 overflow-hidden">
        
        {/* Header with RPC Stats */}
        <div className="relative bg-gradient-to-r from-cyan-500/10 to-purple-500/10 p-4 border-b border-cyan-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-white">Whistle DEX</h2>
              <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">
                Powered by rpc.whistle.ninja
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${rpcStats.latency < 500 ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`} />
              <span className="text-gray-400">Latency: <span className="text-white font-mono">{rpcStats.latency}ms</span></span>
            </div>
            <div className="text-gray-400">
              RPC Calls: <span className="text-white font-mono">{rpcStats.requests}</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-4">
          
          {/* Settings Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Info className="w-4 h-4" />
              <span>No telemetry • No tracking</span>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Settings className={`w-4 h-4 text-gray-400 ${showSettings ? 'rotate-90' : ''} transition-transform`} />
            </button>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="bg-gray-800/50 rounded-xl p-4 space-y-3 border border-gray-700/50">
              <div>
                <label className="text-sm text-gray-400 block mb-2">Slippage Tolerance</label>
                <div className="flex gap-2">
                  {['0.1', '0.5', '1.0'].map((val) => (
                    <button
                      key={val}
                      onClick={() => setSlippage(val)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        slippage === val
                          ? 'bg-cyan-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                  <input
                    type="number"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    className="w-20 px-3 py-2 bg-gray-700 text-white rounded-lg text-sm text-center"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* From Token */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">From</span>
              <select
                value={fromToken.symbol}
                onChange={(e) => setFromToken(POPULAR_TOKENS.find(t => t.symbol === e.target.value)!)}
                className="bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {POPULAR_TOKENS.map(token => (
                  <option key={token.mint} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="number"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent text-3xl font-bold text-white outline-none"
              step="any"
            />
            <div className="text-sm text-gray-500 mt-1">{fromToken.name}</div>
          </div>

          {/* Switch Button */}
          <div className="flex justify-center -my-2 relative z-10">
            <button
              onClick={switchTokens}
              className="p-3 bg-gray-800 rounded-xl border-4 border-gray-900 hover:bg-gray-700 transition-colors group"
            >
              <ArrowDownUp className="w-5 h-5 text-cyan-400 group-hover:rotate-180 transition-transform duration-300" />
            </button>
          </div>

          {/* To Token */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">To</span>
              <select
                value={toToken.symbol}
                onChange={(e) => setToToken(POPULAR_TOKENS.find(t => t.symbol === e.target.value)!)}
                className="bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {POPULAR_TOKENS.map(token => (
                  <option key={token.mint} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              value={toAmount}
              readOnly
              placeholder="0.00"
              className="w-full bg-transparent text-3xl font-bold text-white outline-none"
            />
            <div className="text-sm text-gray-500 mt-1">{toToken.name}</div>
          </div>

          {/* Quote Info */}
          {quote && (
            <div className="bg-cyan-500/10 rounded-xl p-3 border border-cyan-500/20 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Rate</span>
                <span className="text-white font-mono">
                  1 {fromToken.symbol} ≈ {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)} {toToken.symbol}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Price Impact</span>
                <span className={`font-mono ${quote.priceImpactPct > 1 ? 'text-red-400' : 'text-green-400'}`}>
                  {quote.priceImpactPct?.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-cyan-400">
                <TrendingUp className="w-3 h-3" />
                <span>Powered by Jupiter • Executed via Whistle RPC</span>
              </div>
            </div>
          )}

          {/* Swap Button */}
          <button
            onClick={handleSwap}
            disabled={!publicKey || !quote || isSwapping || loadingQuote}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              !publicKey || !quote || isSwapping || loadingQuote
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:shadow-lg hover:shadow-cyan-500/50'
            }`}
          >
            {!publicKey ? 'Connect Wallet' : isSwapping ? 'Swapping...' : loadingQuote ? 'Fetching Quote...' : 'Swap'}
          </button>

          {/* RPC Showcase Message */}
          <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl p-3 border border-cyan-500/20">
            <p className="text-xs text-gray-400 text-center">
              🔒 This DEX runs entirely on <span className="text-cyan-400 font-mono">rpc.whistle.ninja</span>
              <br />
              No telemetry • No tracking • Community-owned infrastructure
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

