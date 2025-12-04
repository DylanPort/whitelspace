'use client'

import { Server, Cpu, HardDrive, Activity, ExternalLink } from 'lucide-react'

export function ValidatorInfo({ metrics, loading }) {
  if (loading) {
    return (
      <div className="card p-6">
        <div className="card-inner">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="text-whistle-accent">⚡</span>
            Validator Info
          </h3>
          <div className="h-32 bg-whistle-dark animate-pulse" />
        </div>
      </div>
    )
  }

  const version = metrics?.chain?.version || 'Unknown'
  const identity = metrics?.chain?.identity || null

  return (
    <div className="card p-6">
      <div className="card-inner">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="text-whistle-accent">⚡</span>
          Validator Info
        </h3>

        <div className="space-y-4">
          {/* Version */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-gray-500" />
              <span className="text-gray-500 text-sm uppercase tracking-wider">Version</span>
            </div>
            <span className="text-white font-mono text-sm">{version}</span>
          </div>

          {/* RPC Endpoint */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server size={14} className="text-gray-500" />
              <span className="text-gray-500 text-sm uppercase tracking-wider">RPC</span>
            </div>
            <a 
              href="https://rpc.whistle.ninja"
              target="_blank"
              rel="noopener noreferrer"
              className="text-whistle-accent font-mono text-sm hover:underline flex items-center gap-1"
            >
              whistle.ninja
              <ExternalLink size={10} />
            </a>
          </div>

          {/* Network */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-gray-500" />
              <span className="text-gray-500 text-sm uppercase tracking-wider">Network</span>
            </div>
            <span className="text-whistle-accent font-mono text-sm uppercase">Mainnet</span>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive size={14} className="text-gray-500" />
              <span className="text-gray-500 text-sm uppercase tracking-wider">Status</span>
            </div>
            <span className="status-online font-mono font-bold text-sm">HEALTHY</span>
          </div>

          {/* Identity (if available) */}
          {identity && (
            <div className="pt-2 border-t border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs uppercase tracking-wider">Identity</span>
                <a 
                  href={`https://solscan.io/account/${identity}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-whistle-accent font-mono text-xs hover:underline flex items-center gap-1"
                >
                  {identity.slice(0, 8)}...{identity.slice(-4)}
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
