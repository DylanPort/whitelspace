'use client';

import PanelFrame from './PanelFrame';

export default function ApiMethodsPanel() {
  return (
    <PanelFrame
      cornerType="silver"
      className="h-[280px] flex flex-col"
      motionProps={{
        initial: { opacity: 0, x: -50 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.6, delay: 0.5 }
      }}
    >
      <h3 className="text-[11px] font-semibold mb-3 tracking-[0.15em]">
        RPC HEALTH
      </h3>

      {/* Health iframe - scaled to show full page */}
      <div className="flex-1 rounded overflow-hidden border border-emerald-500/20">
        <div className="relative w-full h-full overflow-hidden">
          <iframe
            src="https://health.whistle.ninja"
            style={{ 
              border: 'none',
              background: 'transparent',
              width: '400%',
              height: '400%',
              transform: 'scale(0.25)',
              transformOrigin: 'top left',
            }}
            loading="lazy"
          />
        </div>
      </div>
    </PanelFrame>
  );
}
