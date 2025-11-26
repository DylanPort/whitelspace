'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  Server, 
  Wallet,
  Coins,
  Zap,
  Lock,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  ChevronRight,
  Award,
  Activity,
  TrendingUp,
  Terminal,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Shield
} from 'lucide-react';

// Constants
const WHISTLE_PROGRAM_ID = 'whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr';
const WHISTLE_MINT = '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump';
const MIN_PROVIDER_BOND = 1000;
const COORDINATOR_URL = process.env.NEXT_PUBLIC_COORDINATOR_URL || 'https://whistle-backend.onrender.com';
const RPC_URL = 'https://rpc.whistle.ninja/rpc';

// 6 Steps for Provider Registration
const STEPS = [
  { id: 1, title: 'Connect Wallet', icon: Wallet, description: 'Connect your Solana wallet' },
  { id: 2, title: 'Get WHISTLE', icon: Coins, description: 'Acquire WHISTLE tokens' },
  { id: 3, title: 'Have SOL', icon: Zap, description: 'SOL for transaction fees' },
  { id: 4, title: 'Stake WHISTLE', icon: Lock, description: 'Stake tokens to participate' },
  { id: 5, title: 'Register Provider', icon: Server, description: 'Bond tokens & set endpoint' },
  { id: 6, title: 'Start Earning', icon: Play, description: 'Run your cache node' },
];

export default function ProviderPage() {
  const { publicKey, connected } = useWallet();
  const [mounted, setMounted] = useState(false);
  
  // Provider state
  const [currentStep, setCurrentStep] = useState(1);
  const [whistleBalance, setWhistleBalance] = useState<number | null>(null);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState('https://rpc.whistle.ninja/rpc');
  const [bondAmount, setBondAmount] = useState(MIN_PROVIDER_BOND);
  const [providerRegistered, setProviderRegistered] = useState(false);
  
  // Network stats
  const [networkStats, setNetworkStats] = useState({
    totalNodes: 0,
    activeNodes: 0,
    totalRequests: 0,
    hitRate: 0
  });
  
  // Setup section state
  const [expandedSection, setExpandedSection] = useState<string | null>('docker');
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch balances
  const fetchAccountData = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      const conn = new Connection(RPC_URL, 'confirmed');
      const solBal = await conn.getBalance(publicKey);
      setSolBalance(solBal / LAMPORTS_PER_SOL);
      setWhistleBalance(0); // Simplified - would fetch real balance in production
      
      // Determine step
      if (!connected) setCurrentStep(1);
      else if (solBalance && solBalance < 0.01) setCurrentStep(3);
      else if (!providerRegistered) setCurrentStep(5);
      else setCurrentStep(6);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  }, [publicKey, connected, solBalance, providerRegistered]);

  useEffect(() => {
    if (connected && publicKey) fetchAccountData();
  }, [connected, publicKey, fetchAccountData]);

  // Fetch network stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${COORDINATOR_URL}/api/network/stats`);
        if (response.ok) {
          const data = await response.json();
          setNetworkStats({
            totalNodes: data.nodes?.total || 0,
            activeNodes: data.nodes?.active || 0,
            totalRequests: data.metrics?.totalRequests || 0,
            hitRate: parseFloat(data.metrics?.hitRate || '0')
          });
        }
      } catch (err) {
        console.error('Error fetching network stats:', err);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = (text: string, itemId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(itemId);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const canGoNext = () => currentStep < 6;
  const canGoBack = () => currentStep > 1;
  const goNext = () => { if (canGoNext()) setCurrentStep(prev => prev + 1); };
  const goBack = () => { if (canGoBack()) setCurrentStep(prev => prev - 1); };

  const walletAddress = publicKey?.toBase58() || 'YOUR_WALLET_ADDRESS';
  
  const dockerCompose = `version: '3.8'
services:
  whistle-cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  cache-node:
    build: .
    ports:
      - "8545:8545"
    environment:
      - PROVIDER_WALLET=${walletAddress}
      - COORDINATOR_URL=${COORDINATOR_URL}
      - UPSTREAM_RPC=${RPC_URL}
      - REDIS_URL=redis://whistle-cache:6379
    depends_on:
      - whistle-cache`;

  const nodeSetup = `# Clone the repository
git clone https://github.com/DylanPort/whitelspace.git
cd whitelspace/providers/cache-node

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
PROVIDER_WALLET=${walletAddress}
COORDINATOR_URL=${COORDINATOR_URL}
UPSTREAM_RPC=${RPC_URL}
CACHE_PORT=8545
REDIS_URL=redis://localhost:6379
EOF

# Start Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Start the cache node
npm start`;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#00ff88]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Scanlines */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.1) 2px, rgba(0,255,136,0.1) 4px)' }}
      />
      
      {/* Header */}
      <header className="border-b border-[#00ff88]/20 bg-[#0a0a0a]/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-2xl font-bold tracking-wider">
              <span className="text-[#00ff88]">WHISTLE</span>
              <span className="text-gray-400 text-lg ml-2">Provider Dashboard</span>
            </a>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${networkStats.activeNodes > 0 ? 'bg-[#00ff88] animate-pulse' : 'bg-gray-500'}`} />
              <span className="text-gray-400">{networkStats.activeNodes} nodes online</span>
            </div>
            <WalletMultiButton className="!bg-[#00ff88]/10 !border !border-[#00ff88]/50 hover:!bg-[#00ff88]/20 !text-[#00ff88] !rounded-lg !h-10 !text-sm !font-mono" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            <span className="text-[#00ff88]">Become a</span> Provider
          </h2>
          <p className="text-gray-500 font-mono text-sm">// Run a cache node and earn SOL from RPC queries</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT - Registration */}
          <div className="lg:col-span-2 space-y-6">
            {/* 6-Step Progress */}
            <div className="bg-[#111] border border-[#00ff88]/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <Server className="w-6 h-6 text-[#00ff88]" />
                <div>
                  <h3 className="text-lg font-bold">Provider Registration</h3>
                  <p className="text-gray-500 text-sm">6 steps to start earning</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center justify-between mb-8">
                {STEPS.map((step, index) => {
                  const StepIcon = step.icon;
                  const isCompleted = currentStep > step.id;
                  const isCurrent = currentStep === step.id;
                  return (
                    <div key={step.id} className="flex items-center">
                      <div className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                        ${isCompleted ? 'bg-[#00ff88]/20 border-[#00ff88]' : ''}
                        ${isCurrent ? 'bg-[#00ff88]/10 border-[#00ff88] animate-pulse' : ''}
                        ${!isCompleted && !isCurrent ? 'bg-gray-900 border-gray-700' : ''}`}>
                        {isCompleted ? <CheckCircle className="w-5 h-5 text-[#00ff88]" /> : <StepIcon className={`w-5 h-5 ${isCurrent ? 'text-[#00ff88]' : 'text-gray-500'}`} />}
                        <span className="absolute -bottom-5 text-[10px] font-mono text-gray-500">{step.id}</span>
                      </div>
                      {index < STEPS.length - 1 && <div className={`w-8 lg:w-12 h-0.5 mx-1 ${currentStep > step.id ? 'bg-[#00ff88]' : 'bg-gray-700'}`} />}
                    </div>
                  );
                })}
              </div>

              <div className="text-center mb-6">
                <p className="text-[#00ff88] font-mono text-sm uppercase tracking-wider">Step {currentStep}: {STEPS[currentStep - 1]?.title}</p>
                <p className="text-gray-500 text-xs mt-1">{STEPS[currentStep - 1]?.description}</p>
              </div>

              {error && <div className="flex items-center gap-2 p-3 mb-4 border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-mono rounded-lg"><AlertCircle className="w-4 h-4" />{error}</div>}
              {success && <div className="flex items-center gap-2 p-3 mb-4 border border-[#00ff88]/30 bg-[#00ff88]/10 text-[#00ff88] text-sm font-mono rounded-lg"><CheckCircle className="w-4 h-4" />{success}</div>}

              {/* Step Content */}
              <div className="border border-gray-800 rounded-lg p-6 bg-[#0a0a0a]">
                {currentStep === 1 && (
                  <div className="text-center py-4">
                    <Wallet className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                    <h4 className="text-white font-bold mb-2">Connect Your Wallet</h4>
                    <p className="text-gray-500 text-sm mb-4">Connect a Solana wallet to get started</p>
                    <WalletMultiButton className="!bg-[#00ff88] !text-black !rounded-lg !h-12 !px-6 !font-bold hover:!bg-[#00ff88]/80" />
                  </div>
                )}
                {currentStep === 2 && (
                  <div className="text-center py-4">
                    <Coins className="w-12 h-12 mx-auto text-yellow-400 mb-4" />
                    <h4 className="text-white font-bold mb-2">Get WHISTLE Tokens</h4>
                    <p className="text-gray-500 text-sm mb-2">You need at least <span className="text-[#00ff88] font-mono">{MIN_PROVIDER_BOND}</span> WHISTLE</p>
                    <p className="text-gray-600 text-xs mb-4">Current balance: <span className="text-white font-mono">{whistleBalance?.toLocaleString() || '0'}</span></p>
                    <a href={`https://pump.fun/coin/${WHISTLE_MINT}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#00ff88] text-black px-6 py-3 rounded-lg font-bold hover:bg-[#00ff88]/80">Buy on pump.fun <ExternalLink className="w-4 h-4" /></a>
                  </div>
                )}
                {currentStep === 3 && (
                  <div className="text-center py-4">
                    <Zap className="w-12 h-12 mx-auto text-purple-400 mb-4" />
                    <h4 className="text-white font-bold mb-2">Get SOL for Fees</h4>
                    <p className="text-gray-500 text-sm mb-2">You need SOL for transaction fees</p>
                    <p className="text-gray-600 text-xs mb-4">Current balance: <span className="text-white font-mono">{solBalance?.toFixed(4) || '0'}</span> SOL</p>
                  </div>
                )}
                {currentStep === 4 && (
                  <div className="py-4">
                    <div className="text-center mb-4">
                      <Lock className="w-12 h-12 mx-auto text-blue-400 mb-4" />
                      <h4 className="text-white font-bold mb-2">Stake WHISTLE</h4>
                      <p className="text-gray-500 text-sm">Stake tokens to participate</p>
                    </div>
                    <div className="max-w-sm mx-auto">
                      <input type="number" value={bondAmount} onChange={(e) => setBondAmount(Number(e.target.value))} min={MIN_PROVIDER_BOND} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-4 py-3 text-white font-mono focus:border-[#00ff88] focus:outline-none" />
                      <p className="text-gray-600 text-xs mt-2">Minimum: {MIN_PROVIDER_BOND} WHISTLE</p>
                    </div>
                  </div>
                )}
                {currentStep === 5 && (
                  <div className="py-4">
                    <div className="text-center mb-4">
                      <Server className="w-12 h-12 mx-auto text-[#00ff88] mb-4" />
                      <h4 className="text-white font-bold mb-2">Register as Provider</h4>
                      <p className="text-gray-500 text-sm">Set your RPC endpoint URL</p>
                    </div>
                    <div className="max-w-md mx-auto space-y-4">
                      <input type="text" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://your-rpc-endpoint.com" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-4 py-3 text-white font-mono focus:border-[#00ff88] focus:outline-none" />
                      <button onClick={() => { setProviderRegistered(true); setCurrentStep(6); setSuccess('Provider registered!'); }} disabled={loading || !endpoint || endpoint.length < 10} className="w-full bg-[#00ff88] text-black py-3 rounded-lg font-bold hover:bg-[#00ff88]/80 disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Server className="w-5 h-5" />} Register Provider
                      </button>
                    </div>
                  </div>
                )}
                {currentStep === 6 && (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#00ff88]/20 border-2 border-[#00ff88] flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-[#00ff88]" />
                    </div>
                    <h4 className="text-[#00ff88] font-bold text-xl mb-2">You're All Set!</h4>
                    <p className="text-gray-500 text-sm mb-4">Start your cache node to begin earning</p>
                    <div className="p-3 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg">
                      <p className="text-[#00ff88] text-sm font-bold">Next: Run Your Cache Node</p>
                      <p className="text-gray-400 text-xs">See setup guide below</p>
                    </div>
                  </div>
                )}

                {/* Nav Buttons */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
                  <button onClick={goBack} disabled={!canGoBack()} className={`flex items-center gap-2 px-4 py-2 font-mono text-sm rounded-lg ${canGoBack() ? 'text-gray-400 hover:text-white border border-gray-700' : 'text-gray-600 cursor-not-allowed'}`}>
                    <ChevronRight className="w-4 h-4 rotate-180" /> Back
                  </button>
                  <span className="text-gray-500 text-xs font-mono">{currentStep} / 6</span>
                  <button onClick={goNext} disabled={!canGoNext()} className={`flex items-center gap-2 px-4 py-2 font-mono text-sm rounded-lg ${canGoNext() ? 'text-[#00ff88] border border-[#00ff88]/50 hover:bg-[#00ff88]/10' : 'text-gray-600 cursor-not-allowed'}`}>
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Rewards Info */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="text-center p-3 border border-gray-800 rounded-lg">
                  <Zap className="w-5 h-5 mx-auto mb-2 text-[#00ff88]" />
                  <p className="text-white font-bold">70%</p>
                  <p className="text-gray-500 text-xs">Query Revenue</p>
                </div>
                <div className="text-center p-3 border border-gray-800 rounded-lg">
                  <Lock className="w-5 h-5 mx-auto mb-2 text-yellow-400" />
                  <p className="text-white font-bold">{MIN_PROVIDER_BOND}</p>
                  <p className="text-gray-500 text-xs">Min Bond</p>
                </div>
                <div className="text-center p-3 border border-gray-800 rounded-lg">
                  <Award className="w-5 h-5 mx-auto mb-2 text-purple-400" />
                  <p className="text-white font-bold">1.5x</p>
                  <p className="text-gray-500 text-xs">Server Bonus</p>
                </div>
              </div>
            </div>

            {/* Setup Guide */}
            <div className="bg-[#111] border border-[#00ff88]/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <Terminal className="w-6 h-6 text-[#00ff88]" />
                <div>
                  <h3 className="text-lg font-bold">Server Cache Node Setup</h3>
                  <p className="text-gray-500 text-sm">Earn real SOL rewards • 70% of query fees</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 mb-6 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-[#00ff88] mt-0.5" />
                <div className="text-xs">
                  <p className="text-[#00ff88] font-bold uppercase mb-1">Payments Active</p>
                  <p className="text-gray-400">Server providers earn 70% of query fees paid to the smart contract.</p>
                </div>
              </div>

              {/* Docker */}
              <div className="border border-gray-800 rounded-lg overflow-hidden mb-4">
                <button onClick={() => setExpandedSection(expandedSection === 'docker' ? null : 'docker')} className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50">
                  <div className="flex items-center gap-3">
                    <Download className="w-5 h-5 text-blue-400" />
                    <div className="text-left">
                      <p className="font-medium">Docker Setup</p>
                      <p className="text-xs text-gray-500">Recommended</p>
                    </div>
                  </div>
                  {expandedSection === 'docker' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {expandedSection === 'docker' && (
                  <div className="p-4 border-t border-gray-800">
                    <div className="relative">
                      <pre className="bg-[#0a0a0a] p-4 rounded-lg text-xs text-gray-300 overflow-x-auto font-mono">{dockerCompose}</pre>
                      <button onClick={() => copyToClipboard(dockerCompose, 'docker')} className="absolute top-2 right-2 p-2 bg-gray-800 rounded hover:bg-gray-700">
                        {copiedItem === 'docker' ? <Check className="w-4 h-4 text-[#00ff88]" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-sm text-gray-400 mt-4">Then run: <code className="text-[#00ff88]">docker-compose up -d</code></p>
                  </div>
                )}
              </div>

              {/* Node.js */}
              <div className="border border-gray-800 rounded-lg overflow-hidden">
                <button onClick={() => setExpandedSection(expandedSection === 'nodejs' ? null : 'nodejs')} className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50">
                  <div className="flex items-center gap-3">
                    <Terminal className="w-5 h-5 text-green-400" />
                    <div className="text-left">
                      <p className="font-medium">Node.js Setup</p>
                      <p className="text-xs text-gray-500">Manual</p>
                    </div>
                  </div>
                  {expandedSection === 'nodejs' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {expandedSection === 'nodejs' && (
                  <div className="p-4 border-t border-gray-800">
                    <div className="relative">
                      <pre className="bg-[#0a0a0a] p-4 rounded-lg text-xs text-gray-300 overflow-x-auto font-mono whitespace-pre-wrap">{nodeSetup}</pre>
                      <button onClick={() => copyToClipboard(nodeSetup, 'nodejs')} className="absolute top-2 right-2 p-2 bg-gray-800 rounded hover:bg-gray-700">
                        {copiedItem === 'nodejs' ? <Check className="w-4 h-4 text-[#00ff88]" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT - Stats */}
          <div className="space-y-6">
            <div className="bg-[#111] border border-[#00ff88]/20 rounded-xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00ff88]" /> Network Stats
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between"><span className="text-gray-500 text-sm">Active Nodes</span><span className="text-[#00ff88] font-mono font-bold">{networkStats.activeNodes}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 text-sm">Total Nodes</span><span className="text-white font-mono">{networkStats.totalNodes}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 text-sm">Total Requests</span><span className="text-white font-mono">{networkStats.totalRequests.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 text-sm">Cache Hit Rate</span><span className="text-[#00ff88] font-mono">{networkStats.hitRate}%</span></div>
              </div>
            </div>

            <div className="bg-[#111] border border-[#00ff88]/20 rounded-xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#00ff88]" /> Revenue Split
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-gray-500 text-sm">Provider (You)</span><span className="text-[#00ff88] font-mono font-bold">70%</span></div>
                <div className="w-full bg-gray-800 rounded-full h-2"><div className="bg-[#00ff88] h-2 rounded-full" style={{ width: '70%' }} /></div>
                <div className="flex justify-between"><span className="text-gray-500 text-sm">Bonus Pool</span><span className="text-yellow-400 font-mono">20%</span></div>
                <div className="flex justify-between"><span className="text-gray-500 text-sm">Treasury</span><span className="text-blue-400 font-mono">5%</span></div>
                <div className="flex justify-between"><span className="text-gray-500 text-sm">Stakers</span><span className="text-purple-400 font-mono">5%</span></div>
              </div>
            </div>

            <div className="bg-[#111] border border-[#00ff88]/20 rounded-xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#00ff88]" /> Requirements
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2 text-gray-400"><Check className="w-4 h-4 text-[#00ff88]" />VPS or dedicated server</li>
                <li className="flex items-center gap-2 text-gray-400"><Check className="w-4 h-4 text-[#00ff88]" />2GB+ RAM recommended</li>
                <li className="flex items-center gap-2 text-gray-400"><Check className="w-4 h-4 text-[#00ff88]" />Docker or Node.js 18+</li>
                <li className="flex items-center gap-2 text-gray-400"><Check className="w-4 h-4 text-[#00ff88]" />Port 8545 open</li>
              </ul>
            </div>

            <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Smart Contract</h3>
              <a href={`https://solscan.io/account/${WHISTLE_PROGRAM_ID}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#00ff88] hover:underline text-sm font-mono">
                {WHISTLE_PROGRAM_ID.slice(0, 8)}...{WHISTLE_PROGRAM_ID.slice(-8)} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-800 py-8 mt-12">
        <p className="text-center text-gray-500 text-sm font-mono">
          WHISTLE Provider Dashboard • Powered by <span className="text-[#00ff88]">whistle.ninja</span>
        </p>
      </footer>
    </div>
  );
}
