'use client'

import { Activity, Cpu, Clock, Database, TrendingUp, Zap } from 'lucide-react'

export function StatsGrid({ metrics, loading }) {
  const stats = [
    {
      label: 'Current Slot',
      value: metrics?.chain?.slot?.toLocaleString() || '—',
      icon: Activity,
      color: 'text-whistle-accent'
    },
    {
      label: 'Block Height',
      value: metrics?.chain?.blockHeight?.toLocaleString() || '—',
      icon: Database,
      color: 'text-whistle-green'
    },
    {
      label: 'TPS',
      value: metrics?.chain?.tps?.toFixed(0) || '—',
      icon: TrendingUp,
      color: 'text-yellow-400'
    },
    {
      label: 'Latency',
      value: metrics?.rpc?.latency ? `${metrics.rpc.latency}ms` : '—',
      icon: Clock,
      color: 'text-purple-400'
    },
    {
      label: 'Total Requests',
      value: metrics?.rpc?.totalRequests?.toLocaleString() || '0',
      icon: Zap,
      color: 'text-blue-400'
    },
    {
      label: 'Epoch',
      value: metrics?.chain?.epoch || '—',
      icon: Cpu,
      color: 'text-orange-400'
    }
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card p-4">
            <div className="h-16 bg-gray-800/50 rounded animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div key={index} className="card p-4">
            <div className="card-inner">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={stat.color} />
                <span className="text-gray-500 text-xs uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className={`text-xl font-mono font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
