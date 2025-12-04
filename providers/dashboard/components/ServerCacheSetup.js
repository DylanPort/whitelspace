'use client'

import { useState } from 'react'
import { useWalletSafe } from '../lib/useWalletSafe'
import { 
  Server, 
  Download,
  Monitor,
  Laptop,
  Terminal,
  CheckCircle,
  Zap,
  Award,
  Shield,
  ExternalLink,
  Copy,
  X
} from 'lucide-react'

export function ServerCacheSetup() {
  const { publicKey, connected } = useWalletSafe()
  const [hoveredPlatform, setHoveredPlatform] = useState(null)
  const [showLinuxModal, setShowLinuxModal] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const walletAddress = publicKey?.toBase58() || ''
  
  const linuxCommand = connected && walletAddress
    ? `curl -fsSL "https://raw.githubusercontent.com/DylanPort/whitelspace/main/CACHE-NODE-EASY.sh?$(date +%s)" | bash -s -- ${walletAddress}`
    : 'curl -fsSL https://raw.githubusercontent.com/DylanPort/whitelspace/main/CACHE-NODE-EASY.sh | bash -s -- YOUR_WALLET'
  
  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(linuxCommand)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
  
  // Download URLs - auto-built via GitHub Actions
  const downloads = {
    windows: {
      name: 'Windows',
      icon: Monitor,
      file: 'Ghost.Whistle.Desktop.1.0.0.exe',
      url: 'https://github.com/DylanPort/whitelspace/releases/download/v1.01/Ghost.Whistle.Desktop.1.0.0.exe',
      color: 'from-blue-500 to-blue-600',
      size: '~80 MB',
      available: true
    },
    linux: {
      name: 'Linux',
      icon: Terminal,
      file: 'ghost-node-runner-linux',
      url: 'https://github.com/DylanPort/whitelspace/releases/download/v1.02/ghost-node-runner-linux',
      color: 'from-orange-500 to-orange-600',
      size: 'Binary',
      available: true,
      isLinux: true
    },
    mac: {
      name: 'macOS',
      icon: Laptop,
      file: 'Coming Soon',
      url: '#',
      color: 'from-gray-600 to-gray-700',
      size: 'N/A',
      available: false
    }
  }

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-whistle-accent/20 to-whistle-accent/5 rounded-xl border border-whistle-accent/30">
            <Server size={28} className="text-whistle-accent" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Run a Cache Node</h3>
            <p className="text-gray-400 text-sm">Download the app • Start earning SOL</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-whistle-green/20 border border-whistle-green/40 rounded-full">
          <span className="text-whistle-green text-xs font-semibold uppercase tracking-wider">Earn 70%</span>
        </div>
      </div>

      {/* Benefits Row */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <div className="text-center p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <Award size={20} className="mx-auto mb-2 text-whistle-green" />
          <p className="text-white font-bold text-sm">70%</p>
          <p className="text-gray-500 text-xs">Revenue Share</p>
        </div>
        <div className="text-center p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <Zap size={20} className="mx-auto mb-2 text-yellow-400" />
          <p className="text-white font-bold text-sm">&lt;10ms</p>
          <p className="text-gray-500 text-xs">Response Time</p>
        </div>
        <div className="text-center p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <Shield size={20} className="mx-auto mb-2 text-purple-400" />
          <p className="text-white font-bold text-sm">Auto</p>
          <p className="text-gray-500 text-xs">Earnings</p>
        </div>
        <div className="text-center p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <CheckCircle size={20} className="mx-auto mb-2 text-blue-400" />
          <p className="text-white font-bold text-sm">Easy</p>
          <p className="text-gray-500 text-xs">1-Click Setup</p>
        </div>
      </div>

      {/* Download Section */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">
          Download for your platform
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(downloads).map(([key, platform]) => {
            const Icon = platform.icon
            const isHovered = hoveredPlatform === key
            const isAvailable = platform.available
            
            const content = (
              <>
                {/* Coming Soon Badge */}
                {!isAvailable && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <span className="px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-[10px] font-bold rounded-full uppercase tracking-wider shadow-lg">
                      Coming Soon
                    </span>
                  </div>
                )}
                
                {/* Background gradient on hover */}
                <div className={`
                  absolute inset-0 rounded-xl bg-gradient-to-br ${platform.color} opacity-0 
                  ${isAvailable ? 'group-hover:opacity-10' : ''} transition-opacity duration-300
                `} />
                
                <div className="relative flex flex-col items-center text-center">
                  <div className={`
                    p-3 rounded-xl mb-3 transition-all duration-300
                    ${isHovered && isAvailable ? 'bg-whistle-accent/20' : 'bg-gray-700/50'}
                    ${!isAvailable ? 'opacity-60' : ''}
                  `}>
                    <Icon size={32} className={isHovered && isAvailable ? 'text-whistle-accent' : 'text-gray-400'} />
                  </div>
                  
                  <h5 className={`font-bold text-lg mb-1 ${!isAvailable ? 'text-gray-400' : 'text-white'}`}>
                    {platform.name}
                  </h5>
                  <p className="text-gray-500 text-xs mb-3">{platform.size}</p>
                  
                  <div className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300
                    ${!isAvailable 
                      ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed' 
                      : isHovered 
                        ? 'bg-whistle-accent text-black' 
                        : 'bg-gray-700 text-gray-300'
                    }
                  `}>
                    {platform.isLinux ? <Terminal size={16} /> : <Download size={16} />}
                    {!isAvailable ? 'Soon' : platform.isLinux ? 'Get Started' : 'Download'}
                  </div>
                </div>
              </>
            )
            
            // Return link for available, div for coming soon, button for Linux
            if (platform.isLinux) {
              return (
                <button
                  key={key}
                  onClick={() => setShowLinuxModal(true)}
                  onMouseEnter={() => setHoveredPlatform(key)}
                  onMouseLeave={() => setHoveredPlatform(null)}
                  className={`
                    relative group p-5 rounded-xl border-2 transition-all duration-300 cursor-pointer text-left
                    ${isHovered 
                      ? 'border-whistle-accent bg-whistle-accent/10 transform -translate-y-1' 
                      : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                    }
                  `}
                >
                  {content}
                </button>
              )
            }
            
            return isAvailable ? (
              <a
                key={key}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => setHoveredPlatform(key)}
                onMouseLeave={() => setHoveredPlatform(null)}
                className={`
                  relative group p-5 rounded-xl border-2 transition-all duration-300 cursor-pointer
                  ${isHovered 
                    ? 'border-whistle-accent bg-whistle-accent/10 transform -translate-y-1' 
                    : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                  }
                `}
              >
                {content}
              </a>
            ) : (
              <div
                key={key}
                className="relative p-5 rounded-xl border-2 border-gray-700/50 bg-gray-800/20 cursor-not-allowed opacity-80"
              >
                {content}
              </div>
            )
          })}
        </div>
      </div>

      {/* Linux Installation Modal */}
      {showLinuxModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowLinuxModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Terminal size={24} className="text-orange-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Linux Installation</h3>
                  <p className="text-gray-400 text-sm">One command to start earning</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLinuxModal(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Docker Command */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-300">Run this in your terminal:</span>
                <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">Auto-installs Docker</span>
              </div>
              <div className="relative">
                <div className="bg-black rounded-xl p-4 font-mono text-sm overflow-x-auto border border-gray-800">
                  <code className="text-green-400 break-all">{linuxCommand}</code>
                </div>
                <button
                  onClick={copyCommand}
                  className={`absolute top-2 right-2 p-2 rounded-lg transition-all ${
                    copied 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                </button>
              </div>
              {copied && (
                <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                  <CheckCircle size={12} /> Copied to clipboard!
                </p>
              )}
            </div>

            {/* Wallet Status */}
            {connected && walletAddress ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4 flex items-center gap-3">
                <CheckCircle size={18} className="text-green-400" />
                <div>
                  <p className="text-green-400 text-sm font-semibold">Wallet Connected!</p>
                  <p className="text-gray-400 text-xs">Command includes your wallet: {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}</p>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 flex items-center gap-3">
                <Zap size={18} className="text-yellow-400" />
                <div>
                  <p className="text-yellow-400 text-sm font-semibold">Connect Wallet for Auto-Fill</p>
                  <p className="text-gray-400 text-xs">Or replace YOUR_WALLET in the command manually</p>
                </div>
              </div>
            )}

            {/* Steps */}
            <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
              <h4 className="text-sm font-semibold text-white mb-3">How it works:</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                  <p className="text-gray-300 text-sm">Copy the command above {connected ? <span className="text-green-400">(your wallet is included!)</span> : ''}</p>
                </div>
                {!connected && (
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                    <p className="text-gray-300 text-sm"><strong className="text-white">Replace YOUR_WALLET</strong> with your Solana wallet address</p>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-bold flex-shrink-0 mt-0.5">{connected ? '2' : '3'}</div>
                  <p className="text-gray-300 text-sm">Paste into terminal and press Enter</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-bold flex-shrink-0 mt-0.5">{connected ? '3' : '4'}</div>
                  <p className="text-gray-300 text-sm">Docker installs automatically if needed</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-xs font-bold flex-shrink-0 mt-0.5">✓</div>
                  <p className="text-gray-300 text-sm">Done! Start earning SOL automatically</p>
                </div>
              </div>
            </div>

            {/* Alternative Downloads */}
            <div className="border-t border-gray-800 pt-4">
              <p className="text-xs text-gray-500 mb-3">Alternative downloads (GUI app):</p>
              <div className="flex flex-wrap gap-2">
                <a 
                  href="https://github.com/DylanPort/whitelspace/releases/latest/download/WHISTLE-Cache-Node-1.0.0-linux-x64.AppImage"
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Download size={12} /> AppImage
                </a>
                <a 
                  href="https://github.com/DylanPort/whitelspace/releases/latest/download/WHISTLE-Cache-Node-1.0.0-linux-x64.deb"
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Download size={12} /> .deb (Ubuntu)
                </a>
                <a 
                  href="https://github.com/DylanPort/whitelspace/releases/latest/download/WHISTLE-Cache-Node-1.0.0-linux-x64.rpm"
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Download size={12} /> .rpm (Fedora)
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Start Steps */}
      <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Zap size={16} className="text-whistle-accent" />
          Quick Start
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-whistle-accent/20 border border-whistle-accent/50 flex items-center justify-center text-whistle-accent text-xs font-bold flex-shrink-0">
              1
            </div>
            <div>
              <p className="text-white text-sm font-medium">Download & Install</p>
              <p className="text-gray-500 text-xs">Choose your platform above</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-whistle-accent/20 border border-whistle-accent/50 flex items-center justify-center text-whistle-accent text-xs font-bold flex-shrink-0">
              2
            </div>
            <div>
              <p className="text-white text-sm font-medium">Link Your Wallet</p>
              <p className="text-gray-500 text-xs">Enter your wallet address</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-whistle-accent/20 border border-whistle-accent/50 flex items-center justify-center text-whistle-accent text-xs font-bold flex-shrink-0">
              3
            </div>
            <div>
              <p className="text-white text-sm font-medium">Start Earning!</p>
              <p className="text-gray-500 text-xs">Automatic SOL rewards</p>
            </div>
          </div>
        </div>
      </div>

      {/* Source Code Link */}
      <div className="mt-4 text-center">
        <a 
          href="https://github.com/DylanPort/whitelspace/tree/main/whistle-cache-node-app" 
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-whistle-accent text-sm transition-colors"
        >
          <ExternalLink size={14} />
          View source code on GitHub
        </a>
      </div>
    </div>
  )
}
