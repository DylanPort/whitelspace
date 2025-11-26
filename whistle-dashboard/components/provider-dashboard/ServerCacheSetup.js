'use client'

import { useState } from 'react'
import { useWalletSafe } from '@/lib/provider-dashboard/useWalletSafe'
import { 
  Server, 
  Terminal, 
  Copy, 
  Check, 
  CheckCircle,
  ChevronDown, 
  ChevronUp,
  ExternalLink,
  Zap,
  Shield,
  Clock,
  Award,
  Download,
  Play,
  Settings,
  AlertCircle
} from 'lucide-react'

export function ServerCacheSetup() {
  const { publicKey, connected } = useWalletSafe()
  const [expandedSection, setExpandedSection] = useState('docker')
  const [copiedItem, setCopiedItem] = useState(null)
  
  const walletAddress = publicKey?.toBase58() || 'YOUR_WALLET_ADDRESS'
  const coordinatorUrl = process.env.NEXT_PUBLIC_COORDINATOR_URL || 'https://coordinator.whistle.ninja'
  
  const copyToClipboard = (text, itemId) => {
    navigator.clipboard.writeText(text)
    setCopiedItem(itemId)
    setTimeout(() => setCopiedItem(null), 2000)
  }

  const CopyButton = ({ text, itemId }) => (
    <button
      onClick={() => copyToClipboard(text, itemId)}
      className="p-1.5 hover:bg-gray-700 rounded transition-colors"
      title="Copy to clipboard"
    >
      {copiedItem === itemId ? (
        <Check size={14} className="text-whistle-green" />
      ) : (
        <Copy size={14} className="text-gray-400" />
      )}
    </button>
  )

  const CodeBlock = ({ code, itemId, language = 'bash' }) => (
    <div className="relative group">
      <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 overflow-x-auto text-sm font-mono text-gray-300">
        <code>{code}</code>
      </pre>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={code} itemId={itemId} />
      </div>
    </div>
  )

  // Docker Compose configuration
  const dockerCompose = `version: '3.8'
services:
  whistle-cache:
    image: whistlenet/cache-node:latest
    container_name: whistle-cache
    restart: unless-stopped
    ports:
      - "8545:8545"
    environment:
      - PROVIDER_WALLET=${walletAddress}
      - COORDINATOR_URL=${coordinatorUrl}
      - UPSTREAM_RPC=https://rpc.whistle.ninja/rpc
      - CACHE_PORT=8545
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    
  redis:
    image: redis:7-alpine
    container_name: whistle-redis
    restart: unless-stopped
    volumes:
      - redis_data:/data

volumes:
  redis_data:`

  // Manual Node.js setup
  const repoUrl = 'https://github.com/DylanPort/whitelspace.git'
  
  const nodeSetup = `# Clone the repository
git clone ${repoUrl}
cd whitelspace/providers/cache-node

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
PROVIDER_WALLET=${walletAddress}
COORDINATOR_URL=${coordinatorUrl}
UPSTREAM_RPC=https://rpc.whistle.ninja/rpc
CACHE_PORT=8545
REDIS_URL=redis://localhost:6379
EOF

# Start Redis (if not running)
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Start the cache node
npm start`

  // Systemd service file
  const systemdService = `[Unit]
Description=WHISTLE Cache Node
After=network.target redis.service

[Service]
Type=simple
User=whistle
WorkingDirectory=/opt/whistle-cache
Environment=NODE_ENV=production
Environment=PROVIDER_WALLET=${walletAddress}
Environment=COORDINATOR_URL=${coordinatorUrl}
Environment=UPSTREAM_RPC=https://rpc.whistle.ninja/rpc
Environment=CACHE_PORT=8545
Environment=REDIS_URL=redis://localhost:6379
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target`

  // Test command
  const testCommand = `# Test your cache node
curl -X POST http://localhost:8545 \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getSlot","params":[]}'`

  // Verify registration
  const verifyCommand = `# Check if your node is registered
curl "${coordinatorUrl}/api/nodes" | jq '.nodes[] | select(.wallet=="${walletAddress}")'`

  if (!connected) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gray-800 rounded-lg">
            <Server size={24} className="text-gray-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Server Cache Node Setup</h3>
            <p className="text-gray-400 text-sm">Earn real SOL rewards • 70% of query fees</p>
          </div>
        </div>
        <p className="text-gray-500 text-center py-4">
          Connect your wallet to see personalized setup instructions
        </p>
      </div>
    )
  }

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-whistle-accent/20 rounded-lg">
          <Server size={24} className="text-whistle-accent" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Server Cache Node Setup</h3>
          <p className="text-gray-400 text-sm">Tier 1 • Earn real SOL rewards • 24/7 uptime</p>
        </div>
      </div>

      {/* Active Payment Banner */}
      <div className="flex items-start gap-3 p-3 mb-6 bg-whistle-green/10 border border-whistle-green/30 rounded-lg">
        <CheckCircle size={18} className="text-whistle-green mt-0.5 flex-shrink-0" />
        <div className="text-xs">
          <p className="text-whistle-green font-bold uppercase tracking-wider mb-1">Payments Active</p>
          <p className="text-gray-400">
            Server providers earn 70% of query fees paid to the smart contract. 
            Register on-chain, run your node, and claim SOL rewards.
          </p>
        </div>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <Award size={20} className="mx-auto mb-2 text-whistle-green" />
          <p className="text-sm font-medium text-whistle-green">70%</p>
          <p className="text-xs text-gray-500">Query Revenue</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <Clock size={20} className="mx-auto mb-2 text-whistle-green" />
          <p className="text-sm font-medium text-white">+50%</p>
          <p className="text-xs text-gray-500">Uptime Bonus</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <Zap size={20} className="mx-auto mb-2 text-whistle-accent" />
          <p className="text-sm font-medium text-white">&lt;10ms</p>
          <p className="text-xs text-gray-500">Latency</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <Shield size={20} className="mx-auto mb-2 text-purple-400" />
          <p className="text-sm font-medium text-white">Redis</p>
          <p className="text-xs text-gray-500">Backed</p>
        </div>
      </div>

      {/* Your Wallet */}
      <div className="mb-6 p-4 bg-whistle-accent/10 border border-whistle-accent/30 rounded-lg">
        <p className="text-xs text-gray-400 mb-1">Your Provider Wallet</p>
        <div className="flex items-center justify-between">
          <code className="text-whistle-accent font-mono text-sm">{walletAddress}</code>
          <CopyButton text={walletAddress} itemId="wallet" />
        </div>
      </div>

      {/* Requirements */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <Settings size={16} />
          Requirements
        </h4>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-center gap-2">
            <Check size={14} className="text-whistle-green" />
            VPS or dedicated server (2GB+ RAM recommended)
          </li>
          <li className="flex items-center gap-2">
            <Check size={14} className="text-whistle-green" />
            Docker or Node.js 18+ installed
          </li>
          <li className="flex items-center gap-2">
            <Check size={14} className="text-whistle-green" />
            Port 8545 open (or custom port)
          </li>
          <li className="flex items-center gap-2">
            <Check size={14} className="text-whistle-green" />
            Stable internet connection
          </li>
        </ul>
      </div>

      {/* Setup Options */}
      <div className="space-y-3">
        {/* Docker Setup */}
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'docker' ? null : 'docker')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Download size={18} className="text-blue-400" />
              <div className="text-left">
                <p className="font-medium">Docker Setup</p>
                <p className="text-xs text-gray-500">Recommended • Easiest setup</p>
              </div>
            </div>
            {expandedSection === 'docker' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          {expandedSection === 'docker' && (
            <div className="p-4 border-t border-gray-800 space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-2">1. Create <code className="text-whistle-accent">docker-compose.yml</code>:</p>
                <CodeBlock code={dockerCompose} itemId="docker-compose" />
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-2">2. Start the cache node:</p>
                <CodeBlock code="docker-compose up -d" itemId="docker-start" />
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-2">3. Check logs:</p>
                <CodeBlock code="docker-compose logs -f whistle-cache" itemId="docker-logs" />
              </div>
            </div>
          )}
        </div>

        {/* Node.js Setup */}
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'nodejs' ? null : 'nodejs')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Terminal size={18} className="text-green-400" />
              <div className="text-left">
                <p className="font-medium">Node.js Setup</p>
                <p className="text-xs text-gray-500">Manual installation</p>
              </div>
            </div>
            {expandedSection === 'nodejs' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          {expandedSection === 'nodejs' && (
            <div className="p-4 border-t border-gray-800 space-y-4">
              <CodeBlock code={nodeSetup} itemId="node-setup" />
            </div>
          )}
        </div>

        {/* Systemd Setup */}
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'systemd' ? null : 'systemd')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Play size={18} className="text-purple-400" />
              <div className="text-left">
                <p className="font-medium">Systemd Service</p>
                <p className="text-xs text-gray-500">Auto-start on boot</p>
              </div>
            </div>
            {expandedSection === 'systemd' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          {expandedSection === 'systemd' && (
            <div className="p-4 border-t border-gray-800 space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-2">Create <code className="text-whistle-accent">/etc/systemd/system/whistle-cache.service</code>:</p>
                <CodeBlock code={systemdService} itemId="systemd" />
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-2">Enable and start:</p>
                <CodeBlock 
                  code={`sudo systemctl daemon-reload
sudo systemctl enable whistle-cache
sudo systemctl start whistle-cache
sudo systemctl status whistle-cache`} 
                  itemId="systemd-enable" 
                />
              </div>
            </div>
          )}
        </div>

        {/* Verify Setup */}
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'verify' ? null : 'verify')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Check size={18} className="text-whistle-green" />
              <div className="text-left">
                <p className="font-medium">Verify & Test</p>
                <p className="text-xs text-gray-500">Confirm your node is working</p>
              </div>
            </div>
            {expandedSection === 'verify' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          {expandedSection === 'verify' && (
            <div className="p-4 border-t border-gray-800 space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-2">Test your cache node locally:</p>
                <CodeBlock code={testCommand} itemId="test-local" />
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-2">Verify registration with coordinator:</p>
                <CodeBlock code={verifyCommand} itemId="verify-reg" />
              </div>
              <div className="p-3 bg-whistle-green/10 border border-whistle-green/30 rounded-lg">
                <p className="text-sm text-whistle-green flex items-center gap-2">
                  <Check size={16} />
                  Your node will automatically start earning once it reports metrics!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Important Notes */}
      <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle size={18} className="text-yellow-400 mt-0.5" />
          <div className="text-sm">
            <p className="text-yellow-400 font-medium mb-1">Important Notes</p>
            <ul className="text-gray-400 space-y-1">
              <li>• Your node must stay online 24/7 to maximize rewards</li>
              <li>• 95%+ uptime = 1.2x bonus, 99%+ uptime = 1.5x bonus</li>
              <li>• Metrics are reported automatically every 30 seconds</li>
              <li>• Rewards are calculated hourly based on cache hits</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="mt-6 flex flex-wrap gap-3">
        <a 
          href="https://github.com/whistlenet/cache-node" 
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
        >
          <ExternalLink size={14} />
          GitHub Repository
        </a>
        <a 
          href="https://docs.whistle.ninja/cache-node" 
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
        >
          <ExternalLink size={14} />
          Full Documentation
        </a>
      </div>
    </div>
  )
}

