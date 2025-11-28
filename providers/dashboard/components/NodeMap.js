'use client'

import { useState, useEffect, memo } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup
} from 'react-simple-maps'
import { 
  Globe, 
  Activity, 
  Zap, 
  Server,
  TrendingUp,
  RefreshCw,
  MapPin,
  AlertCircle
} from 'lucide-react'

// World topology for the map
const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// Memoized Geography component to prevent re-renders
const MemoizedGeography = memo(({ geo }) => (
  <Geography
    geography={geo}
    fill="#1a1a2e"
    stroke="#2d2d44"
    strokeWidth={0.5}
    style={{
      default: { outline: 'none' },
      hover: { fill: '#252540', outline: 'none' },
      pressed: { outline: 'none' },
    }}
  />
))
MemoizedGeography.displayName = 'MemoizedGeography'

export function NodeMap() {
  const [nodes, setNodes] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    totalNodes: 0,
    activeNodes: 0,
    totalQueries: 0,
    totalBonded: 0,
  })

  // Fetch REAL providers from API (server-side to avoid CORS)
  const fetchNodes = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/providers')
      const data = await response.json()
      
      if (data.success && data.providers.length > 0) {
        console.log(`Loaded ${data.providers.length} providers from API`)
        setNodes(data.providers)
      } else {
        setNodes([])
        setError(data.error || 'No registered providers found yet. Be the first to register!')
      }
    } catch (err) {
      console.error('Error fetching providers:', err)
      setError('Failed to fetch providers')
      setNodes([])
    }
    
    setLoading(false)
  }

  useEffect(() => {
    fetchNodes()
    // Refresh every 60 seconds
    const interval = setInterval(fetchNodes, 60000)
    return () => clearInterval(interval)
  }, [])

  // Calculate stats from real data
  useEffect(() => {
    if (nodes.length > 0) {
      const activeNodes = nodes.filter(n => n.status === 'active')
      setStats({
        totalNodes: nodes.length,
        activeNodes: activeNodes.length,
        totalQueries: nodes.reduce((sum, n) => sum + (n.queriesServed || 0), 0),
        totalBonded: nodes.reduce((sum, n) => sum + (n.bondAmount || 0), 0),
      })
    } else {
      setStats({
        totalNodes: 0,
        activeNodes: 0,
        totalQueries: 0,
        totalBonded: 0,
      })
    }
  }, [nodes])

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-whistle-accent/20 rounded-lg">
              <Globe size={24} className="text-whistle-accent" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Global Node Network</h3>
              <p className="text-gray-500 text-sm">Real-time cache node distribution</p>
            </div>
          </div>
          <button
            onClick={fetchNodes}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-whistle-accent"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Server size={14} className="text-whistle-accent" />
              <span className="text-xl font-bold text-white">{stats.totalNodes}</span>
            </div>
            <p className="text-gray-500 text-xs">Providers</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Activity size={14} className="text-green-400" />
              <span className="text-xl font-bold text-green-400">{stats.activeNodes}</span>
            </div>
            <p className="text-gray-500 text-xs">Online</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUp size={14} className="text-blue-400" />
              <span className="text-xl font-bold text-white">
                {stats.totalQueries > 1000000 
                  ? `${(stats.totalQueries / 1000000).toFixed(1)}M`
                  : stats.totalQueries > 1000 
                    ? `${(stats.totalQueries / 1000).toFixed(0)}K`
                    : stats.totalQueries}
              </span>
            </div>
            <p className="text-gray-500 text-xs">Queries</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap size={14} className="text-yellow-400" />
              <span className="text-xl font-bold text-white">
                {stats.totalBonded > 1000000 
                  ? `${(stats.totalBonded / 1000000).toFixed(1)}M`
                  : stats.totalBonded > 1000 
                    ? `${(stats.totalBonded / 1000).toFixed(0)}K`
                    : stats.totalBonded.toFixed(0)}
              </span>
            </div>
            <p className="text-gray-500 text-xs">WHISTLE Bonded</p>
          </div>
        </div>
      </div>
      
      {/* Map Container */}
      <div className="relative bg-[#0d0d1a] h-[400px] md:h-[500px]">
        {/* Gradient overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d0d1a] via-transparent to-[#0d0d1a] pointer-events-none z-10 opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d1a] via-transparent to-[#0d0d1a] pointer-events-none z-10 opacity-20" />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 pointer-events-none z-10 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 255, 136, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 136, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
        
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 130,
            center: [0, 20]
          }}
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          <ZoomableGroup zoom={1} minZoom={1} maxZoom={4}>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <MemoizedGeography key={geo.rsmKey} geo={geo} />
                ))
              }
            </Geographies>
            
            {/* Connection lines between nearby nodes */}
            {nodes.filter(n => n.status === 'active').slice(0, 10).map((node, i, arr) => {
              const nextNode = arr[(i + 1) % arr.length]
              if (!nextNode) return null
              return (
                <line
                  key={`line-${i}`}
                  x1={node.coords[0]}
                  y1={node.coords[1]}
                  x2={nextNode.coords[0]}
                  y2={nextNode.coords[1]}
                  stroke="rgba(0, 255, 136, 0.1)"
                  strokeWidth={0.5}
                  strokeDasharray="2,2"
                />
              )
            })}
            
            {/* Node markers */}
            {nodes.map((node) => (
              <Marker
                key={node.id}
                coordinates={node.coords}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
                style={{ cursor: 'pointer' }}
              >
                {/* Pulse animation for active nodes */}
                {node.status === 'active' && (
                  <>
                    <circle
                      r={12}
                      fill="rgba(0, 255, 136, 0.2)"
                      className="animate-ping"
                      style={{ animationDuration: '2s' }}
                    />
                    <circle
                      r={8}
                      fill="rgba(0, 255, 136, 0.3)"
                    />
                  </>
                )}
                
                {/* Main dot */}
                <circle
                  r={node.status === 'active' ? 4 : 3}
                  fill={node.status === 'active' ? '#00ff88' : '#666666'}
                  stroke={hoveredNode?.id === node.id || selectedNode?.id === node.id ? '#ffffff' : 'transparent'}
                  strokeWidth={2}
                  style={{
                    filter: node.status === 'active' ? 'drop-shadow(0 0 6px rgba(0, 255, 136, 0.8))' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                />
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>
        
        {/* Hover tooltip */}
        {hoveredNode && !selectedNode && (
          <div className="absolute top-4 left-4 z-20 bg-gray-900/95 border border-gray-700 rounded-lg p-3 shadow-xl backdrop-blur-sm max-w-xs">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${hoveredNode.status === 'active' ? 'bg-green-400' : 'bg-gray-500'}`} />
              <span className="font-semibold text-white">{hoveredNode.name}</span>
              <span className="text-gray-500 text-xs">({hoveredNode.country})</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Bonded:</span>
                <span className="text-whistle-accent ml-1">{hoveredNode.bondAmount?.toLocaleString()} WHISTLE</span>
              </div>
              <div>
                <span className="text-gray-500">Queries:</span>
                <span className="text-green-400 ml-1">{hoveredNode.queriesServed?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Selected node detail panel */}
        {selectedNode && (
          <div className="absolute top-4 right-4 z-20 bg-gray-900/95 border border-whistle-accent/50 rounded-lg p-4 shadow-xl backdrop-blur-sm w-80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-whistle-accent" />
                <span className="font-bold text-white">{selectedNode.name}</span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-500 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-800">
                <span className="text-gray-500 text-sm">Status</span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  selectedNode.status === 'active' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {selectedNode.status === 'active' ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              
              {/* Endpoint */}
              <div className="py-2 border-b border-gray-800">
                <span className="text-gray-500 text-xs block mb-1">Endpoint</span>
                <a 
                  href={selectedNode.endpoint} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-whistle-accent text-sm font-mono truncate block hover:underline"
                >
                  {selectedNode.endpoint}
                </a>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800/50 rounded p-2 text-center">
                  <p className="text-whistle-accent font-bold">{selectedNode.bondAmount?.toLocaleString()}</p>
                  <p className="text-gray-500 text-xs">WHISTLE Bonded</p>
                </div>
                <div className="bg-gray-800/50 rounded p-2 text-center">
                  <p className="text-blue-400 font-bold">{selectedNode.queriesServed?.toLocaleString()}</p>
                  <p className="text-gray-500 text-xs">Queries Served</p>
                </div>
                <div className="bg-gray-800/50 rounded p-2 text-center">
                  <p className="text-purple-400 font-bold">{selectedNode.reputation}</p>
                  <p className="text-gray-500 text-xs">Reputation</p>
                </div>
                <div className="bg-gray-800/50 rounded p-2 text-center">
                  <p className="text-gray-300 font-bold">
                    {selectedNode.heartbeatAge < 60 
                      ? `${selectedNode.heartbeatAge}s ago`
                      : selectedNode.heartbeatAge < 3600 
                        ? `${Math.floor(selectedNode.heartbeatAge / 60)}m ago`
                        : `${Math.floor(selectedNode.heartbeatAge / 3600)}h ago`}
                  </p>
                  <p className="text-gray-500 text-xs">Last Heartbeat</p>
                </div>
              </div>
              
              <div className="bg-whistle-accent/10 border border-whistle-accent/30 rounded p-2 text-center">
                <p className="text-whistle-accent font-bold text-lg">{selectedNode.totalEarnings?.toFixed(4)} WHISTLE</p>
                <p className="text-gray-500 text-xs">Total Earned</p>
              </div>
              
              {selectedNode.wallet && (
                <div className="text-xs bg-gray-800/30 p-2 rounded">
                  <span className="text-gray-500">Provider Wallet: </span>
                  <a 
                    href={`https://solscan.io/account/${selectedNode.wallet}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 font-mono hover:text-whistle-accent"
                  >
                    {selectedNode.wallet.slice(0, 6)}...{selectedNode.wallet.slice(-4)}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 bg-gray-900/80 px-2 py-1 rounded">
            <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(0,255,136,0.8)]" />
            <span className="text-gray-400">Active</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-900/80 px-2 py-1 rounded">
            <div className="w-2 h-2 rounded-full bg-gray-500" />
            <span className="text-gray-400">Inactive</span>
          </div>
        </div>
        
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-[#0d0d1a]/80 flex items-center justify-center z-30">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw size={32} className="text-whistle-accent animate-spin" />
              <span className="text-gray-400 text-sm">Fetching providers from blockchain...</span>
            </div>
          </div>
        )}
        
        {/* Empty state */}
        {!loading && nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="bg-gray-900/90 border border-gray-700 rounded-xl p-8 text-center max-w-md pointer-events-auto">
              <div className="w-16 h-16 rounded-full bg-whistle-accent/20 flex items-center justify-center mx-auto mb-4">
                <Globe size={32} className="text-whistle-accent" />
              </div>
              <h4 className="text-white text-lg font-bold mb-2">No Providers Yet</h4>
              <p className="text-gray-400 text-sm mb-4">
                {error || 'Be the first to register as a provider and appear on the global map!'}
              </p>
              <a 
                href="#provider-onboarding" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-whistle-accent text-black font-semibold rounded-lg hover:bg-whistle-accent/90 transition-colors"
              >
                <Server size={16} />
                Register as Provider
              </a>
            </div>
          </div>
        )}
        
        {/* Error toast */}
        {error && nodes.length > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

