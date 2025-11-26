'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  })
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="bg-whistle-dark border border-gray-700 rounded-lg p-3 shadow-xl">
      <p className="text-gray-400 text-xs mb-2">
        {new Date(label).toLocaleString()}
      </p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: <span className="font-mono font-bold">{entry.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  )
}

export function MetricsChart({ history, loading }) {
  const [metric, setMetric] = useState('slot')
  
  if (loading) {
    return (
      <div className="card p-6">
        <div className="h-64 bg-gray-800/50 rounded animate-pulse" />
      </div>
    )
  }

  const data = history?.data || []
  
  if (data.length === 0) {
    return (
      <div className="card p-6">
        <div className="h-64 flex items-center justify-center text-gray-500">
          No historical data available yet
        </div>
      </div>
    )
  }

  const metrics = [
    { key: 'slot', label: 'Slot', color: '#00f0ff' },
    { key: 'tps', label: 'TPS', color: '#10b981' },
    { key: 'epoch_progress', label: 'Epoch %', color: '#7c3aed' }
  ]

  const currentMetric = metrics.find(m => m.key === metric) || metrics[0]

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Performance History</h3>
        <div className="flex gap-2">
          {metrics.map(m => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                metric === m.key 
                  ? 'bg-whistle-accent/20 text-whistle-accent border border-whistle-accent/50' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={currentMetric.color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={currentMetric.color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatTime}
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <YAxis 
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(0)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={currentMetric.key}
              name={currentMetric.label}
              stroke={currentMetric.color}
              strokeWidth={2}
              fill="url(#colorGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

