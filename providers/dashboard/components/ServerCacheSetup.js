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
  ExternalLink
} from 'lucide-react'

export function ServerCacheSetup() {
  const { publicKey, connected } = useWalletSafe()
  const [hoveredPlatform, setHoveredPlatform] = useState(null)
  
  const walletAddress = publicKey?.toBase58() || ''
  
  // Download URLs
  const downloads = {
    windows: {
      name: 'Windows',
      icon: Monitor,
      file: 'WHISTLE-Cache-Node-Setup-1.0.0.exe',
      url: 'https://github.com/DylanPort/whitelspace/releases/download/v1.0.0/WHISTLE-Cache-Node-Setup-1.0.0.exe',
      color: 'from-blue-500 to-blue-600',
      size: '~80 MB',
      available: true
    },
    linux: {
      name: 'Linux',
      icon: Terminal,
      file: 'Docker Setup Script',
      url: 'https://raw.githubusercontent.com/DylanPort/whitelspace/main/CACHE-NODE-EASY.sh',
      color: 'from-orange-500 to-orange-600',
      size: 'Docker',
      available: true,
      isScript: true
    },
    mac: {
      name: 'macOS',
      icon: Laptop,
      file: 'WHISTLE-Cache-Node-1.0.0.dmg',
      url: '#',
      color: 'from-gray-600 to-gray-700',
      size: '~85 MB',
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
                    {platform.isScript ? <Terminal size={16} /> : <Download size={16} />}
                    {!isAvailable ? 'Soon' : platform.isScript ? 'Get Script' : 'Download'}
                  </div>
                </div>
              </>
            )
            
            // Return link for available, div for coming soon
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

      {/* Linux Docker Quick Start */}
      <div className="mt-6 p-4 bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-xl border border-orange-500/30">
        <div className="flex items-center gap-3 mb-3">
          <Terminal size={20} className="text-orange-400" />
          <h4 className="text-sm font-semibold text-white">Linux Quick Start (Docker)</h4>
        </div>
        <p className="text-gray-400 text-xs mb-3">
          Run this command in your terminal to start a cache node instantly:
        </p>
        <div className="bg-black/50 rounded-lg p-3 font-mono text-xs overflow-x-auto">
          <code className="text-green-400">
            curl -fsSL https://raw.githubusercontent.com/DylanPort/whitelspace/main/CACHE-NODE-EASY.sh | bash
          </code>
        </div>
        <p className="text-gray-500 text-xs mt-2">
          Requires Docker installed. Works on Ubuntu, Debian, CentOS, Fedora, and more.
        </p>
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
