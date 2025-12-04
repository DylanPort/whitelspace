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

      {/* DEX iframe */}
      <div className="flex-1 relative z-10 rounded overflow-hidden border border-emerald-500/20">
        <iframe
          src="https://dex.whistle.ninja"
          className="w-full h-full min-h-[280px]"
          style={{ 
            border: 'none',
            background: 'transparent'
          }}
          allow="clipboard-write"
          loading="lazy"
        />
      </div>
    </PanelFrame>
  );
}
