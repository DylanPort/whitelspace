'use client';

import PanelFrame from './PanelFrame';

export default function RpcEndpointPanel() {
  return (
    <PanelFrame
      cornerType="gold"
      motionProps={{
        initial: { opacity: 0, x: -50 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.6, delay: 0.3 }
      }}
    >
      <h3 className="text-[11px] font-semibold mb-4 tracking-[0.15em]">
        RPC ENDPOINT
      </h3>

      <div className="space-y-2">
        {/* Coming Soon Message */}
        <div className="py-2 text-center">
          <div className="text-gray-600 text-lg mb-1">🔒</div>
          <div className="text-gray-500 text-[10px] tracking-wider mb-1">
            ENDPOINTS RESTRICTED
          </div>
          <div className="text-gray-600 text-[9px] leading-relaxed">
            RPC access coming soon
          </div>
        </div>

        {/* Stats */}
        <div className="pt-2 border-t border-white/10 space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-500">Status</span>
            <span className="font-semibold text-gray-600">Private</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-500">Network</span>
            <span className="font-semibold">Mainnet</span>
          </div>
        </div>
      </div>
    </PanelFrame>
  );
}
