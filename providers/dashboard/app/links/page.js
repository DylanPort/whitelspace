'use client'

import { useState, useEffect } from 'react'
import { 
  ExternalLink, 
  Copy, 
  Check,
  Zap,
  Globe,
  Server,
  MessageCircle,
  Github,
  FileCode,
  Coins,
  Shield,
  TrendingUp,
  ChevronRight,
  Sparkles
} from 'lucide-react'

// Animated background particles
function Particles() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
            opacity: Math.random() * 0.5 + 0.2,
          }}
        />
      ))}
    </div>
  )
}

// Speed lines component
function SpeedLines() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute h-px bg-gradient-to-r from-transparent via-white to-transparent animate-speed-line"
          style={{
            top: `${Math.random() * 100}%`,
            left: '-100%',
            width: `${50 + Math.random() * 100}px`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${0.5 + Math.random() * 0.5}s`,
          }}
        />
      ))}
    </div>
  )
}

// Copy button with feedback
function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs font-mono text-gray-400 hover:text-white transition-all group"
    >
      {copied ? (
        <>
          <Check size={12} className="text-green-400" />
          <span className="text-green-400">Copied!</span>
        </>
      ) : (
        <>
          <Copy size={12} />
          <span className="truncate max-w-[120px] sm:max-w-[200px]">{label || text}</span>
        </>
      )}
    </button>
  )
}

// Link card component with manga explosion effect
function LinkCard({ href, icon: Icon, title, subtitle, color, isExternal = true, delay = 0 }) {
  const [isHovered, setIsHovered] = useState(false)
  
  return (
    <a
      href={href}
      target={isExternal ? "_blank" : "_self"}
      rel={isExternal ? "noopener noreferrer" : ""}
      className={`
        relative group block w-full p-4 sm:p-5
        bg-black/40 backdrop-blur-sm
        border-2 border-white/10 hover:border-${color}/50
        rounded-none
        transform transition-all duration-300
        hover:scale-[1.02] hover:-translate-y-1
        hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]
        overflow-hidden
        animate-slide-in
      `}
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Explosion effect on hover */}
      <div className={`
        absolute inset-0 bg-gradient-to-r from-${color}/0 via-${color}/10 to-${color}/0
        transform transition-transform duration-500
        ${isHovered ? 'scale-x-100' : 'scale-x-0'}
      `} />
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/30" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/30" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/30" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/30" />
      
      <div className="relative flex items-center gap-4">
        <div className={`
          p-3 bg-gradient-to-br from-${color}/20 to-${color}/5
          border border-${color}/30
          transform transition-transform duration-300
          ${isHovered ? 'rotate-12 scale-110' : ''}
        `}>
          <Icon size={24} className={`text-${color}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-lg tracking-wide group-hover:tracking-wider transition-all">
            {title}
          </h3>
          {subtitle && (
            <p className="text-gray-500 text-sm truncate">{subtitle}</p>
          )}
        </div>
        
        <ChevronRight 
          size={20} 
          className={`
            text-gray-600 transform transition-all duration-300
            ${isHovered ? 'translate-x-1 text-white' : ''}
          `}
        />
      </div>
      
      {/* Impact lines */}
      {isHovered && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        </div>
      )}
    </a>
  )
}

// Address display card
function AddressCard({ label, address, icon: Icon, color }) {
  return (
    <div className="bg-black/40 border border-white/10 p-4 rounded-none">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={`text-${color}`} />
        <span className="text-gray-500 text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <code className="text-white font-mono text-sm truncate">{address}</code>
        <CopyButton text={address} />
      </div>
    </div>
  )
}

export default function LinksPage() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="min-h-screen bg-black" />
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-950 to-black" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,255,120,0.03),transparent_50%)]" />
      <Particles />
      <SpeedLines />
      
      {/* Manga-style border frame */}
      <div className="fixed inset-4 border-2 border-white/5 pointer-events-none" />
      <div className="fixed inset-8 border border-white/5 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-xl mx-auto px-4 py-12">
        
        {/* Logo/Header with explosion effect */}
        <div className="text-center mb-12 relative">
          {/* Impact burst */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-40 h-40 bg-gradient-to-r from-green-500/10 via-yellow-500/10 to-green-500/10 rounded-full blur-3xl animate-pulse" />
          </div>
          
          <div className="relative">
            <div className="inline-block mb-4">
              <img 
                src="/whistle-logo.png" 
                alt="WHISTLE" 
                className="w-24 h-24 mx-auto animate-float"
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            </div>
            
            <h1 className="text-5xl sm:text-6xl font-black tracking-tighter mb-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-yellow-300 to-green-400 animate-gradient">
                WHISTLE
              </span>
            </h1>
            
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm font-mono mb-6">
              <span className="w-8 h-px bg-gradient-to-r from-transparent to-gray-600" />
              <span>DECENTRALIZED RPC NETWORK</span>
              <span className="w-8 h-px bg-gradient-to-l from-transparent to-gray-600" />
            </div>
            
            {/* Status badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 text-xs font-bold tracking-wider">MAINNET LIVE</span>
            </div>
          </div>
        </div>

        {/* Mission Statement */}
        <div className="mb-10 p-6 bg-white/5 border-l-4 border-green-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 text-[100px] font-black text-white/5 leading-none select-none">
            使命
          </div>
          <p className="text-gray-300 text-sm leading-relaxed relative z-10">
            <strong className="text-white">We're building the decentralized RPC layer for Solana.</strong>
            {' '}Providers run cache nodes, serve queries, and earn SOL. No rate limits. No middlemen. 
            Currently in <span className="text-green-400 font-bold">Phase 1</span> with on-chain provider registration, 
            token bonding, and real queries flowing through the network. Full decentralization is the destination.
          </p>
        </div>

        {/* Main Links */}
        <div className="space-y-3 mb-10">
          <LinkCard
            href="https://whistle.ninja"
            icon={Globe}
            title="WHISTLE.NINJA"
            subtitle="Main Dashboard • Staking • Analytics"
            color="green-400"
            delay={0}
          />
          
          <LinkCard
            href="https://provider.whistle.ninja"
            icon={Server}
            title="PROVIDER DASHBOARD"
            subtitle="Register as Provider • Run Cache Node"
            color="yellow-400"
            delay={100}
          />
          
          <LinkCard
            href="https://provider.whistle.ninja/docs"
            icon={FileCode}
            title="DOCUMENTATION"
            subtitle="Technical Docs • Smart Contract • API"
            color="blue-400"
            delay={150}
          />
          
          <LinkCard
            href="https://whistle.ninja/main.html"
            icon={Zap}
            title="WHISTLE APP"
            subtitle="P2P Encrypted Tips • Solana Memo"
            color="purple-400"
            delay={200}
          />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <Sparkles size={16} className="text-yellow-400" />
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        {/* Social Links */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          <a
            href="https://t.me/whistleninja"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-4 bg-[#0088cc]/10 border border-[#0088cc]/30 hover:bg-[#0088cc]/20 transition-all group"
          >
            <MessageCircle size={20} className="text-[#0088cc]" />
            <span className="font-bold text-white group-hover:tracking-wider transition-all">TELEGRAM</span>
          </a>
          
          <a
            href="https://x.com/Whistle_Ninja"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-4 bg-white/5 border border-white/20 hover:bg-white/10 transition-all group"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="font-bold text-white group-hover:tracking-wider transition-all">X / TWITTER</span>
          </a>
        </div>

        {/* Developer Links */}
        <div className="space-y-3 mb-10">
          <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Github size={14} />
            DEVELOPERS
          </h3>
          
          <LinkCard
            href="https://github.com/DylanPort/whitelspace"
            icon={Github}
            title="GITHUB REPOSITORY"
            subtitle="Source Code • Cache Node • Coordinator"
            color="gray-400"
            delay={250}
          />
          
          <LinkCard
            href="https://github.com/DylanPort/whitelspace/blob/main/idl/whistle.json"
            icon={FileCode}
            title="CONTRACT IDL"
            subtitle="Anchor IDL • Interface Definition"
            color="orange-400"
            delay={300}
          />
        </div>

        {/* Contract Addresses */}
        <div className="space-y-3 mb-10">
          <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Shield size={14} />
            ON-CHAIN ADDRESSES
          </h3>
          
          <AddressCard
            label="WHISTLE Token (CA)"
            address="6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump"
            icon={Coins}
            color="green-400"
          />
          
          <AddressCard
            label="WHTT Program ID"
            address="whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr"
            icon={FileCode}
            color="blue-400"
          />
          
          <AddressCard
            label="Staking Vault"
            address="6AP8c7sCQsm2FMvNJw6fQN5PnMdkySH75h7EPE2kD3Yq"
            icon={Shield}
            color="purple-400"
          />
        </div>

        {/* Trading Links */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          <a
            href="https://www.coingecko.com/en/coins/whistle"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-4 bg-[#8dc647]/10 border border-[#8dc647]/30 hover:bg-[#8dc647]/20 transition-all group"
          >
            <img src="https://static.coingecko.com/s/thumbnail-007177f3eca19695592f0b8b0eabbdae282b54154e1be912285c9034ea6cbaf2.png" alt="CoinGecko" className="w-5 h-5" />
            <span className="font-bold text-white group-hover:tracking-wider transition-all text-sm">COINGECKO</span>
          </a>
          
          <a
            href="https://jup.ag/swap/SOL-6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-4 bg-[#c7f284]/10 border border-[#c7f284]/30 hover:bg-[#c7f284]/20 transition-all group"
          >
            <TrendingUp size={20} className="text-[#c7f284]" />
            <span className="font-bold text-white group-hover:tracking-wider transition-all text-sm">JUPITER</span>
          </a>
        </div>

        {/* Phase indicator */}
        <div className="p-6 bg-gradient-to-r from-green-500/10 via-yellow-500/5 to-green-500/10 border border-green-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 text-[80px] font-black text-white/5 leading-none select-none">
            進捗
          </div>
          
          <h4 className="text-green-400 font-bold text-sm mb-3 tracking-wider">DECENTRALIZATION PROGRESS</h4>
          
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-white text-sm font-medium">Phase 1: Foundation</span>
              <span className="text-green-400 text-xs font-bold ml-auto">LIVE</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-yellow-500/50 rounded-full" />
              <span className="text-gray-400 text-sm">Phase 2: Multi-Provider</span>
              <span className="text-yellow-400 text-xs font-bold ml-auto">IN PROGRESS</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-gray-600 rounded-full" />
              <span className="text-gray-500 text-sm">Phase 3: Trustless</span>
              <span className="text-gray-500 text-xs ml-auto">PLANNED</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-gray-700 rounded-full" />
              <span className="text-gray-600 text-sm">Phase 4: Full Decentralization</span>
              <span className="text-gray-600 text-xs ml-auto">FUTURE</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-600 text-xs">
          <p>Built on Solana • No rate limits • Earn SOL</p>
        </div>
      </div>

      {/* Custom styles */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.5; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
        }
        
        @keyframes speed-line {
          0% { transform: translateX(0); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateX(200vw); opacity: 0; }
        }
        
        @keyframes slide-in {
          0% { transform: translateX(-20px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-speed-line {
          animation: speed-line 1s linear infinite;
        }
        
        .animate-slide-in {
          animation: slide-in 0.5s ease-out forwards;
          opacity: 0;
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  )
}

