'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<'users' | 'providers' | 'api'>('users');

  return (
    <div className="min-h-screen bg-[#050505] p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <Link href="/" className="text-gray-400 hover:text-white text-sm mb-2 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-4xl font-bold tracking-wider mb-2">DOCUMENTATION</h1>
        <p className="text-gray-500">Everything you need to know about WHISTLE Network</p>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex gap-4">
          {[
            { key: 'users', label: 'For Users' },
            { key: 'providers', label: 'For Providers' },
            { key: 'api', label: 'API Reference' },
          ].map((section) => (
            <button
              key={section.key}
              onClick={() => setActiveSection(section.key as any)}
              className={`px-6 py-3 text-sm tracking-wider uppercase transition-colors ${
                activeSection === section.key
                  ? 'bg-white text-black'
                  : 'bg-black/60 border border-white/20 hover:bg-black/80'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel-base p-8 clip-angled-border"
        >
          {activeSection === 'users' && (
            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-bold mb-4">Getting Started as a User</h2>
                <p className="text-gray-300 mb-4">
                  WHISTLE Network provides decentralized RPC access to Solana blockchain data. Here's how to get started:
                </p>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-3">1. Connect Your Wallet</h3>
                <p className="text-gray-300 mb-2">Click the "Connect Wallet" button and approve the connection.</p>
                <div className="bg-black/40 p-4 border border-white/5 font-mono text-sm text-gray-400">
                  Supported wallets: Phantom, Solflare, Backpack
                </div>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-3">2. Stake WHISTLE Tokens</h3>
                <p className="text-gray-300 mb-2">Stake WHISTLE tokens to receive access credits for queries:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-300 mb-2">
                  <li>Minimum stake: 100 WHISTLE</li>
                  <li>1 WHISTLE = 1 access token</li>
                  <li>Use access tokens for RPC queries</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-3">3. Query Blockchain Data</h3>
                <p className="text-gray-300 mb-2">Use the Query Interface to fetch blockchain data:</p>
                <div className="bg-black/40 p-4 border border-white/5 mb-2">
                  <pre className="text-sm text-gray-400 font-mono">
{`// Example: Get account info
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getAccountInfo",
  "params": ["YourSolanaAddressHere"]
}`}
                  </pre>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-3">4. Explore Tokens & Transactions</h3>
                <p className="text-gray-300 mb-2">
                  Browse tokens, view transaction details, and monitor your portfolio through the dashboard.
                </p>
              </section>
            </div>
          )}

          {activeSection === 'providers' && (
            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-bold mb-4">Becoming a Provider</h2>
                <p className="text-gray-300 mb-4">
                  Earn SOL by running a WHISTLE provider node and serving RPC queries.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-3">Requirements</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                  <li><strong>Hardware:</strong> 32+ GB RAM, 2TB+ NVMe SSD</li>
                  <li><strong>Bond:</strong> 1,000 WHISTLE tokens (refundable)</li>
                  <li><strong>Endpoint:</strong> Public HTTPS or WSS endpoint</li>
                  <li><strong>Uptime:</strong> 99%+ uptime commitment</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-3">Setup Steps</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-semibold mb-1">1. Download Solana Snapshot (~500 GB)</div>
                    <div className="bg-black/40 p-3 border border-white/5 font-mono text-xs text-gray-400">
                      solana-validator --download-snapshot --ledger /mnt/solana/ledger
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold mb-1">2. Run Validator in RPC Mode</div>
                    <div className="bg-black/40 p-3 border border-white/5 font-mono text-xs text-gray-400">
                      solana-validator --rpc-port 8899 --ledger /mnt/solana/ledger
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold mb-1">3. Clone Provider Software</div>
                    <div className="bg-black/40 p-3 border border-white/5 font-mono text-xs text-gray-400">
                      git clone https://github.com/DylanPort/whitelspace
                      <br />
                      cd whitelspace/whistlenet/provider
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold mb-1">4. Configure & Start Services</div>
                    <div className="bg-black/40 p-3 border border-white/5 font-mono text-xs text-gray-400">
                      npm install
                      <br />
                      npm start
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold mb-1">5. Register on WHISTLE Dashboard</div>
                    <p className="text-sm text-gray-400">
                      Connect your wallet and register through the Provider Dashboard with your public endpoint.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-3">Earnings</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-300">
                  <li>70% of query fees go directly to providers</li>
                  <li>20% bonus pool for top performers</li>
                  <li>Earn ~0.0007 SOL per query</li>
                  <li>Break-even at ~200-500 queries/month</li>
                </ul>
              </section>
            </div>
          )}

          {activeSection === 'api' && (
            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-bold mb-4">API Reference</h2>
                <p className="text-gray-300 mb-4">
                  WHISTLE Network provides a standard Solana RPC API plus enhanced analytics endpoints.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-3">Base URL</h3>
                <div className="bg-black/40 p-3 border border-white/5 font-mono text-sm text-gray-400 mb-4">
                  https://rpc.whistle.network/mainnet-beta
                </div>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-3">Standard RPC Methods</h3>
                <div className="space-y-4">
                  {[
                    {
                      method: 'getAccountInfo',
                      desc: 'Get account information',
                      params: ['<address:string>'],
                    },
                    {
                      method: 'getBalance',
                      desc: 'Get SOL balance',
                      params: ['<address:string>'],
                    },
                    {
                      method: 'getTransaction',
                      desc: 'Get transaction details',
                      params: ['<signature:string>'],
                    },
                    {
                      method: 'getBlockHeight',
                      desc: 'Get current block height',
                      params: [],
                    },
                  ].map((endpoint) => (
                    <div key={endpoint.method} className="bg-black/40 p-4 border border-white/5">
                      <div className="font-mono text-sm font-semibold mb-2">{endpoint.method}</div>
                      <div className="text-xs text-gray-400 mb-2">{endpoint.desc}</div>
                      {endpoint.params.length > 0 && (
                        <div className="text-xs text-gray-500">
                          Params: {endpoint.params.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-3">Enhanced Analytics</h3>
                <div className="space-y-4">
                  <div className="bg-black/40 p-4 border border-white/5">
                    <div className="font-mono text-sm font-semibold mb-2">GET /tokens/latest</div>
                    <div className="text-xs text-gray-400">Get latest tokens with metadata</div>
                  </div>

                  <div className="bg-black/40 p-4 border border-white/5">
                    <div className="font-mono text-sm font-semibold mb-2">GET /tokens/:address</div>
                    <div className="text-xs text-gray-400">Get token details, price, holders</div>
                  </div>

                  <div className="bg-black/40 p-4 border border-white/5">
                    <div className="font-mono text-sm font-semibold mb-2">GET /api/transactions</div>
                    <div className="text-xs text-gray-400">Query transaction history</div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-3">Example Request</h3>
                <div className="bg-black/40 p-4 border border-white/5">
                  <pre className="text-xs text-gray-400 font-mono overflow-x-auto">
{`curl https://rpc.whistle.network/mainnet-beta \\
  -X POST \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getAccountInfo",
    "params": ["YourSolanaAddressHere"]
  }'`}
                  </pre>
                </div>
              </section>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

