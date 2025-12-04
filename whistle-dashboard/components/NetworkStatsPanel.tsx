'use client';

import PanelFrame from './PanelFrame';

export default function NetworkStatsPanel() {
  return (
    <PanelFrame
      cornerType="silver"
      className="min-h-[320px] flex flex-col relative overflow-hidden"
      motionProps={{
        initial: { opacity: 0, x: -50 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.6, delay: 0.3 }
      }}
    >
      <h3 className="text-[11px] font-semibold mb-3 tracking-[0.15em] relative z-10">
        WHISTLE DEX
      </h3>

      {/* DEX iframe - scaled to show full page */}
      <div className="flex-1 relative z-10 rounded overflow-hidden border border-emerald-500/20">
        <div className="relative w-full h-full min-h-[280px] overflow-hidden">
          <iframe
            src="https://dex.whistle.ninja"
            style={{ 
              border: 'none',
              background: 'transparent',
              width: '400%',
              height: '400%',
              transform: 'scale(0.25)',
              transformOrigin: 'top left',
            }}
            allow="clipboard-write"
            loading="lazy"
          />
        </div>
      </div>
    </PanelFrame>
  );
}
