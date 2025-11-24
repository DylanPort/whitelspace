import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { 
  Server, 
  DollarSign, 
  Activity, 
  Globe, 
  Zap, 
  TrendingUp,
  Download,
  Copy,
  CheckCircle,
  AlertCircle,
  Terminal,
  Cpu,
  HardDrive,
  Wifi,
  BarChart3,
  Clock
} from 'lucide-react';
import { 
  getCacheNodeStats, 
  getNetworkStats, 
  calculateEarnings,
  getEarningsHistory,
  claimEarnings,
  PAYMENT_SPLIT 
} from '../lib/cache-node-api';

export default function ProviderDashboardDark() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [activeTab, setActiveTab] = useState<'overview' | 'setup' | 'nodes' | 'earnings' | 'rpc'>('overview');
  const [userNodes, setUserNodes] = useState<any[]>([]);
  const [networkStats, setNetworkStats] = useState<any>(null);
  const [earningsHistory, setEarningsHistory] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claimingEarnings, setClaimingEarnings] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!publicKey) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Fetch user's cache nodes
        const nodes = await getCacheNodeStats(publicKey.toBase58());
        setUserNodes(nodes);
        
        // Fetch network stats
        const stats = await getNetworkStats();
        setNetworkStats(stats);
        
        // Fetch earnings history
        const history = await getEarningsHistory(publicKey.toBase58(), connection);
        setEarningsHistory(history);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [publicKey, connection]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleClaimEarnings = async () => {
    if (!publicKey) return;
    
    setClaimingEarnings(true);
    try {
      const result = await claimEarnings(publicKey.toBase58(), connection);
      if (result.success) {
        alert(`Successfully claimed ${result.amount.toFixed(4)} SOL!`);
        // Refresh data
        const nodes = await getCacheNodeStats(publicKey.toBase58());
        setUserNodes(nodes);
      } else {
        alert('Failed to claim earnings. Please try again.');
      }
    } catch (error) {
      console.error('Error claiming earnings:', error);
      alert('Error claiming earnings');
    } finally {
      setClaimingEarnings(false);
    }
  };
  
  // Calculate total earnings and payment split
  const totalCacheHits = userNodes.reduce((sum, n) => sum + (n.cacheHits || 0), 0);
  const earningsBreakdown = calculateEarnings(totalCacheHits);

  const cardStyle = {
    background: 'rgba(20, 20, 20, 0.8)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '12px',
    padding: '20px',
    backdropFilter: 'blur(10px)'
  };

  const buttonStyle = {
    background: 'linear-gradient(90deg, #8B5CF6 0%, #3B82F6 100%)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    padding: '10px 20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0a0a0a',
      color: 'white',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 'bold',
          background: 'linear-gradient(90deg, #8B5CF6 0%, #3B82F6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px'
        }}>
          Provider Dashboard
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>
          Manage your WHISTLE cache nodes and track earnings
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '4px' }}>
                ACTIVE NODES
              </p>
              <p style={{ fontSize: '28px', fontWeight: 'bold' }}>{userNodes.length}</p>
            </div>
            <Server style={{ width: '32px', height: '32px', color: '#8B5CF6' }} />
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '4px' }}>
                CACHE HITS TODAY
              </p>
              <p style={{ fontSize: '28px', fontWeight: 'bold' }}>
                {(userNodes.reduce((sum, n) => sum + n.cacheHits, 0) / 1000).toFixed(1)}k
              </p>
            </div>
            <Activity style={{ width: '32px', height: '32px', color: '#3B82F6' }} />
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '4px' }}>
                TOTAL EARNINGS
              </p>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#10B981' }}>
                {userNodes.reduce((sum, n) => sum + n.earnings, 0).toFixed(3)} SOL
              </p>
            </div>
            <DollarSign style={{ width: '32px', height: '32px', color: '#10B981' }} />
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '4px' }}>
                AVG UPTIME
              </p>
              <p style={{ fontSize: '28px', fontWeight: 'bold' }}>
                {userNodes.length > 0 ? 
                  (userNodes.reduce((sum, n) => sum + n.uptime, 0) / userNodes.length).toFixed(1) : 0}%
              </p>
            </div>
            <TrendingUp style={{ width: '32px', height: '32px', color: '#F59E0B' }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '20px',
        marginBottom: '30px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: '10px'
      }}>
        {['overview', 'setup', 'nodes', 'earnings', 'rpc'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              background: 'transparent',
              border: 'none',
              color: activeTab === tab ? '#8B5CF6' : 'rgba(255,255,255,0.5)',
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              borderBottom: activeTab === tab ? '2px solid #8B5CF6' : 'none',
              transition: 'all 0.2s'
            }}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: '20px', marginBottom: '20px', color: '#8B5CF6' }}>
              Network Overview
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '20px'
            }}>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{networkStats?.totalNodes}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Total Nodes</p>
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>
                  {networkStats?.activeNodes}
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Active Now</p>
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#3B82F6' }}>
                  {((networkStats?.totalCacheHits || 0) / 1000000).toFixed(1)}M
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Total Hits</p>
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#F59E0B' }}>
                  {networkStats?.avgResponseTime}ms
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Avg Response</p>
              </div>
            </div>
          </div>

          {userNodes.length === 0 && (
            <div style={{ 
              ...cardStyle, 
              marginTop: '20px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
              textAlign: 'center'
            }}>
              <h3 style={{ fontSize: '24px', marginBottom: '10px' }}>
                Ready to Start Earning?
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '20px' }}>
                Set up your first cache node in under 5 minutes
              </p>
              <button
                onClick={() => setActiveTab('setup')}
                style={buttonStyle}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                Setup Your First Node →
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'setup' && (
        <div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: '20px', marginBottom: '20px', color: '#8B5CF6' }}>
              Quick Setup Guide
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
                Step 1: Install Docker
              </p>
              <div style={{
                background: '#1a1a1a',
                padding: '15px',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <code style={{ color: '#10B981', fontFamily: 'monospace' }}>
                  curl -fsSL https://get.docker.com | sh
                </code>
                <button
                  onClick={() => copyToClipboard('curl -fsSL https://get.docker.com | sh')}
                  style={{
                    background: 'rgba(139, 92, 246, 0.2)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '4px',
                    color: 'white',
                    padding: '6px 12px',
                    cursor: 'pointer'
                  }}
                >
                  {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
                Step 2: Run Cache Node
              </p>
              <div style={{
                background: '#1a1a1a',
                padding: '15px',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <code style={{ color: '#10B981', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  docker run -d --name whistle-cache -e WALLET={publicKey?.toBase58() || 'YOUR_WALLET'} whistlenet/cache-node
                </code>
                <button
                  onClick={() => copyToClipboard(`docker run -d --name whistle-cache -e WALLET=${publicKey?.toBase58() || 'YOUR_WALLET'} whistlenet/cache-node`)}
                  style={{
                    background: 'rgba(139, 92, 246, 0.2)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '4px',
                    color: 'white',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    marginLeft: '10px'
                  }}
                >
                  {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              padding: '15px'
            }}>
              <p style={{ color: '#10B981' }}>
                ✓ That's it! Your node will start earning SOL immediately.
              </p>
            </div>
          </div>

          <div style={{ ...cardStyle, marginTop: '20px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Minimum Requirements</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Cpu size={20} style={{ color: '#8B5CF6' }} />
                <span>1 CPU Core</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <HardDrive size={20} style={{ color: '#8B5CF6' }} />
                <span>2GB RAM</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <HardDrive size={20} style={{ color: '#8B5CF6' }} />
                <span>10GB Storage</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Wifi size={20} style={{ color: '#8B5CF6' }} />
                <span>10 Mbps Internet</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'nodes' && (
        <div>
          {userNodes.length > 0 ? (
            userNodes.map(node => (
              <div key={node.id} style={{ ...cardStyle, marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: node.status === 'online' ? '#10B981' : '#EF4444',
                      animation: node.status === 'online' ? 'pulse 2s infinite' : 'none'
                    }} />
                    <div>
                      <h4 style={{ fontSize: '18px', fontWeight: 'bold' }}>{node.id}</h4>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{node.location}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Earnings</p>
                    <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#10B981' }}>
                      {node.earnings.toFixed(4)} SOL
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Uptime</p>
                    <p style={{ fontSize: '16px', fontWeight: 'bold' }}>{node.uptime}%</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Cache Hits</p>
                    <p style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      {(node.cacheHits / 1000).toFixed(1)}k
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>CPU</p>
                    <p style={{ fontSize: '16px', fontWeight: 'bold' }}>{node.performance.cpu}%</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Memory</p>
                    <p style={{ fontSize: '16px', fontWeight: 'bold' }}>{node.performance.memory}%</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button style={{
                    flex: 1,
                    padding: '8px',
                    background: 'transparent',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '6px',
                    color: '#8B5CF6',
                    cursor: 'pointer'
                  }}>
                    View Logs
                  </button>
                  <button style={{
                    flex: 1,
                    padding: '8px',
                    background: 'transparent',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    color: '#EF4444',
                    cursor: 'pointer'
                  }}>
                    Stop Node
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '40px' }}>
              <Server size={48} style={{ color: 'rgba(255,255,255,0.3)', margin: '0 auto 20px' }} />
              <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>No Nodes Running</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>
                Start your first node to begin earning SOL
              </p>
              <button
                onClick={() => setActiveTab('setup')}
                style={buttonStyle}
              >
                Setup Your First Node
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'earnings' && (
        <div>
          {/* Payment Split Info */}
          <div style={{ ...cardStyle, marginBottom: '20px', background: 'rgba(139, 92, 246, 0.1)' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#8B5CF6' }}>
              Revenue Distribution Model
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>70%</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Your Earnings</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Direct to wallet</p>
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#F59E0B' }}>20%</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Bonus Pool</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Top performers</p>
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#3B82F6' }}>5%</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Treasury</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Development</p>
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#8B5CF6' }}>5%</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Stakers</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>WHISTLE holders</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
            <div style={{
              ...cardStyle,
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)'
            }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                CACHE HITS TODAY
              </p>
              <p style={{ fontSize: '28px', fontWeight: 'bold' }}>
                {totalCacheHits.toLocaleString()}
              </p>
              <p style={{ fontSize: '12px', color: '#8B5CF6' }}>
                = {earningsBreakdown.providerShare.toFixed(4)} SOL
              </p>
            </div>

            <div style={{
              ...cardStyle,
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)'
            }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                PENDING EARNINGS
              </p>
              <p style={{ fontSize: '28px', fontWeight: 'bold' }}>
                {userNodes.reduce((sum, n) => sum + (n.earnings?.pending || 0), 0).toFixed(4)} SOL
              </p>
              <button
                onClick={handleClaimEarnings}
                disabled={claimingEarnings || !publicKey}
                style={{
                  marginTop: '8px',
                  padding: '6px 12px',
                  background: '#10B981',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '12px',
                  cursor: claimingEarnings ? 'not-allowed' : 'pointer',
                  opacity: claimingEarnings ? 0.5 : 1
                }}
              >
                {claimingEarnings ? 'Claiming...' : 'Claim Now'}
              </button>
            </div>

            <div style={{
              ...cardStyle,
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)'
            }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                TOTAL EARNED
              </p>
              <p style={{ fontSize: '28px', fontWeight: 'bold' }}>
                {userNodes.reduce((sum, n) => sum + (n.earnings?.total || 0), 0).toFixed(3)} SOL
              </p>
              <p style={{ fontSize: '12px', color: '#10B981' }}>
                ≈ ${(userNodes.reduce((sum, n) => sum + (n.earnings?.total || 0), 0) * 200).toFixed(2)}
              </p>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ fontSize: '20px', marginBottom: '20px' }}>Recent Payments</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { date: '2024-01-15 14:23', amount: 0.152, status: 'completed' },
                { date: '2024-01-15 10:15', amount: 0.089, status: 'completed' },
                { date: '2024-01-14 22:45', amount: 0.203, status: 'completed' },
              ].map((payment, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '15px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div>
                    <p style={{ fontSize: '14px' }}>{payment.date}</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Cache hit rewards</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <p style={{ fontSize: '16px', fontWeight: 'bold' }}>{payment.amount} SOL</p>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10B981'
                    }}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
              <p style={{ fontSize: '28px', fontWeight: 'bold' }}>
                {totalCacheHits.toLocaleString()}
              </p>
              <p style={{ fontSize: '12px', color: '#8B5CF6' }}>
                = {earningsBreakdown.providerShare.toFixed(4)} SOL
              </p>
            </div>

            <div style={{
              ...cardStyle,
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)'
            }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                PENDING EARNINGS
              </p>
              <p style={{ fontSize: '28px', fontWeight: 'bold' }}>
                {userNodes.reduce((sum, n) => sum + (n.earnings?.pending || 0), 0).toFixed(4)} SOL
              </p>
              <button
                onClick={handleClaimEarnings}
                disabled={claimingEarnings || !publicKey}
                style={{
                  marginTop: '8px',
                  padding: '6px 12px',
                  background: '#10B981',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '12px',
                  cursor: claimingEarnings ? 'not-allowed' : 'pointer',
                  opacity: claimingEarnings ? 0.5 : 1
                }}
              >
                {claimingEarnings ? 'Claiming...' : 'Claim Now'}
              </button>
            </div>

            <div style={{
              ...cardStyle,
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)'
            }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                TOTAL EARNED
              </p>
              <p style={{ fontSize: '28px', fontWeight: 'bold' }}>
                {userNodes.reduce((sum, n) => sum + (n.earnings?.total || 0), 0).toFixed(3)} SOL
              </p>
              <p style={{ fontSize: '12px', color: '#10B981' }}>
                ≈ ${(userNodes.reduce((sum, n) => sum + (n.earnings?.total || 0), 0) * 200).toFixed(2)}
              </p>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ fontSize: '20px', marginBottom: '20px' }}>Recent Payments</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { date: '2024-01-15 14:23', amount: 0.152, status: 'completed' },
                { date: '2024-01-15 10:15', amount: 0.089, status: 'completed' },
                { date: '2024-01-14 22:45', amount: 0.203, status: 'completed' },
              ].map((payment, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '15px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div>
                    <p style={{ fontSize: '14px' }}>{payment.date}</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Cache hit rewards</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <p style={{ fontSize: '16px', fontWeight: 'bold' }}>{payment.amount} SOL</p>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10B981'
                    }}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
