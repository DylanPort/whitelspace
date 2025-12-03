'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  ChevronDown, 
  ChevronRight, 
  ExternalLink, 
  Copy, 
  Check,
  Book,
  Code,
  Server,
  Coins,
  Shield,
  Zap,
  Users,
  Database,
  Globe,
  Terminal,
  FileCode,
  Award,
  TrendingUp,
  AlertTriangle,
  Clock,
  Cpu,
  HardDrive,
  Wifi
} from 'lucide-react'

// Copy button component
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <button onClick={handleCopy} className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white transition-colors">
      {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
    </button>
  )
}

// Code block component
function CodeBlock({ code, language = 'bash' }) {
  return (
    <div className="relative bg-black/50 border border-gray-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900/50">
        <span className="text-xs text-gray-500 uppercase font-mono">{language}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono text-gray-300">
        <code>{code}</code>
      </pre>
    </div>
  )
}

// Collapsible section component
function Section({ title, icon: Icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  
  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-gray-900 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <Icon size={20} className="text-whistle-accent" />
          <span className="font-bold text-white">{title}</span>
        </div>
        {isOpen ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
      </button>
      {isOpen && (
        <div className="p-6 border-t border-gray-800 bg-whistle-darker/50">
          {children}
        </div>
      )}
    </div>
  )
}

// Table component
function Table({ headers, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            {headers.map((h, i) => (
              <th key={i} className="text-left py-3 px-4 text-gray-400 font-mono uppercase text-xs">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-900/30">
              {row.map((cell, j) => (
                <td key={j} className="py-3 px-4 text-gray-300 font-mono">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-whistle-darker">
      {/* Video Background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute w-full h-full object-cover opacity-30"
        >
          <source src="/bg-video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-whistle-accent hover:text-white transition-colors">
                ← Back to Dashboard
              </Link>
              <span className="text-gray-600">|</span>
              <div className="flex items-center gap-2">
                <Book size={20} className="text-whistle-accent" />
                <span className="text-white font-bold">Provider Documentation</span>
              </div>
            </div>
            <span className="text-xs text-gray-500 font-mono">v1.0.0</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            WHISTLE<span className="text-whistle-accent">NET</span> Provider Docs
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Complete technical documentation for running a provider node, understanding the smart contract, 
            and earning rewards on the decentralized RPC network.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-12">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Book size={20} className="text-whistle-accent" />
            Table of Contents
          </h2>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            {[
              '1. Overview & Architecture',
              '2. Smart Contract (WHTT)',
              '3. Contract Instructions',
              '4. Account Structures',
              '5. Provider Registration',
              '6. Cache Node Setup',
              '7. Coordinator System',
              '8. Reward Mechanics',
              '9. API Reference',
              '10. Troubleshooting',
              '11. Roadmap to Decentralization',
              '12. Security Considerations',
            ].map((item, i) => (
              <a key={i} href={`#section-${i + 1}`} className="text-gray-400 hover:text-whistle-accent transition-colors py-1">
                {item}
              </a>
            ))}
          </div>
        </div>

        {/* Section 1: Overview */}
        <section id="section-1" className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Globe size={24} className="text-whistle-accent" />
            1. Overview & Architecture
          </h2>
          
          <div className="prose prose-invert max-w-none mb-6">
            <p className="text-gray-300 leading-relaxed">
              Whistlenet is a decentralized RPC caching network for Solana. Providers run cache nodes that intercept 
              RPC requests, serve cached responses when possible, and earn SOL rewards based on their contribution 
              to the network.
            </p>
          </div>

          {/* Architecture Diagram */}
          <div className="bg-black/50 border border-gray-800 rounded-lg p-8 mb-6">
            <h3 className="text-center text-whistle-accent font-bold text-lg mb-8 tracking-wider">WHISTLENET ARCHITECTURE</h3>
            
            {/* Top Flow: Users → Cache Nodes → Upstream */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="border-2 border-blue-500/50 bg-blue-500/10 rounded-lg p-4 text-center min-w-[120px]">
                <Users size={24} className="mx-auto mb-2 text-blue-400" />
                <p className="text-white font-bold text-sm">Users</p>
                <p className="text-gray-500 text-xs">(dApps)</p>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-0.5 bg-gray-600"></div>
                <ChevronRight className="text-gray-500" size={20} />
              </div>
              <div className="border-2 border-whistle-accent/50 bg-whistle-accent/10 rounded-lg p-4 text-center min-w-[140px]">
                <Server size={24} className="mx-auto mb-2 text-whistle-accent" />
                <p className="text-white font-bold text-sm">Cache Nodes</p>
                <p className="text-gray-500 text-xs">(Providers)</p>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-0.5 bg-gray-600"></div>
                <ChevronRight className="text-gray-500" size={20} />
              </div>
              <div className="border-2 border-purple-500/50 bg-purple-500/10 rounded-lg p-4 text-center min-w-[140px]">
                <Globe size={24} className="mx-auto mb-2 text-purple-400" />
                <p className="text-white font-bold text-sm">Upstream RPC</p>
                <p className="text-gray-500 text-xs">(Validators)</p>
              </div>
            </div>

            {/* Arrow down to Coordinator */}
            <div className="flex flex-col items-center mb-6">
              <div className="h-8 w-0.5 bg-gray-600"></div>
              <p className="text-gray-500 text-xs my-2">Reports Metrics</p>
              <ChevronDown className="text-gray-500" size={20} />
            </div>

            {/* Coordinator */}
            <div className="flex justify-center mb-6">
              <div className="border-2 border-yellow-500/50 bg-yellow-500/10 rounded-lg p-4 text-center min-w-[160px]">
                <Database size={24} className="mx-auto mb-2 text-yellow-400" />
                <p className="text-white font-bold text-sm">Coordinator</p>
                <p className="text-gray-500 text-xs">(Off-chain)</p>
              </div>
            </div>

            {/* Arrow down to Blockchain */}
            <div className="flex flex-col items-center mb-6">
              <div className="h-8 w-0.5 bg-gray-600"></div>
              <p className="text-gray-500 text-xs my-2">Triggers Settlements</p>
              <ChevronDown className="text-gray-500" size={20} />
            </div>

            {/* Solana Blockchain */}
            <div className="border-2 border-green-500/30 bg-green-500/5 rounded-lg p-6">
              <h4 className="text-center text-green-400 font-bold text-sm mb-4 tracking-wider">SOLANA BLOCKCHAIN</h4>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <div className="border border-green-500/50 bg-green-500/10 rounded-lg p-3 text-center min-w-[120px]">
                  <FileCode size={20} className="mx-auto mb-2 text-green-400" />
                  <p className="text-white font-bold text-xs">WHTT Program</p>
                  <p className="text-gray-500 text-[10px] font-mono">whtt...</p>
                </div>
                <div className="border border-green-500/50 bg-green-500/10 rounded-lg p-3 text-center min-w-[120px]">
                  <Coins size={20} className="mx-auto mb-2 text-green-400" />
                  <p className="text-white font-bold text-xs">Token Vault</p>
                  <p className="text-gray-500 text-[10px]">(Provider Bonds)</p>
                </div>
                <div className="border border-green-500/50 bg-green-500/10 rounded-lg p-3 text-center min-w-[120px]">
                  <Zap size={20} className="mx-auto mb-2 text-green-400" />
                  <p className="text-white font-bold text-xs">Payment Vault</p>
                  <p className="text-gray-500 text-[10px]">(Query fees)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="p-4 border border-gray-800 rounded-lg">
              <h4 className="font-bold text-white mb-2">On-Chain Components</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• WHTT Smart Contract</li>
                <li>• Provider Registration</li>
                <li>• Token Bonding</li>
                <li>• Payment Distribution</li>
              </ul>
            </div>
            <div className="p-4 border border-gray-800 rounded-lg">
              <h4 className="font-bold text-white mb-2">Off-Chain Components</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Cache Nodes (Server/Browser)</li>
                <li>• Coordinator Service</li>
                <li>• Metrics Aggregation</li>
                <li>• Reward Calculation</li>
              </ul>
            </div>
            <div className="p-4 border border-gray-800 rounded-lg">
              <h4 className="font-bold text-white mb-2">Data Flow</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• RPC → Cache → Upstream</li>
                <li>• Metrics → Coordinator</li>
                <li>• Rewards → Blockchain</li>
                <li>• Claims → Provider Wallet</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 2: Smart Contract */}
        <section id="section-2" className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <FileCode size={24} className="text-whistle-accent" />
            2. Smart Contract (WHTT)
          </h2>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-yellow-500 mt-0.5" size={20} />
              <div>
                <p className="text-yellow-400 font-medium">Mainnet Deployment</p>
                <p className="text-yellow-400/70 text-sm">The WHTT contract is deployed on Solana mainnet and handles real value.</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-4">Contract Addresses</h3>
            <Table 
              headers={['Account', 'Address', 'Purpose']}
              rows={[
                ['Program ID', 'whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr', 'Main contract'],
                ['WHISTLE Token', '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump', 'SPL Token mint'],
                ['Token Vault', '6AP8c7sCQsm2FMvNJw6fQN5PnMdkySH75h7EPE2kD3Yq', 'Provider bonds'],
                ['Payment Vault', 'CU1ZcHccCbQT8iA6pcb3ZyTjog8ckmDHH8gaAmKfC73G', 'Query fees'],
                ['Authority', '6BNdVMgx2JZJPvkRCLyV2LLxft4S1cwuqoX2BS9eFyvh', 'Vault authority'],
                ['X402 Wallet', 'BMiSBoT5aPCrFcxaTrHuzXMkfrtzCLMcDYqrPTVymNbU', 'Payment processing'],
              ]}
            />
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-4">Token Economics</h3>
            <Table 
              headers={['Parameter', 'Value', 'Description']}
              rows={[
                ['Token Decimals', '6', 'WHISTLE uses 6 decimal places'],
                ['Min Provider Bond', '1,000 WHISTLE', 'Minimum stake to register'],
                ['Query Cost', '0.00001 SOL', '10,000 lamports per query'],
                ['Provider Share', '70%', 'Of query fees to provider'],
                ['Staker Share', '20%', 'To staking pool'],
                ['Treasury Share', '5%', 'Protocol treasury'],
                ['Bonus Pool', '5%', 'Performance bonuses'],
              ]}
            />
          </div>
        </section>

        {/* Section 3: Contract Instructions */}
        <section id="section-3" className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Code size={24} className="text-whistle-accent" />
            3. Contract Instructions
          </h2>

          <p className="text-gray-400 mb-6">
            The WHTT contract supports 31 instructions. Here are the most relevant for providers:
          </p>

          <Section title="Provider Instructions" icon={Server} defaultOpen>
            <Table 
              headers={['ID', 'Instruction', 'Description', 'Parameters']}
              rows={[
                ['9', 'RegisterProvider', 'Register as a provider with bond', 'endpoint: String, bond: u64'],
                ['10', 'DeregisterProvider', 'Exit and reclaim bond', 'None'],
                ['11', 'UpdateEndpoint', 'Change RPC endpoint URL', 'new_endpoint: String'],
                ['12', 'RecordHeartbeat', 'Prove node is alive', 'None'],
                ['17', 'ClaimProviderEarnings', 'Withdraw accumulated SOL', 'None'],
              ]}
            />
            
            <div className="mt-4">
              <h4 className="font-bold text-white mb-2">RegisterProvider Example</h4>
              <CodeBlock language="javascript" code={`// Build RegisterProvider instruction
const instructionData = new Uint8Array(1 + 4 + endpointBytes.length + 8);
instructionData[0] = 9; // Instruction discriminator
// 4 bytes: endpoint length (little-endian)
// N bytes: endpoint string
// 8 bytes: bond amount in lamports (little-endian)

const registerIx = new TransactionInstruction({
  programId: WHISTLE_PROGRAM_ID,
  keys: [
    { pubkey: provider, isSigner: true, isWritable: true },
    { pubkey: providerAccountPDA, isSigner: false, isWritable: true },
    { pubkey: providerTokenAccount, isSigner: false, isWritable: true },
    { pubkey: tokenVault, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
  ],
  data: Buffer.from(instructionData),
});`} />
            </div>
          </Section>

          <Section title="Staking Instructions" icon={Coins}>
            <Table 
              headers={['ID', 'Instruction', 'Description', 'Parameters']}
              rows={[
                ['1', 'Stake', 'Stake WHISTLE tokens', 'amount: u64'],
                ['2', 'Unstake', 'Withdraw staked tokens', 'amount: u64'],
                ['20', 'ClaimStakerRewards', 'Claim accumulated rewards', 'None'],
              ]}
            />
          </Section>

          <Section title="Payment Instructions" icon={Zap}>
            <Table 
              headers={['ID', 'Instruction', 'Description', 'Parameters']}
              rows={[
                ['16', 'ProcessQueryPayment', 'Pay for RPC query', 'provider: Pubkey, cost: u64'],
                ['18', 'DistributeBonusPool', 'Distribute bonus to top providers', 'None'],
                ['19', 'DistributeStakerRewards', 'Distribute to stakers', 'None'],
              ]}
            />
          </Section>
        </section>

        {/* Section 4: Account Structures */}
        <section id="section-4" className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Database size={24} className="text-whistle-accent" />
            4. Account Structures
          </h2>

          <Section title="ProviderAccount" icon={Server} defaultOpen>
            <CodeBlock language="rust" code={`pub struct ProviderAccount {
    pub provider: Pubkey,           // 32 bytes - Provider wallet
    pub endpoint: String,           // Variable - RPC endpoint URL
    pub registered_at: i64,         // 8 bytes - Unix timestamp
    pub is_active: bool,            // 1 byte - Active status
    pub stake_bond: u64,            // 8 bytes - Bonded WHISTLE
    pub total_earned: u64,          // 8 bytes - Lifetime SOL earned
    pub pending_earnings: u64,      // 8 bytes - Claimable SOL
    pub queries_served: u64,        // 8 bytes - Total queries
    pub reputation_score: u64,      // 8 bytes - Quality score
    pub uptime_percentage: u64,     // 8 bytes - Uptime (basis points)
    pub response_time_avg: u64,     // 8 bytes - Avg latency (ms)
    pub accuracy_score: u64,        // 8 bytes - Accuracy (basis points)
    pub last_heartbeat: i64,        // 8 bytes - Last heartbeat time
}`} />
            <p className="text-gray-400 text-sm mt-4">
              <strong>PDA Derivation:</strong> <code className="bg-gray-800 px-2 py-1 rounded">["provider", provider_pubkey]</code>
            </p>
          </Section>

          <Section title="StakerAccount" icon={Coins}>
            <CodeBlock language="rust" code={`pub struct StakerAccount {
    pub staker: Pubkey,             // 32 bytes - Staker wallet
    pub staked_amount: u64,         // 8 bytes - Staked WHISTLE
    pub access_tokens: u64,         // 8 bytes - Access token balance
    pub last_stake_time: i64,       // 8 bytes - Last stake timestamp
    pub node_operator: bool,        // 1 byte - Is node operator
    pub voting_power: u64,          // 8 bytes - Governance weight
    pub data_encrypted: u64,        // 8 bytes - Encrypted bytes
    pub pending_rewards: u64,       // 8 bytes - Claimable rewards
}`} />
            <p className="text-gray-400 text-sm mt-4">
              <strong>PDA Derivation:</strong> <code className="bg-gray-800 px-2 py-1 rounded">["staker", staker_pubkey]</code>
            </p>
          </Section>

          <Section title="PaymentVault" icon={Shield}>
            <CodeBlock language="rust" code={`pub struct PaymentVault {
    pub authority: Pubkey,          // 32 bytes - Vault authority
    pub total_collected: u64,       // 8 bytes - Total SOL collected
    pub provider_pool: u64,         // 8 bytes - For providers (70%)
    pub bonus_pool: u64,            // 8 bytes - For bonuses (5%)
    pub treasury: u64,              // 8 bytes - Protocol (5%)
    pub staker_rewards_pool: u64,   // 8 bytes - For stakers (20%)
    pub developer_rebate_pool: u64, // 8 bytes - Developer rebates
    pub last_distribution: i64,     // 8 bytes - Last payout time
}`} />
          </Section>
        </section>

        {/* Section 5: Provider Registration */}
        <section id="section-5" className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Users size={24} className="text-whistle-accent" />
            5. Provider Registration
          </h2>

          <div className="bg-whistle-accent/10 border border-whistle-accent/30 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-whistle-accent mb-4">6-Step Registration Process</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { step: 1, title: 'Connect Wallet', desc: 'Connect your Solana wallet (Phantom, Solflare, etc.)' },
                { step: 2, title: 'Get WHISTLE', desc: 'Acquire at least 1,000 WHISTLE tokens' },
                { step: 3, title: 'Have SOL', desc: 'Need ~0.01 SOL for transaction fees' },
                { step: 4, title: 'Stake WHISTLE', desc: 'Stake tokens to participate in network' },
                { step: 5, title: 'Register Provider', desc: 'Bond 1,000 WHISTLE and set endpoint' },
                { step: 6, title: 'Start Earning', desc: 'Run your cache node and earn SOL' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3 p-3 bg-black/30 rounded-lg">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-whistle-accent text-black font-bold text-sm">
                    {item.step}
                  </span>
                  <div>
                    <p className="text-white font-medium">{item.title}</p>
                    <p className="text-gray-400 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Section title="Requirements" icon={Shield} defaultOpen>
            <Table 
              headers={['Requirement', 'Minimum', 'Recommended']}
              rows={[
                ['WHISTLE Tokens', '1,000', '5,000+'],
                ['SOL for Fees', '0.01 SOL', '0.1 SOL'],
                ['RPC Endpoint', 'HTTPS URL', 'Custom domain + SSL'],
                ['Uptime', '90%', '99%+'],
              ]}
            />
          </Section>
        </section>

        {/* Section 6: Cache Node Setup */}
        <section id="section-6" className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Server size={24} className="text-whistle-accent" />
            6. Cache Node Setup
          </h2>

          <Section title="Server Node (Tier 1 - 1.5x Rewards)" icon={Cpu} defaultOpen>
            <h4 className="font-bold text-white mb-4">Hardware Requirements</h4>
            <Table 
              headers={['Component', 'Minimum', 'Recommended']}
              rows={[
                ['CPU', '1 vCPU', '2+ vCPU'],
                ['RAM', '1 GB', '4+ GB'],
                ['Storage', '10 GB SSD', '50+ GB NVMe'],
                ['Network', '100 Mbps', '1 Gbps'],
                ['Latency', '<100ms to users', '<50ms'],
              ]}
            />

            <h4 className="font-bold text-white mt-6 mb-4">Docker Deployment</h4>
            <CodeBlock language="bash" code={`# Clone the repository
git clone https://github.com/DylanPort/whitelspace.git
cd whitelspace/providers/cache-node

# Configure environment
cp env.example .env
nano .env  # Add your PROVIDER_WALLET

# Start with Docker
PROVIDER_WALLET=YourWalletAddress docker-compose up -d

# View logs
docker logs -f whistle-cache

# Check metrics
curl http://localhost:8545/metrics`} />

            <h4 className="font-bold text-white mt-6 mb-4">Environment Variables</h4>
            <Table 
              headers={['Variable', 'Default', 'Description']}
              rows={[
                ['PORT', '8545', 'Cache node listen port'],
                ['UPSTREAM_RPC', 'https://mainnet.helius-rpc.com/?api-key=YOUR_KEY', 'Upstream Solana RPC (Helius)'],
                ['COORDINATOR_URL', 'https://whitelspace-1.onrender.com', 'Coordinator for metrics'],
                ['PROVIDER_WALLET', '(required)', 'Your Solana wallet'],
                ['ENABLE_HEARTBEAT', 'false', 'Enable on-chain heartbeats'],
                ['PROVIDER_KEYPAIR', '', 'Path to keypair for heartbeats'],
              ]}
            />
          </Section>

          <Section title="Browser Node (Tier 2 - 1.0x Rewards)" icon={Globe}>
            <p className="text-gray-300 mb-4">
              Browser nodes require no setup. Simply connect your wallet on the dashboard and click "Start Caching".
              The browser connects via WebSocket to the coordinator and contributes cache capacity.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <h5 className="font-bold text-green-400 mb-2">Advantages</h5>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Zero setup required</li>
                  <li>• Works from any browser</li>
                  <li>• Casual participation</li>
                </ul>
              </div>
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <h5 className="font-bold text-red-400 mb-2">Limitations</h5>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Lower rewards (1.0x vs 1.5x)</li>
                  <li>• Must keep tab open</li>
                  <li>• Limited cache size</li>
                </ul>
              </div>
            </div>
          </Section>

          <Section title="Cache TTL Configuration" icon={Clock}>
            <p className="text-gray-300 mb-4">
              Different RPC methods have different cache durations based on how frequently data changes:
            </p>
            <Table 
              headers={['Method', 'TTL', 'Reason']}
              rows={[
                ['getSlot', '400ms', 'Changes every slot (~400ms)'],
                ['getBalance', '2s', 'Account data changes'],
                ['getEpochInfo', '5s', 'Epoch changes slowly'],
                ['getAccountInfo', '2s', 'Account state'],
                ['getTransaction', '5 min', 'Immutable once confirmed'],
                ['getBlock', '1 hour', 'Immutable'],
                ['getGenesisHash', '24 hours', 'Never changes'],
              ]}
            />
            <p className="text-gray-400 text-sm mt-4">
              <strong>Never Cached:</strong> sendTransaction, simulateTransaction, requestAirdrop
            </p>
          </Section>
        </section>

        {/* Section 7: Coordinator System */}
        <section id="section-7" className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Wifi size={24} className="text-whistle-accent" />
            7. Coordinator System
          </h2>

          <div className="prose prose-invert max-w-none mb-6">
            <p className="text-gray-300">
              The coordinator is a centralized service that tracks cache nodes, aggregates metrics, and calculates rewards.
              It's designed to eventually become optional as more logic moves on-chain.
            </p>
          </div>

          <Section title="Coordinator Responsibilities" icon={Database} defaultOpen>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-whistle-accent">→</span>
                <span><strong>Node Registry:</strong> Tracks all active cache nodes (server + browser)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-whistle-accent">→</span>
                <span><strong>Metrics Collection:</strong> Receives reports every 30 seconds from nodes</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-whistle-accent">→</span>
                <span><strong>Reward Calculation:</strong> Computes work scores and distributes rewards</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-whistle-accent">→</span>
                <span><strong>WebSocket Gateway:</strong> Real-time connection for browser nodes</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-whistle-accent">→</span>
                <span><strong>API Endpoints:</strong> Dashboard data, leaderboards, statistics</span>
              </li>
            </ul>
          </Section>

          <Section title="Database Schema" icon={HardDrive}>
            <CodeBlock language="sql" code={`-- Core tables in coordinator SQLite database

-- Cache nodes registry
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  wallet TEXT NOT NULL,
  name TEXT,
  endpoint TEXT,
  node_type TEXT DEFAULT 'server',  -- 'server' or 'browser'
  tier INTEGER DEFAULT 1,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  total_requests INTEGER DEFAULT 0,
  total_hits INTEGER DEFAULT 0,
  total_bytes_saved INTEGER DEFAULT 0
);

-- Metrics reports from nodes
CREATE TABLE metrics_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  node_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  requests INTEGER,
  hits INTEGER,
  misses INTEGER,
  hit_rate REAL,
  avg_cache_latency REAL,
  avg_upstream_latency REAL,
  bytes_saved INTEGER
);

-- Reward calculations per epoch
CREATE TABLE rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  epoch INTEGER NOT NULL,
  node_id TEXT NOT NULL,
  wallet TEXT NOT NULL,
  work_score REAL NOT NULL,
  tier_multiplier REAL DEFAULT 1.0,
  reward_amount REAL NOT NULL,
  claimed INTEGER DEFAULT 0
);`} />
          </Section>
        </section>

        {/* Section 8: Reward Mechanics */}
        <section id="section-8" className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <TrendingUp size={24} className="text-whistle-accent" />
            8. Reward Mechanics
          </h2>

          <Section title="Reward Formula" icon={Award} defaultOpen>
            <div className="bg-black/50 p-6 rounded-lg border border-gray-800 mb-4">
              <h4 className="font-mono text-whistle-accent text-lg mb-4">Work Score Calculation</h4>
              <CodeBlock language="javascript" code={`// Work score formula
work_score = cache_hits + (bytes_saved * 0.000001)

// With multipliers
final_score = work_score * tier_multiplier * uptime_bonus

// Reward distribution
your_reward = (your_score / total_network_score) * hourly_reward_pool`} />
            </div>

            <Table 
              headers={['Tier', 'Node Type', 'Multiplier', 'Description']}
              rows={[
                ['Tier 1', 'Server', '1.5x', '24/7 dedicated server'],
                ['Tier 2', 'Browser', '1.0x', 'Casual browser participation'],
              ]}
            />
          </Section>

          <Section title="Uptime Bonuses" icon={Clock}>
            <Table 
              headers={['Uptime', 'Bonus', 'Final Multiplier (Server)']}
              rows={[
                ['< 95%', '1.0x', '1.5x'],
                ['95-99%', '1.2x', '1.8x'],
                ['99%+', '1.5x', '2.25x'],
              ]}
            />
          </Section>

          <Section title="Revenue Split" icon={Coins}>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { pct: '70%', label: 'Provider', color: 'bg-green-500' },
                { pct: '20%', label: 'Stakers', color: 'bg-blue-500' },
                { pct: '5%', label: 'Treasury', color: 'bg-purple-500' },
                { pct: '5%', label: 'Bonus Pool', color: 'bg-yellow-500' },
              ].map((item, i) => (
                <div key={i} className="text-center p-4 border border-gray-800 rounded-lg">
                  <div className={`w-12 h-12 ${item.color} rounded-full mx-auto mb-3 flex items-center justify-center font-bold text-white`}>
                    {item.pct}
                  </div>
                  <p className="text-white font-medium">{item.label}</p>
                </div>
              ))}
            </div>
          </Section>
        </section>

        {/* Section 9: API Reference */}
        <section id="section-9" className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Terminal size={24} className="text-whistle-accent" />
            9. API Reference
          </h2>

          <Section title="Cache Node Endpoints" icon={Server} defaultOpen>
            <Table 
              headers={['Endpoint', 'Method', 'Description']}
              rows={[
                ['/', 'POST', 'RPC proxy - send Solana RPC requests'],
                ['/health', 'GET', 'Health check'],
                ['/metrics', 'GET', 'Cache metrics (JSON)'],
                ['/metrics/prometheus', 'GET', 'Prometheus format metrics'],
              ]}
            />
          </Section>

          <Section title="Coordinator Endpoints" icon={Wifi}>
            <Table 
              headers={['Endpoint', 'Method', 'Description']}
              rows={[
                ['/api/nodes', 'GET', 'List all registered nodes'],
                ['/api/nodes/report', 'POST', 'Submit node metrics'],
                ['/api/providers/:wallet', 'GET', 'Get provider info'],
                ['/api/providers/register', 'POST', 'Register provider (off-chain)'],
                ['/api/rewards/:wallet', 'GET', 'Get wallet rewards'],
                ['/api/leaderboard', 'GET', 'Get node leaderboard'],
                ['/api/leaderboard/onchain', 'GET', 'Get on-chain providers'],
                ['/api/stats', 'GET', 'Network statistics'],
                ['/ws', 'WS', 'WebSocket for browser nodes'],
              ]}
            />
          </Section>

          <Section title="WebSocket Protocol" icon={Globe}>
            <CodeBlock language="json" code={`// Client → Server: Register
{ "type": "register", "wallet": "...", "name": "Browser-abc123" }

// Server → Client: Registered
{ "type": "registered", "nodeId": "...", "tier": 2, "multiplier": 1.0 }

// Client → Server: Metrics
{ "type": "metrics", "requests": 100, "hits": 80, "misses": 20, "bytesSaved": 50000 }

// Client → Server: Ping
{ "type": "ping" }

// Server → Client: Pong
{ "type": "pong", "timestamp": 1700000000000 }`} />
          </Section>
        </section>

        {/* Section 10: Troubleshooting */}
        <section id="section-10" className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <AlertTriangle size={24} className="text-whistle-accent" />
            10. Troubleshooting
          </h2>

          <Section title="Common Issues" icon={AlertTriangle} defaultOpen>
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-red-400 mb-2">Registration fails with "BorshError"</h4>
                <p className="text-gray-400 text-sm mb-2">
                  The on-chain instruction format may not match the contract. Ensure you're using the latest contract integration code.
                </p>
                <CodeBlock language="bash" code={`# Check the contract version
solana account whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr`} />
              </div>

              <div>
                <h4 className="font-bold text-red-400 mb-2">Node not appearing in dashboard</h4>
                <ul className="text-gray-400 text-sm space-y-1">
                  <li>• Verify COORDINATOR_URL is correct</li>
                  <li>• Check network connectivity to coordinator</li>
                  <li>• Ensure PROVIDER_WALLET is set</li>
                  <li>• Check logs: <code className="bg-gray-800 px-2 py-1 rounded">docker logs whistle-cache</code></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-red-400 mb-2">Low cache hit rate</h4>
                <ul className="text-gray-400 text-sm space-y-1">
                  <li>• Some methods (sendTransaction) are never cached</li>
                  <li>• Hit rate depends on traffic patterns</li>
                  <li>• Expected: 30-70% for typical usage</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-red-400 mb-2">Wallet popup not appearing</h4>
                <ul className="text-gray-400 text-sm space-y-1">
                  <li>• Hard refresh browser: Ctrl+Shift+R</li>
                  <li>• Clear browser cache</li>
                  <li>• Try a different wallet (Phantom, Solflare)</li>
                  <li>• Check browser console for errors</li>
                </ul>
              </div>
            </div>
          </Section>
        </section>

        {/* Section 11: Roadmap */}
        <section id="section-11" className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <TrendingUp size={24} className="text-whistle-accent" />
            11. Roadmap to Decentralization
          </h2>

          <div className="prose prose-invert max-w-none mb-6">
            <p className="text-gray-300">
              Whistlenet is progressively decentralizing. Here's what's live and what's coming:
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 border border-green-500/30 bg-green-500/5 rounded-lg">
              <Check className="text-green-500 mt-1" size={20} />
              <div>
                <h4 className="font-bold text-green-400">Phase 1: Foundation (LIVE)</h4>
                <ul className="text-gray-400 text-sm mt-2 space-y-1">
                  <li>• On-chain provider registration with token bonding</li>
                  <li>• Smart contract for staking and rewards</li>
                  <li>• Coordinator for cache orchestration</li>
                  <li>• Real queries served through network</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 border border-yellow-500/30 bg-yellow-500/5 rounded-lg">
              <Clock className="text-yellow-500 mt-1" size={20} />
              <div>
                <h4 className="font-bold text-yellow-400">Phase 2: Multi-Provider (IN PROGRESS)</h4>
                <ul className="text-gray-400 text-sm mt-2 space-y-1">
                  <li>• Load balancing across multiple cache nodes</li>
                  <li>• Query verification and proof-of-work</li>
                  <li>• On-chain heartbeat verification</li>
                  <li>• Automated reward distribution</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 border border-gray-500/30 bg-gray-500/5 rounded-lg">
              <ChevronRight className="text-gray-500 mt-1" size={20} />
              <div>
                <h4 className="font-bold text-gray-400">Phase 3: Trustless (PLANNED)</h4>
                <ul className="text-gray-400 text-sm mt-2 space-y-1">
                  <li>• Remove coordinator dependency</li>
                  <li>• P2P node discovery</li>
                  <li>• On-chain query routing</li>
                  <li>• Slashing for bad actors</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 border border-gray-700/30 bg-gray-700/5 rounded-lg">
              <ChevronRight className="text-gray-600 mt-1" size={20} />
              <div>
                <h4 className="font-bold text-gray-500">Phase 4: Full Decentralization (FUTURE)</h4>
                <ul className="text-gray-500 text-sm mt-2 space-y-1">
                  <li>• DAO governance</li>
                  <li>• Protocol upgrades via voting</li>
                  <li>• Community-owned infrastructure</li>
                  <li>• No single point of failure</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-whistle-accent/10 border border-whistle-accent/30 rounded-lg">
            <p className="text-whistle-accent text-sm">
              <strong>Current Status:</strong> The coordinator is still a single point of coordination. 
              The goal is to make it optional—providers talking directly to each other, with the blockchain as the source of truth.
            </p>
          </div>
        </section>

        {/* Section 12: Security */}
        <section id="section-12" className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Shield size={24} className="text-whistle-accent" />
            12. Security Considerations
          </h2>

          <Section title="Smart Contract Security" icon={FileCode} defaultOpen>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <Shield className="text-green-400 mt-0.5" size={16} />
                <span>Provider bonds are locked in a PDA-controlled vault</span>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="text-green-400 mt-0.5" size={16} />
                <span>Only the provider can claim their earnings</span>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="text-green-400 mt-0.5" size={16} />
                <span>Slashing mechanism for malicious behavior (planned)</span>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="text-green-400 mt-0.5" size={16} />
                <span>All instructions are permissioned appropriately</span>
              </li>
            </ul>
          </Section>

          <Section title="Operational Security" icon={AlertTriangle}>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <AlertTriangle className="text-yellow-400 mt-0.5" size={16} />
                <span>Never share your private keypair</span>
              </li>
              <li className="flex items-start gap-3">
                <AlertTriangle className="text-yellow-400 mt-0.5" size={16} />
                <span>Use HTTPS for all public endpoints</span>
              </li>
              <li className="flex items-start gap-3">
                <AlertTriangle className="text-yellow-400 mt-0.5" size={16} />
                <span>Monitor your node for unauthorized access</span>
              </li>
              <li className="flex items-start gap-3">
                <AlertTriangle className="text-yellow-400 mt-0.5" size={16} />
                <span>Keep your software updated</span>
              </li>
            </ul>
          </Section>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-800 pt-8 mt-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-gray-500 text-sm">
              WHISTLE Provider Documentation v1.0.0
            </div>
            <div className="flex items-center gap-4">
              <a href="https://whistle.ninja" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-whistle-accent transition-colors flex items-center gap-1">
                whistle.ninja <ExternalLink size={12} />
              </a>
              <a href="https://github.com/DylanPort/whitelspace" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-whistle-accent transition-colors flex items-center gap-1">
                GitHub <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </footer>
      </main>
      </div>
    </div>
  )
}

