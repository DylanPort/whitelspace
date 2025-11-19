'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import GoldCorner from './GoldCorner';
import SilverCorner from './SilverCorner';
import { ReactNode } from 'react';

interface PanelFrameProps {
  children: ReactNode;
  cornerType?: 'gold' | 'silver' | 'none';
  variant?: 'default' | 'darker';
  className?: string; // Classes for the inner panel-base
  containerClassName?: string; // Classes for the outer relative container
  motionProps?: HTMLMotionProps<"div">;
}

export default function PanelFrame({
  children,
  cornerType = 'silver',
  variant = 'default',
  className = '',
  containerClassName = '',
  motionProps = {}
}: PanelFrameProps) {

  const baseStyle = variant === 'darker' 
    ? {
        background: 'linear-gradient(135deg, rgba(5, 5, 5, 0.98) 0%, rgba(0, 0, 0, 0.99) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }
    : {};

  return (
    <motion.div
      className={`relative ${containerClassName}`}
      {...motionProps}
    >
      {/* Corners */}
      {cornerType === 'gold' && (
        <>
          <GoldCorner position="top-left" className="z-20" />
          <GoldCorner position="top-right" className="z-20" />
          <GoldCorner position="bottom-left" className="z-20" />
          <GoldCorner position="bottom-right" className="z-20" />
        </>
      )}
      
      {cornerType === 'silver' && (
        <>
          <SilverCorner position="top-left" className="z-20" />
          <SilverCorner position="top-right" className="z-20" />
          <SilverCorner position="bottom-left" className="z-20" />
          <SilverCorner position="bottom-right" className="z-20" />
        </>
      )}

      {/* Main Panel Content */}
      <div 
        className={`panel-base p-6 rounded-[16px] clip-angled-border relative z-10 ${className}`}
        style={baseStyle}
      >
        {children}
      </div>
    </motion.div>
  );
}
