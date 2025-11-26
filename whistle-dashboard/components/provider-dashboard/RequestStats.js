'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload
  return (
    <div className="bg-whistle-dark border border-gray-700 rounded-lg p-3 shadow-xl">
      <p className="text-white font-mono font-bold">{data.method}</p>
      <p className="text-gray-400 text-sm">Count: {data.count}</p>
      <p className="text-gray-400 text-sm">Avg Latency: {data.avgLatencyMs}ms</p>
      {data.errors > 0 && (
        <p className="text-whistle-red text-sm">Errors: {data.errors}</p>
      )}
    </div>
  )
}

export function RequestStats({ stats, loading }) {
  if (loading) {
    return (
      <div className="card p-6">
        <div className="h-64 bg-gray-800/50 rounded animate-pulse" />
      </div>
    )
  }

  const byMethod = stats?.byMethod || {}
  const data = Object.entries(byMethod)
    .map(([method, info]) => ({
      method: method.replace('get', ''),
      ...info
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  if (data.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">RPC Requests by Method</h3>
        <div className="h-48 flex items-center justify-center text-gray-500">
          No request data available yet
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">RPC Requests by Method</h3>
        <div className="text-sm text-gray-400">
          Total: <span className="text-white font-mono">{stats?.total?.toLocaleString() || 0}</span>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
            <XAxis type="number" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis 
              type="category" 
              dataKey="method" 
              stroke="#6b7280" 
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              width={120}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="count" 
              fill="#00f0ff" 
              radius={[0, 4, 4, 0]}
              maxBarSize={30}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-800">
        <div className="text-center">
          <p className="text-gray-400 text-sm">Avg Latency</p>
          <p className="text-xl font-mono text-whistle-accent">
            {stats?.avgLatencyMs || 0}ms
          </p>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-sm">Methods</p>
          <p className="text-xl font-mono text-white">
            {Object.keys(byMethod).length}
          </p>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-sm">Time Window</p>
          <p className="text-xl font-mono text-white">
            {stats?.hours || 1}h
          </p>
        </div>
      </div>
    </div>
  )
}

