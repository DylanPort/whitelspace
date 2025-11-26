'use client'

import { Users, ExternalLink, Clock } from 'lucide-react'
import { useProviders } from '../lib/hooks'

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Never'
  
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function truncateAddress(address) {
  if (!address) return '—'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function ProvidersList() {
  const { providers, loading, error } = useProviders()

  if (loading) {
    return (
      <div className="card p-6">
        <div className="h-48 bg-gray-800/50 rounded animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="text-center py-8 text-gray-500">
          Failed to load providers: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users size={20} className="text-whistle-accent" />
          Registered Providers
        </h3>
        <span className="text-sm text-gray-400">
          {providers.length} total
        </span>
      </div>

      {providers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No providers registered yet. Be the first!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-gray-800">
                <th className="pb-3 font-medium">Wallet</th>
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider) => (
                <tr key={provider.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-3">
                    <a
                      href={`https://solscan.io/account/${provider.wallet}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-mono text-whistle-accent hover:underline"
                    >
                      {truncateAddress(provider.wallet)}
                      <ExternalLink size={12} />
                    </a>
                  </td>
                  <td className="py-3 text-white">
                    {provider.name || <span className="text-gray-500">—</span>}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      provider.provider_type === 'validator'
                        ? 'bg-whistle-accent/20 text-whistle-accent'
                        : 'bg-whistle-accent2/20 text-whistle-accent2'
                    }`}>
                      {provider.provider_type}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      provider.status === 'active'
                        ? 'bg-whistle-green/20 text-whistle-green'
                        : 'bg-whistle-yellow/20 text-whistle-yellow'
                    }`}>
                      {provider.status}
                    </span>
                  </td>
                  <td className="py-3 text-gray-400 text-sm">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatTimeAgo(provider.last_seen)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

