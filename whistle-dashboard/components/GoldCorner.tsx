import React from 'react';

interface GoldCornerProps {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

export default function GoldCorner({ position, className = '' }: GoldCornerProps) {
  const rotation = {
    'top-left': '0deg',
    'top-right': '90deg',
    'bottom-right': '180deg',
    'bottom-left': '270deg',
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    width: '40px',
    height: '40px',
    transform: `rotate(${rotation[position]})`,
    zIndex: 20,
    pointerEvents: 'none',
    ...(position === 'top-left' ? { top: -2, left: -2 } : {}),
    ...(position === 'top-right' ? { top: -2, right: -2 } : {}),
    ...(position === 'bottom-right' ? { bottom: -2, right: -2 } : {}),
    ...(position === 'bottom-left' ? { bottom: -2, left: -2 } : {}),
  };

  return (
    <div style={style} className={className}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full filter drop-shadow-lg"
      >
        <defs>
          {/* Realistic Gold Gradient - Brushed Metal effect */}
          <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" /> {/* Light highlight */}
            <stop offset="20%" stopColor="#BF953F" /> {/* Shadow */}
            <stop offset="40%" stopColor="#FFFACD" /> {/* Shine */}
            <stop offset="60%" stopColor="#B38728" /> {/* Dark Gold */}
            <stop offset="80%" stopColor="#FBF5B7" /> {/* Light */}
            <stop offset="100%" stopColor="#AA771C" /> {/* Dark edge */}
          </linearGradient>
          
          {/* Specular highlight for the bevel */}
          <linearGradient id="gold-highlight" x1="0%" y1="0%" x2="100%" y2="0%">
             <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
             <stop offset="100%" stopColor="#BF953F" stopOpacity="0.0" />
          </linearGradient>

          {/* Screw Head Gradient */}
          <radialGradient id="screw-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E6E6E6" />
            <stop offset="40%" stopColor="#808080" />
            <stop offset="100%" stopColor="#404040" />
          </radialGradient>
        </defs>

        {/* Main Bracket Body */}
        <path
          d="M0 16 L16 0 L40 0 L40 12 L12 12 L12 40 L0 40 Z"
          fill="url(#gold-gradient)"
          stroke="#806020"
          strokeWidth="1"
        />

        {/* Inner Bevel (Shine) */}
        <path
          d="M17 1 L39 1 L39 11 L11 11 L11 39 L1 39 L1 17 L17 1 Z"
          fill="url(#gold-highlight)"
          opacity="0.4"
          style={{ mixBlendMode: 'overlay' }}
        />
        
        {/* Screw/Rivet */}
        <circle cx="22" cy="22" r="3" fill="url(#screw-gradient)" stroke="#000" strokeWidth="0.5" />
        <path d="M20 22 L24 22 M22 20 L22 24" stroke="#303030" strokeWidth="1" opacity="0.8" />

      </svg>
    </div>
  );
}

