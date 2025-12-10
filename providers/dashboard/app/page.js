'use client'

import { useState, useEffect } from 'react'
import { OnChainProvider } from '../components/OnChainProvider'
import { Zap, ArrowRight, Star } from 'lucide-react'

export default function Dashboard() {
  const [isVisible, setIsVisible] = useState(true)

  return (
    <div className="min-h-screen bg-whistle-darker flex flex-col items-center justify-center">
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
      
      {/* Dynamic Banner */}
      {isVisible && (
        <div className="relative z-10 w-full max-w-4xl px-6 mb-8 animate-fade-in">
          <div className="relative overflow-hidden rounded-xl border border-whistle-accent/30 bg-gradient-to-r from-whistle-accent/10 via-whistle-accent2/10 to-whistle-accent/10 backdrop-blur-sm shadow-2xl">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-whistle-accent/20 via-whistle-accent2/20 to-whistle-accent/20 animate-gradient-shift" />
            
            {/* Sparkle effects */}
            <div className="absolute top-4 left-4 animate-pulse">
              <Star size={20} className="text-whistle-accent opacity-60 fill-whistle-accent" />
            </div>
            <div className="absolute bottom-4 right-4 animate-pulse delay-300">
              <Star size={16} className="text-whistle-accent2 opacity-60 fill-whistle-accent2" />
            </div>
            
            <div className="relative p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                    <Zap size={32} className="text-whistle-accent animate-pulse" />
                    <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-wide">
                      Become a Provider
                    </h2>
                  </div>
                  <p className="text-lg md:text-xl text-gray-200 mb-2">
                    Want to <span className="text-whistle-accent font-semibold">provide and earn</span>?
                  </p>
                  <p className="text-base md:text-lg text-gray-300">
                    Help make our <span className="text-white font-semibold">RPC infrastructure faster and better</span>
                  </p>
                </div>
                
                <a
                  href="https://earn.whistle.ninja"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-whistle-accent to-whistle-accent2 text-black font-bold text-lg rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300 whitespace-nowrap"
                >
                  <span>Join Us</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
            
            {/* Close button */}
            <button
              onClick={() => setIsVisible(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Close banner"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="5" x2="15" y2="15" />
                <line x1="15" y1="5" x2="5" y2="15" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Content - Centered */}
      <div className="relative z-10 w-full max-w-md px-6">
        <OnChainProvider />
      </div>
    </div>
  )
}
