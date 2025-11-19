import React from 'react';

interface SilverCornerProps {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

export default function SilverCorner({ position, className = '' }: SilverCornerProps) {
  const rotation = {
    'top-left': '0deg',
    'top-right': '90deg',
    'bottom-right': '180deg',
    'bottom-left': '270deg',
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    width: '45px',
    height: '45px',
    transform: `rotate(${rotation[position]})`,
    zIndex: 20,
    pointerEvents: 'none',
    ...(position === 'top-left' ? { top: -3, left: -3 } : {}),
    ...(position === 'top-right' ? { top: -3, right: -3 } : {}),
    ...(position === 'bottom-right' ? { bottom: -3, right: -3 } : {}),
    ...(position === 'bottom-left' ? { bottom: -3, left: -3 } : {}),
  };

  return (
    <div style={style} className={className}>
      <svg
        viewBox="0 0 45 45"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full filter drop-shadow-lg"
      >
        <defs>
          {/* Brushed Steel Gradient */}
          <linearGradient id="silver-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E0E0E0" />
            <stop offset="20%" stopColor="#8A8A8A" />
            <stop offset="40%" stopColor="#F5F5F5" />
            <stop offset="60%" stopColor="#606060" />
            <stop offset="80%" stopColor="#D0D0D0" />
            <stop offset="100%" stopColor="#4A4A4A" />
          </linearGradient>
          
          {/* Blue Tech Glow Gradient */}
          <linearGradient id="tech-glow" x1="0%" y1="0%" x2="100%" y2="0%">
             <stop offset="0%" stopColor="#00FFFF" stopOpacity="0.6" />
             <stop offset="100%" stopColor="#00FFFF" stopOpacity="0.0" />
          </linearGradient>

          {/* Hex Bolt Gradient */}
          <radialGradient id="bolt-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#202020" />
          </radialGradient>
        </defs>

        {/* Main Industrial Plate - More angular/tech shape */}
        <path
          d="M0 14 L14 0 L45 0 L45 8 L16 8 L8 16 L8 45 L0 45 Z"
          fill="url(#silver-gradient)"
          stroke="#404040"
          strokeWidth="1"
        />

        {/* Tech Line/Circuit Detail */}
        <path
          d="M16 2 L43 2 L43 6 L14 6 L6 14 L6 43 L2 43 L2 16 L16 2 Z"
          fill="none"
          stroke="url(#tech-glow)"
          strokeWidth="1"
          opacity="0.8"
        />
        
        {/* Hex Bolt (Hexagon shape) */}
        <path 
          d="M28 28 L32 25 L36 28 L36 32 L32 35 L28 32 Z" 
          fill="url(#bolt-gradient)" 
          stroke="#000" 
          strokeWidth="0.5" 
        />
        
        {/* Small LED Status Light */}
        <circle cx="12" cy="12" r="1.5" fill="#00FF00" className="animate-pulse" />

      </svg>
    </div>
  );
}

