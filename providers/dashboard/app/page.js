'use client'

import { OnChainProvider } from '../components/OnChainProvider'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-whistle-darker flex items-center justify-center">
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
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/60" />
      </div>
      
      {/* Content - Centered */}
      <div className="relative z-10 w-full max-w-md px-6">
        <OnChainProvider />
      </div>
    </div>
  )
}
