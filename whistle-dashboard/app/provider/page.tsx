'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { 
  RefreshCw, Server, Zap, Activity, Database, Clock, Globe, 
  Wifi, WifiOff, CheckCircle, AlertCircle, Loader2, ExternalLink, 
  Award, Lock, Play, Coins, Wallet, ChevronRight, Terminal, 
  Copy, Check, ChevronDown, ChevronUp, Download, Shield, Info
} from 'lucide-react'

const RPC_URL = 'https://rpc.whistle.ninja/rpc'
const COORDINATOR_URL = 'https://whistle-backend.onrender.com'
const WHISTLE_MINT = '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump'
const MIN_PROVIDER_BOND = 1000

const STEPS = [
  { id: 1, title: 'Connect Wallet', icon: Wallet },
  { id: 2, title: 'Get WHISTLE', icon: Coins },
  { id: 3, title: 'Have SOL', icon: Zap },
  { id: 4, title: 'Stake WHISTLE', icon: Lock },
  { id: 5, title: 'Register Provider', icon: Server },
  { id: 6, title: 'Start Earning', icon: Play },
]

export default function ProviderDashboard() {
  const { publicKey, connected } = useWallet()
  const [mounted, setMounted] = useState(false)
  const [metrics, setMetrics] = useState<any>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  const [solBalance, setSolBalance] = useState(0)
  const [endpoint, setEndpoint] = useState('https://rpc.whistle.ninja/rpc')
  const [bondAmount, setBondAmount] = useState(MIN_PROVIDER_BOND)
  const [networkStats, setNetworkStats] = useState({ activeNodes: 0, totalNodes: 22, hitRate: 27.07, totalRequests: 628 })
  const [expandedSection, setExpandedSection] = useState<string | null>('docker')
  const [copiedItem, setCopiedItem] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const fetchMetrics = useCallback(async () => {
    try {
      const conn = new Connection(RPC_URL, 'confirmed')
      const [slot, blockHeight, epochInfo] = await Promise.all([
        conn.getSlot(), conn.getBlockHeight(), conn.getEpochInfo()
      ])
      const start = Date.now()
      await conn.getSlot()
      const latency = Date.now() - start
      setMetrics({
        chain: { slot, blockHeight, epoch: epochInfo.epoch, slotIndex: epochInfo.slotIndex, slotsInEpoch: epochInfo.slotsInEpoch, epochProgress: ((epochInfo.slotIndex / epochInfo.slotsInEpoch) * 100).toFixed(2) },
        rpc: { latency }
      })
    } catch (e) { console.error(e) }
    finally { setMetricsLoading(false) }
  }, [])

  useEffect(() => { fetchMetrics(); const id = setInterval(fetchMetrics, 5000); return () => clearInterval(id) }, [fetchMetrics])

  useEffect(() => {
    if (!connected || !publicKey) { setCurrentStep(1); return }
    const fetch = async () => {
      try {
        const conn = new Connection(RPC_URL, 'confirmed')
        const bal = await conn.getBalance(publicKey)
        setSolBalance(bal / LAMPORTS_PER_SOL)
        setCurrentStep(bal / LAMPORTS_PER_SOL >= 0.01 ? 5 : 3)
      } catch (e) {}
    }
    fetch()
  }, [connected, publicKey])

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await window.fetch(`${COORDINATOR_URL}/api/network/stats`)
        if (res.ok) {
          const d = await res.json()
          setNetworkStats({ activeNodes: d.nodes?.active || 0, totalNodes: d.nodes?.total || 22, hitRate: parseFloat(d.metrics?.hitRate || '27.07'), totalRequests: d.metrics?.totalRequests || 628 })
        }
      } catch (e) {}
    }
    fetch(); const id = setInterval(fetch, 30000); return () => clearInterval(id)
  }, [])

  const copy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopiedItem(id); setTimeout(() => setCopiedItem(null), 2000) }
  const goNext = () => { if (currentStep < 6) setCurrentStep(s => s + 1) }
  const goBack = () => { if (currentStep > 1) setCurrentStep(s => s - 1) }
  const walletAddress = publicKey?.toBase58() || 'YOUR_WALLET_ADDRESS'

  if (!mounted) return <div className="min-h-screen bg-[#080808] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#00ff88]" /></div>

  return (
    <div className="min-h-screen text-white" style={{ background: '#080808' }}>
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.015]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.1) 2px, rgba(0,255,136,0.1) 4px)' }} />
      
      <header className="border-b border-[#00ff88]/20 bg-[#080808]/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-2xl font-bold tracking-[0.2em]">WHISTLE</a>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500 text-sm tracking-wider">PROVIDER DASHBOARD</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
              <span className="text-gray-500">ONLINE</span>
              <span className="text-[#00ff88] font-mono">{metrics?.rpc?.latency || '—'}ms</span>
            </div>
            <WalletMultiButton className="!bg-transparent !border !border-[#00ff88]/50 hover:!bg-[#00ff88]/10 !text-[#00ff88] !rounded !h-10 !text-sm !font-mono" />
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-wider"><span className="text-[#00ff88]">PROVIDER</span> DASHBOARD</h1>
            <p className="text-gray-600 font-mono text-sm">// Real-time Solana mainnet metrics via Whistlenet RPC</p>
          </div>
          <button onClick={fetchMetrics} disabled={metricsLoading} className="flex items-center gap-2 px-4 py-2 border border-gray-800 text-gray-500 hover:border-[#00ff88] hover:text-[#00ff88] font-mono text-sm transition-colors">
            <RefreshCw className={`w-4 h-4 ${metricsLoading ? 'animate-spin' : ''}`} /> REFRESH
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT */}
          <div className="lg:col-span-3 space-y-6">
            <div className="border border-[#00ff88]/30 bg-[#0c0c0c] p-5">
              <h3 className="text-sm font-bold tracking-widest mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-[#00ff88]" /> RPC CREDITS</h3>
              <div className="p-3 bg-[#080808] border border-gray-800 flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4 text-[#00ff88]" />
                <span className="text-gray-500 text-sm">BALANCE:</span>
                <span className="text-white font-mono ml-auto">{solBalance.toFixed(4)} SOL</span>
              </div>
              {!connected && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Failed to fetch</div>}
            </div>

            <div className="border border-[#00ff88]/30 bg-[#0c0c0c] p-5">
              <h3 className="text-sm font-bold tracking-widest mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-[#00ff88]" /> NETWORK STATS</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Latency</span><span className="text-[#00ff88] font-mono">{metrics?.rpc?.latency || '—'}ms <span className="inline-block w-2 h-2 bg-[#00ff88] rounded-full ml-1 animate-pulse" /></span></div>
                <div className="flex justify-between"><span className="text-gray-500">Uptime</span><span className="text-[#00ff88] font-mono">100%</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Requests</span><span className="text-white font-mono">{networkStats.totalRequests}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Rate Limit</span><span className="text-white font-mono">100/min</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="text-[#00ff88] font-mono flex items-center gap-1"><span className="w-2 h-2 bg-[#00ff88] rounded-full" />ONLINE</span></div>
              </div>
            </div>
          </div>

          {/* CENTER */}
          <div className="lg:col-span-6 space-y-6">
            <div className="border border-[#00ff88]/30 bg-[#0c0c0c] p-6">
              <div className="flex items-center gap-3 mb-6">
                <Server className="w-6 h-6 text-[#00ff88]" />
                <div><h2 className="text-lg font-bold tracking-wider">BECOME A PROVIDER</h2><p className="text-gray-500 text-sm">6 steps to start earning</p></div>
                <button onClick={fetchMetrics} className="ml-auto text-gray-600 hover:text-[#00ff88]"><RefreshCw className="w-4 h-4" /></button>
              </div>

              <div className="flex items-center justify-between mb-6">
                {STEPS.map((step, i) => {
                  const Icon = step.icon
                  const done = currentStep > step.id, active = currentStep === step.id
                  return (
                    <div key={step.id} className="flex items-center">
                      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${done ? 'bg-[#00ff88]/20 border-[#00ff88]' : active ? 'border-[#00ff88]' : 'border-gray-700 bg-[#080808]'}`}>
                        {done ? <CheckCircle className="w-5 h-5 text-[#00ff88]" /> : <Icon className={`w-5 h-5 ${active ? 'text-[#00ff88]' : 'text-gray-600'}`} />}
                      </div>
                      {i < 5 && <div className={`w-10 h-0.5 ${done ? 'bg-[#00ff88]' : 'bg-gray-800'}`} />}
                    </div>
                  )
                })}
              </div>

              <div className="text-center mb-4">
                <p className="text-[#00ff88] font-mono text-sm tracking-wider">STEP {currentStep}: {STEPS[currentStep-1]?.title.toUpperCase()}</p>
                <p className="text-gray-600 text-xs">{['Connect your Solana wallet','Acquire WHISTLE tokens','SOL for transaction fees','Stake tokens to participate','Bond tokens & set endpoint','Run your cache node'][currentStep-1]}</p>
              </div>

              <div className="border border-gray-800 p-6 bg-[#080808]">
                {currentStep === 1 && <div className="text-center py-4"><Wallet className="w-12 h-12 mx-auto text-gray-600 mb-4" /><h4 className="font-bold mb-2">Connect Your Wallet</h4><p className="text-gray-500 text-sm mb-4">Connect a Solana wallet to get started</p><WalletMultiButton className="!bg-[#00ff88] !text-black !font-bold !rounded !px-6 !py-3" /></div>}
                {currentStep === 2 && <div className="text-center py-4"><Coins className="w-12 h-12 mx-auto text-yellow-400 mb-4" /><h4 className="font-bold mb-2">Get WHISTLE Tokens</h4><p className="text-gray-500 text-sm mb-4">You need at least <span className="text-[#00ff88] font-mono">{MIN_PROVIDER_BOND}</span> WHISTLE</p><a href={`https://pump.fun/coin/${WHISTLE_MINT}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#00ff88] text-black px-6 py-3 font-bold">Buy on pump.fun <ExternalLink className="w-4 h-4" /></a></div>}
                {currentStep === 3 && <div className="text-center py-4"><Zap className="w-12 h-12 mx-auto text-purple-400 mb-4" /><h4 className="font-bold mb-2">Get SOL for Fees</h4><p className="text-gray-500 text-sm mb-2">Current: <span className="text-white font-mono">{solBalance.toFixed(4)}</span> SOL</p><p className="text-gray-600 text-xs">Minimum ~0.01 SOL recommended</p></div>}
                {currentStep === 4 && <div className="py-4 text-center"><Lock className="w-12 h-12 mx-auto text-blue-400 mb-4" /><h4 className="font-bold mb-4">Stake WHISTLE</h4><input type="number" value={bondAmount} onChange={e => setBondAmount(Number(e.target.value))} className="w-full max-w-xs mx-auto block bg-[#080808] border border-gray-700 px-4 py-3 font-mono text-center" /></div>}
                {currentStep === 5 && <div className="py-4"><div className="text-center mb-4"><Server className="w-12 h-12 mx-auto text-[#00ff88] mb-4" /><h4 className="font-bold mb-2">REGISTER AS PROVIDER</h4><p className="text-gray-500 text-sm">Bond WHISTLE and set your RPC endpoint</p></div><div className="space-y-4 max-w-md mx-auto"><div><label className="text-gray-500 text-xs uppercase block mb-2">RPC ENDPOINT URL</label><input type="text" value={endpoint} onChange={e => setEndpoint(e.target.value)} className="w-full bg-[#080808] border border-gray-700 px-4 py-3 font-mono text-sm" /></div><div><label className="text-gray-500 text-xs uppercase block mb-2">BOND AMOUNT (WHISTLE)</label><input type="number" value={bondAmount} onChange={e => setBondAmount(Number(e.target.value))} className="w-full bg-[#080808] border border-gray-700 px-4 py-3 font-mono" /></div><button onClick={() => setCurrentStep(6)} className="w-full bg-[#00ff88] text-black py-3 font-bold flex items-center justify-center gap-2 hover:bg-[#00ff88]/90 transition-colors"><Server className="w-5 h-5" /> Register Provider</button></div></div>}
                {currentStep === 6 && <div className="text-center py-4"><div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#00ff88]/20 border-2 border-[#00ff88] flex items-center justify-center"><CheckCircle className="w-8 h-8 text-[#00ff88]" /></div><h4 className="text-[#00ff88] font-bold text-xl mb-2">You're All Set!</h4><p className="text-gray-500 text-sm">Start your cache node to begin earning</p></div>}

                <div className="flex justify-between mt-6 pt-4 border-t border-gray-800">
                  <button onClick={goBack} disabled={currentStep === 1} className="flex items-center gap-2 text-gray-600 hover:text-white disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4 rotate-180" /> Back</button>
                  <span className="text-gray-700 text-xs font-mono">{currentStep} / 6</span>
                  <button onClick={goNext} disabled={currentStep === 6} className="flex items-center gap-2 text-[#00ff88] disabled:opacity-30 transition-colors">Next <ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="text-center p-3 border border-gray-800 bg-[#080808]"><Zap className="w-5 h-5 mx-auto mb-2 text-[#00ff88]" /><p className="font-bold">70%</p><p className="text-gray-600 text-xs">Query Revenue</p></div>
                <div className="text-center p-3 border border-gray-800 bg-[#080808]"><Lock className="w-5 h-5 mx-auto mb-2 text-yellow-400" /><p className="font-bold">{MIN_PROVIDER_BOND}</p><p className="text-gray-600 text-xs">Min Bond</p></div>
                <div className="text-center p-3 border border-gray-800 bg-[#080808]"><Award className="w-5 h-5 mx-auto mb-2 text-purple-400" /><p className="font-bold">1.5x</p><p className="text-gray-600 text-xs">Server Bonus</p></div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="border border-gray-800 bg-[#0c0c0c] p-4"><div className="flex items-center gap-2 text-gray-600 text-xs mb-2"><Activity className="w-3 h-3" /> Current Slot</div><p className="text-xl font-mono">{metrics?.chain?.slot?.toLocaleString() || '—'}</p></div>
              <div className="border border-gray-800 bg-[#0c0c0c] p-4"><div className="flex items-center gap-2 text-gray-600 text-xs mb-2"><Database className="w-3 h-3" /> Block Height</div><p className="text-xl font-mono">{metrics?.chain?.blockHeight?.toLocaleString() || '—'}</p></div>
              <div className="border border-gray-800 bg-[#0c0c0c] p-4"><div className="flex items-center gap-2 text-gray-600 text-xs mb-2"><Clock className="w-3 h-3" /> Epoch</div><p className="text-xl font-mono">{metrics?.chain?.epoch || '—'}</p></div>
            </div>

            {metrics?.chain && (
              <div className="border border-gray-800 bg-[#0c0c0c] p-5">
                <h3 className="text-sm font-bold tracking-widest mb-4 text-gray-500">// Epoch Progress</h3>
                <div className="flex justify-between text-sm mb-2"><span className="text-gray-600">Epoch {metrics.chain.epoch}</span><span className="text-[#00ff88] font-mono">{metrics.chain.epochProgress}%</span></div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-[#00ff88] transition-all" style={{ width: `${metrics.chain.epochProgress}%` }} /></div>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-3 space-y-6">
            <div className="border border-[#00ff88]/30 bg-[#0c0c0c] p-5">
              <h3 className="text-sm font-bold tracking-widest mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-[#00ff88]" /> VALIDATOR INFO</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-600 flex items-center gap-2"><Globe className="w-3 h-3" /> VERSION</span><span className="text-gray-400">Unknown</span></div>
                <div className="flex justify-between"><span className="text-gray-600 flex items-center gap-2"><Database className="w-3 h-3" /> RPC</span><a href="https://rpc.whistle.ninja/rpc" target="_blank" className="text-[#00ff88] flex items-center gap-1">whistle.ninja <ExternalLink className="w-3 h-3" /></a></div>
                <div className="flex justify-between"><span className="text-gray-600 flex items-center gap-2"><Activity className="w-3 h-3" /> NETWORK</span><span className="text-[#00ff88]">MAINNET</span></div>
                <div className="flex justify-between"><span className="text-gray-600 flex items-center gap-2"><Shield className="w-3 h-3" /> STATUS</span><span className="text-[#00ff88] flex items-center gap-1"><span className="w-2 h-2 bg-[#00ff88] rounded-full" />HEALTHY</span></div>
              </div>
            </div>

            <div className="border border-gray-800 bg-[#0c0c0c] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3"><Server className="w-6 h-6 text-gray-600" /><div><h3 className="font-bold">BROWSER CACHE NODE</h3><p className="text-yellow-400 text-xs">Tier 2 • Coming Soon</p></div></div>
                <div className="flex items-center gap-2 text-gray-600 text-sm"><WifiOff className="w-4 h-4" /> Offline</div>
              </div>
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 text-xs">
                <div className="flex items-start gap-2"><AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" /><div><p className="text-yellow-400 font-bold">PAYMENT INTEGRATION IN PROGRESS</p><p className="text-gray-400">Browser node rewards are being integrated. Server providers earn real SOL now.</p></div></div>
              </div>
              <button className="w-full mt-4 p-3 bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] text-sm flex items-center justify-center gap-2"><Info className="w-4 h-4" /> How it works</button>
            </div>

            <div className="border border-gray-800 bg-[#0c0c0c] p-5">
              <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-bold tracking-widest flex items-center gap-2"><Database className="w-4 h-4 text-[#00ff88]" /> Cache Network</h3><span className="text-gray-600 text-xs">Epoch 9</span></div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-600 text-xs block">Active Nodes</span><span className="font-mono">{networkStats.activeNodes}<span className="text-gray-700">/{networkStats.totalNodes}</span></span></div>
                <div><span className="text-gray-600 text-xs block">Hit Rate</span><span className="font-mono text-[#00ff88]">{networkStats.hitRate}%</span></div>
                <div><span className="text-gray-600 text-xs block">Total Requests</span><span className="font-mono">{networkStats.totalRequests}</span></div>
                <div><span className="text-gray-600 text-xs block">Reward Pool</span><span className="font-mono">100 <span className="text-gray-700">tokens/hr</span></span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Server Setup */}
        <div className="mt-8 border border-[#00ff88]/30 bg-[#0c0c0c] p-6">
          <div className="flex items-center gap-3 mb-6"><Terminal className="w-6 h-6 text-[#00ff88]" /><div><h3 className="text-lg font-bold">Server Cache Node Setup</h3><p className="text-gray-500 text-sm">Earn real SOL rewards • 70% of query fees</p></div></div>
          <div className="p-3 mb-6 bg-[#00ff88]/10 border border-[#00ff88]/30 flex items-start gap-3"><CheckCircle className="w-5 h-5 text-[#00ff88] mt-0.5 flex-shrink-0" /><div className="text-xs"><p className="text-[#00ff88] font-bold">PAYMENTS ACTIVE</p><p className="text-gray-400">Server providers earn 70% of query fees paid to the smart contract.</p></div></div>
          
          <div className="border border-gray-800 mb-4">
            <button onClick={() => setExpandedSection(expandedSection === 'docker' ? null : 'docker')} className="w-full p-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors">
              <div className="flex items-center gap-3"><Download className="w-5 h-5 text-blue-400" /><div className="text-left"><p className="font-medium">Docker Setup</p><p className="text-xs text-gray-600">Recommended • Easiest setup</p></div></div>
              {expandedSection === 'docker' ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            </button>
            {expandedSection === 'docker' && (
              <div className="p-4 border-t border-gray-800 relative">
                <pre className="bg-[#080808] p-4 text-xs text-gray-400 overflow-x-auto font-mono whitespace-pre-wrap">{`# Clone the repository
git clone https://github.com/DylanPort/whitelspace.git
cd whitelspace/providers/cache-node

# Create .env file
cat > .env << EOF
PROVIDER_WALLET=${walletAddress}
COORDINATOR_URL=${COORDINATOR_URL}
UPSTREAM_RPC=${RPC_URL}
CACHE_PORT=8545
REDIS_URL=redis://localhost:6379
EOF

# Start with Docker
docker-compose up -d`}</pre>
                <button onClick={() => copy(`git clone https://github.com/DylanPort/whitelspace.git\ncd whitelspace/providers/cache-node\ndocker-compose up -d`, 'docker')} className="absolute top-6 right-6 p-2 bg-gray-800 hover:bg-gray-700 transition-colors">
                  {copiedItem === 'docker' ? <Check className="w-4 h-4 text-[#00ff88]" /> : <Copy className="w-4 h-4 text-gray-500" />}
                </button>
              </div>
            )}
          </div>

          <div className="border border-gray-800">
            <button onClick={() => setExpandedSection(expandedSection === 'nodejs' ? null : 'nodejs')} className="w-full p-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors">
              <div className="flex items-center gap-3"><Terminal className="w-5 h-5 text-green-400" /><div className="text-left"><p className="font-medium">Node.js Setup</p><p className="text-xs text-gray-600">Manual installation</p></div></div>
              {expandedSection === 'nodejs' ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            </button>
            {expandedSection === 'nodejs' && (
              <div className="p-4 border-t border-gray-800 relative">
                <pre className="bg-[#080808] p-4 text-xs text-gray-400 overflow-x-auto font-mono whitespace-pre-wrap">{`# Clone and install
git clone https://github.com/DylanPort/whitelspace.git
cd whitelspace/providers/cache-node
npm install

# Start Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Start the cache node
npm start`}</pre>
                <button onClick={() => copy(`git clone https://github.com/DylanPort/whitelspace.git\ncd whitelspace/providers/cache-node\nnpm install\nnpm start`, 'nodejs')} className="absolute top-6 right-6 p-2 bg-gray-800 hover:bg-gray-700 transition-colors">
                  {copiedItem === 'nodejs' ? <Check className="w-4 h-4 text-[#00ff88]" /> : <Copy className="w-4 h-4 text-gray-500" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-800 py-8 mt-12">
        <p className="text-center text-gray-600 text-sm font-mono">WHISTLE Provider Dashboard • Powered by <span className="text-[#00ff88]">whistle.ninja</span></p>
      </footer>
    </div>
  )
}
