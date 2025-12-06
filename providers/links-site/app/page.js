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
  Sparkles,
  Wifi,
  Cpu,
  HardDrive,
  Lock,
  Radio,
  Layers,
  Eye,
  EyeOff,
  Network,
  Flame,
  Skull,
  Swords
} from 'lucide-react'

// Speed lines component
function SpeedLines() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20 z-20">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute h-px bg-gradient-to-r from-transparent via-white to-transparent animate-speed-line"
          style={{
            top: `${Math.random() * 100}%`,
            left: '-100%',
            width: `${50 + Math.random() * 150}px`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${0.3 + Math.random() * 0.4}s`,
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

// Custom icon components for unique look
function RpcIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
      <path d="M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
    </svg>
  )
}

function VpnIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function OsIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8m-4-4v4" />
      <path d="M6 8h.01M9 8h.01M12 8h.01" />
    </svg>
  )
}

function HardwareIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="8" y="8" width="8" height="8" rx="1" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function SovereigntyIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 0 20" strokeDasharray="4 4" />
      <path d="M2 12h20M12 2c2.5 2.5 4 6 4 10s-1.5 7.5-4 10c-2.5-2.5-4-6-4-10s1.5-7.5 4-10" />
    </svg>
  )
}

// Link card component with manga explosion effect
function LinkCard({ href, icon: Icon, customIcon: CustomIcon, title, subtitle, gradient, isExternal = true, delay = 0 }) {
  const [isHovered, setIsHovered] = useState(false)
  
  return (
    <a
      href={href}
      target={isExternal ? "_blank" : "_self"}
      rel={isExternal ? "noopener noreferrer" : ""}
      className={`
        relative group block w-full p-4 sm:p-5
        bg-black/60 backdrop-blur-sm
        border-2 border-white/10 hover:border-white/30
        rounded-none
        transform transition-all duration-300
        hover:scale-[1.02] hover:-translate-y-1
        overflow-hidden
        animate-slide-in
      `}
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Gradient background on hover */}
      <div className={`
        absolute inset-0 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-100
        transform transition-opacity duration-500
      `} />
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/40 group-hover:border-white/80 transition-colors" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/40 group-hover:border-white/80 transition-colors" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/40 group-hover:border-white/80 transition-colors" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/40 group-hover:border-white/80 transition-colors" />
      
      <div className="relative flex items-center gap-4">
        <div className={`
          p-3 border border-white/20 bg-black/50
          transform transition-all duration-300
          ${isHovered ? 'rotate-6 scale-110 border-white/50' : ''}
        `}>
          {CustomIcon ? (
            <CustomIcon className="w-6 h-6 text-white" />
          ) : (
            <Icon size={24} className="text-white" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-black text-lg tracking-wide group-hover:tracking-widest transition-all uppercase">
            {title}
          </h3>
          {subtitle && (
            <p className="text-gray-500 text-sm truncate">{subtitle}</p>
          )}
        </div>
        
        <ChevronRight 
          size={24} 
          className={`
            text-gray-600 transform transition-all duration-300
            ${isHovered ? 'translate-x-2 text-white' : ''}
          `}
        />
      </div>
    </a>
  )
}

// Address display card
function AddressCard({ label, address, icon: Icon, gradient }) {
  return (
    <div className="bg-black/60 border border-white/10 p-4 rounded-none backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-gray-400" />
        <span className="text-gray-500 text-xs uppercase tracking-wider font-bold">{label}</span>
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
      {/* Video Background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute w-full h-full object-cover opacity-40"
        >
          <source src="/bg-video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/90" />
      </div>
      
      <SpeedLines />
      
      {/* Manga-style border frame */}
      <div className="fixed inset-3 border-2 border-white/10 pointer-events-none z-30" />

      {/* Content */}
      <div className="relative z-10 max-w-xl mx-auto px-4 py-12">
        
        {/* Logo/Header */}
        <div className="text-center mb-8 relative">
          <div className="inline-block mb-4 relative">
            <img 
              src="/whistle-logo.png" 
              alt="WHISTLE" 
              className="w-28 h-28 mx-auto animate-pulse"
              onError={(e) => { e.target.style.display = 'none' }}
            />
            {/* Glowing ring */}
            <div className="absolute inset-0 border-2 border-green-500/30 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
          </div>
          
          <h1 className="text-6xl sm:text-7xl font-black tracking-tighter mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-yellow-300 to-green-400 animate-gradient">
              WHISTLE
            </span>
          </h1>
          
          <div className="flex items-center justify-center gap-3 mb-6">
            <Flame size={16} className="text-orange-500" />
            <span className="text-gray-400 text-sm font-bold tracking-[0.3em] uppercase">The Decentralization Movement</span>
            <Flame size={16} className="text-orange-500" />
          </div>
        </div>

        {/* Rebellion Manifesto */}
        <div className="mb-10 relative">
          <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 via-orange-500 to-yellow-500" />
          <div className="p-6 bg-black/70 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <Swords size={20} className="text-red-500" />
              <h3 className="text-red-400 font-black uppercase tracking-wider text-sm">A Rebellion Against Centralization</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              RPC is just the beginning. We're building a complete stack of decentralized infrastructure—
              <span className="text-green-400 font-bold"> RPC</span>,
              <span className="text-blue-400 font-bold"> VPN</span>,
              <span className="text-purple-400 font-bold"> OS</span>,
              <span className="text-orange-400 font-bold"> Hardware</span>.
              Every layer. Every component. Owned by no one. Run by everyone.
              <br /><br />
              <span className="text-white font-bold">This isn't a project. It's a movement.</span>
            </p>
          </div>
        </div>

        {/* Main Links */}
        <div className="space-y-3 mb-10">
          <LinkCard
            href="https://whistle.ninja"
            customIcon={({ className }) => (
              <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                <line x1="12" y1="22" x2="12" y2="15.5" />
                <polyline points="22 8.5 12 15.5 2 8.5" />
              </svg>
            )}
            title="WHISTLE.NINJA"
            subtitle="Main Hub • Staking • Analytics"
            gradient="from-green-500/20 via-transparent to-green-500/10"
            delay={0}
          />
          
          <LinkCard
            href="https://provider.whistle.ninja"
            customIcon={({ className }) => (
              <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="8" rx="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" />
                <circle cx="6" cy="6" r="1" fill="currentColor" />
                <circle cx="6" cy="18" r="1" fill="currentColor" />
                <line x1="10" y1="6" x2="18" y2="6" />
                <line x1="10" y1="18" x2="18" y2="18" />
              </svg>
            )}
            title="PROVIDER DASHBOARD"
            subtitle="Run Nodes • Earn SOL • Join The Network"
            gradient="from-yellow-500/20 via-transparent to-orange-500/10"
            delay={100}
          />
          
          <LinkCard
            href="https://provider.whistle.ninja/docs"
            customIcon={({ className }) => (
              <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16v16H4z" />
                <path d="M8 8h8M8 12h8M8 16h4" />
                <path d="M4 4l4-2h12l4 2" strokeLinejoin="round" />
              </svg>
            )}
            title="DOCUMENTATION"
            subtitle="Technical Docs • Smart Contract • API"
            gradient="from-blue-500/20 via-transparent to-cyan-500/10"
            delay={150}
          />
          
          <LinkCard
            href="https://whistle.ninja/main.html"
            customIcon={({ className }) => (
              <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            )}
            title="WHISTLE APP"
            subtitle="P2P Encrypted Tips • Solana Memo"
            gradient="from-purple-500/20 via-transparent to-pink-500/10"
            delay={200}
          />
          
          <LinkCard
            href="https://dex.whistle.ninja"
            customIcon={({ className }) => (
              <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18" />
                <path d="M7 16l4-8 4 5 5-9" />
              </svg>
            )}
            title="WHISTLE DEX"
            subtitle="Trade • Charts • Analytics"
            gradient="from-cyan-500/20 via-transparent to-blue-500/10"
            delay={250}
          />
          
          <LinkCard
            href="https://ai.whistle.ninja"
            customIcon={({ className }) => (
              <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
                <path d="M12 12l6 6M12 12l-6-6M12 12l6-6M12 12l-6 6" />
                <circle cx="12" cy="12" r="10" strokeDasharray="4 2" />
              </svg>
            )}
            title="WHISTLE AI"
            subtitle="AI-Powered Tools • Coming Soon"
            gradient="from-pink-500/20 via-transparent to-purple-500/10"
            delay={300}
          />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <Skull size={18} className="text-gray-500" />
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>

        {/* Social Links */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          <a
            href="https://t.me/whistleninja"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-4 bg-black/60 border-2 border-[#0088cc]/50 hover:bg-[#0088cc]/20 hover:border-[#0088cc] transition-all group backdrop-blur-sm"
          >
            <MessageCircle size={22} className="text-[#0088cc]" />
            <span className="font-black text-white group-hover:tracking-wider transition-all">TELEGRAM</span>
          </a>
          
          <a
            href="https://x.com/Whistle_Ninja"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-4 bg-black/60 border-2 border-white/30 hover:bg-white/10 hover:border-white transition-all group backdrop-blur-sm"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="font-black text-white group-hover:tracking-wider transition-all">X / TWITTER</span>
          </a>
        </div>

        {/* Developer Links */}
        <div className="space-y-3 mb-10">
          <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2 font-bold">
            <Github size={14} />
            OPEN SOURCE
          </h3>
          
          <LinkCard
            href="https://github.com/DylanPort/whitelspace"
            icon={Github}
            title="GITHUB"
            subtitle="Full Source Code • Contribute"
            gradient="from-gray-500/20 via-transparent to-gray-500/10"
            delay={250}
          />
          
          <LinkCard
            href="https://github.com/DylanPort/whitelspace/blob/main/whistlenet/contract/idl.json"
            icon={FileCode}
            title="CONTRACT IDL"
            subtitle="Anchor IDL • Build On Us"
            gradient="from-orange-500/20 via-transparent to-red-500/10"
            delay={300}
          />
        </div>

        {/* Contract Addresses */}
        <div className="space-y-3 mb-10">
          <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2 font-bold">
            <Lock size={14} />
            ON-CHAIN ADDRESSES
          </h3>
          
          <AddressCard
            label="WHISTLE Token (CA)"
            address="6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump"
            icon={Coins}
          />
          
          <AddressCard
            label="WHTT Program ID"
            address="whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr"
            icon={FileCode}
          />
          
          <AddressCard
            label="Staking Vault"
            address="6AP8c7sCQsm2FMvNJw6fQN5PnMdkySH75h7EPE2kD3Yq"
            icon={Shield}
          />
        </div>

        {/* Trading Links */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          <a
            href="https://www.coingecko.com/en/coins/whistle-privacy-focused-utility-and-cult"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-4 bg-black/60 border-2 border-[#8dc647]/50 hover:bg-[#8dc647]/20 hover:border-[#8dc647] transition-all group backdrop-blur-sm"
          >
            <img src="https://static.coingecko.com/s/thumbnail-007177f3eca19695592f0b8b0eabbdae282b54154e1be912285c9034ea6cbaf2.png" alt="CoinGecko" className="w-5 h-5" />
            <span className="font-black text-white group-hover:tracking-wider transition-all text-sm">COINGECKO</span>
          </a>
          
          <a
            href="https://jup.ag/tokens/6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-4 bg-black/60 border-2 border-[#c7f284]/50 hover:bg-[#c7f284]/20 hover:border-[#c7f284] transition-all group backdrop-blur-sm"
          >
            <TrendingUp size={20} className="text-[#c7f284]" />
            <span className="font-black text-white group-hover:tracking-wider transition-all text-sm">JUPITER</span>
          </a>
        </div>

        {/* THE MASTER PLAN - Decentralization Roadmap */}
        <div className="p-6 bg-black/70 border-2 border-white/10 relative overflow-hidden backdrop-blur-sm mb-8">
          {/* Japanese text decoration */}
          <div className="absolute top-2 right-4 text-[60px] font-black text-white/5 leading-none select-none">
            革命
          </div>
          
          <div className="flex items-center gap-3 mb-6">
            <Network size={20} className="text-green-400" />
            <h4 className="text-white font-black text-sm tracking-[0.2em] uppercase">The Master Plan</h4>
          </div>
          
          <div className="space-y-4">
            {/* Phase 1: RPC */}
            <div className="flex items-start gap-4 p-3 bg-green-500/10 border border-green-500/30 relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500" />
              <RpcIcon className="w-8 h-8 text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-green-400 font-black text-sm">PHASE 1: DECENTRALIZED RPC</span>
                  <span className="px-2 py-0.5 bg-green-500 text-black text-[10px] font-black animate-pulse">LIVE</span>
                </div>
                <p className="text-gray-400 text-xs">Cache nodes, provider rewards, on-chain registration</p>
              </div>
            </div>

            {/* Phase 2: VPN */}
            <div className="flex items-start gap-4 p-3 bg-blue-500/5 border border-blue-500/20 relative opacity-80">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500/50" />
              <VpnIcon className="w-8 h-8 text-blue-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-blue-400 font-black text-sm">PHASE 2: DECENTRALIZED VPN</span>
                  <span className="px-2 py-0.5 bg-blue-500/30 text-blue-300 text-[10px] font-black">NEXT</span>
                </div>
                <p className="text-gray-500 text-xs">Anonymous routing, exit nodes, encrypted tunnels</p>
              </div>
            </div>

            {/* Phase 3: OS */}
            <div className="flex items-start gap-4 p-3 bg-purple-500/5 border border-purple-500/20 relative opacity-60">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500/30" />
              <OsIcon className="w-8 h-8 text-purple-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-purple-400 font-black text-sm">PHASE 3: WHISTLE OS</span>
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-black">PLANNED</span>
                </div>
                <p className="text-gray-600 text-xs">Privacy-first operating system, hardened by default</p>
              </div>
            </div>

            {/* Phase 4: Hardware */}
            <div className="flex items-start gap-4 p-3 bg-orange-500/5 border border-orange-500/20 relative opacity-50">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500/30" />
              <HardwareIcon className="w-8 h-8 text-orange-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-orange-400 font-black text-sm">PHASE 4: OPEN HARDWARE</span>
                  <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 text-[10px] font-black">FUTURE</span>
                </div>
                <p className="text-gray-600 text-xs">Open-source routers, nodes, secure devices</p>
              </div>
            </div>

            {/* Phase 5: Full Sovereignty */}
            <div className="flex items-start gap-4 p-3 bg-white/5 border border-white/10 relative opacity-40">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/20" />
              <SovereigntyIcon className="w-8 h-8 text-white flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-black text-sm">PHASE 5: FULL SOVEREIGNTY</span>
                  <span className="px-2 py-0.5 bg-white/10 text-white/70 text-[10px] font-black">VISION</span>
                </div>
                <p className="text-gray-600 text-xs">Complete stack. No dependencies. True freedom.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-600 text-xs space-y-2">
          <p className="font-bold text-gray-500">DECENTRALIZE EVERYTHING</p>
          <p>Built on Solana • Open Source • Community Owned</p>
        </div>
      </div>

      {/* Custom styles */}
      <style jsx global>{`
        @keyframes speed-line {
          0% { transform: translateX(0); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateX(300vw); opacity: 0; }
        }
        
        @keyframes slide-in {
          0% { transform: translateX(-30px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .animate-speed-line {
          animation: speed-line 0.8s linear infinite;
        }
        
        .animate-slide-in {
          animation: slide-in 0.6s ease-out forwards;
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

