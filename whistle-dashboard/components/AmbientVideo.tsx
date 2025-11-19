'use client';

import { useEffect, useRef } from 'react';

export default function AmbientVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.75; // Slow down slightly for more atmospheric feel
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none select-none">
      {/* Base Background Color - Fallback */}
      <div className="absolute inset-0 bg-[#050505]" />

      {/* Video Layer */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity"
      >
        <source src="/background.mp4" type="video/mp4" />
      </video>

      {/* Cinematic Vignette */}
      <div 
        className="absolute inset-0 z-[1]"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(5, 5, 5, 0.2) 0%, rgba(5, 5, 5, 0.8) 80%, #050505 100%)'
        }}
      />

      {/* Scanline Texture */}
      <div 
        className="absolute inset-0 z-[2] opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(18, 18, 18, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
          backgroundSize: '100% 4px, 6px 100%'
        }}
      />

      {/* Digital Noise/Grain */}
      <div 
        className="absolute inset-0 z-[3] opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />
      
      {/* Cyberpunk Grid Overlay (Subtle) */}
      <div 
        className="absolute inset-0 z-[4] opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
          maskImage: 'radial-gradient(circle at 50% 50%, black 40%, transparent 80%)'
        }}
      />
    </div>
  );
}

