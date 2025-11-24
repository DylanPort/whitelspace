import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import ProviderDashboard from './ProviderDashboard';

export default function BecomeProviderSection() {
  const { connected, publicKey } = useWallet();
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (showDashboard) {
    return (
      <div className="provider-dashboard-wrapper">
        <button 
          onClick={() => setShowDashboard(false)}
          className="back-button"
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          ← Back to Dashboard
        </button>
        <ProviderDashboard />
      </div>
    );
  }

  return (
    <div className="become-provider-section" style={{
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      borderRadius: '16px',
      padding: '24px',
      marginTop: '24px',
      color: 'white'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            marginBottom: '8px',
            background: 'linear-gradient(90deg, #8B5CF6 0%, #3B82F6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            BECOME A PROVIDER
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
            Run a WHISTLE node and earn SOL by serving RPC queries to the network.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>AVG EARNINGS</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>$200/mo</p>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#10B981' }}>✓</span>
          <span style={{ fontSize: '14px' }}>Earn SOL per query</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#10B981' }}>✓</span>
          <span style={{ fontSize: '14px' }}>No rate limits</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#10B981' }}>✓</span>
          <span style={{ fontSize: '14px' }}>Decentralized network</span>
        </div>
      </div>

      {!showSetup ? (
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowSetup(true)}
            style={{
              flex: 1,
              padding: '12px',
              background: 'linear-gradient(90deg, #8B5CF6 0%, #3B82F6 100%)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            QUICK START →
          </button>
          
          {connected && (
            <button
              onClick={() => setShowDashboard(true)}
              style={{
                flex: 1,
                padding: '12px',
                background: 'transparent',
                border: '1px solid rgba(139, 92, 246, 0.5)',
                borderRadius: '8px',
                color: '#8B5CF6',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#8B5CF6';
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              OPEN DASHBOARD
            </button>
          )}
        </div>
      ) : (
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '12px',
          padding: '20px',
          marginTop: '20px'
        }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', color: '#8B5CF6' }}>
            Quick Setup - Start Earning in 5 Minutes
          </h3>
          
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
              STEP 1: Install Docker (if not installed)
            </p>
            <div style={{
              background: '#1a1a1a',
              padding: '12px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '13px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <code style={{ color: '#10B981' }}>
                curl -fsSL https://get.docker.com | sh
              </code>
              <button
                onClick={() => copyToClipboard('curl -fsSL https://get.docker.com | sh')}
                style={{
                  background: 'rgba(139, 92, 246, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                {copied ? '✓' : 'COPY'}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
              STEP 2: Run WHISTLE Cache Node
            </p>
            <div style={{
              background: '#1a1a1a',
              padding: '12px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '13px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <code style={{ color: '#10B981', wordBreak: 'break-all' }}>
                docker run -d --name whistle-cache -e WALLET={publicKey?.toBase58() || 'YOUR_WALLET'} whistlenet/cache-node
              </code>
              <button
                onClick={() => copyToClipboard(`docker run -d --name whistle-cache -e WALLET=${publicKey?.toBase58() || 'YOUR_WALLET'} whistlenet/cache-node`)}
                style={{
                  background: 'rgba(139, 92, 246, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  marginLeft: '8px',
                  flexShrink: 0
                }}
              >
                {copied ? '✓' : 'COPY'}
              </button>
            </div>
          </div>

          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px'
          }}>
            <p style={{ fontSize: '13px', color: '#10B981' }}>
              ✓ That's it! Your node will start earning SOL immediately.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>MINIMUM REQUIREMENTS</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>2GB RAM • 10GB Storage</p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>RECOMMENDED VPS</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>DigitalOcean $6/mo</p>
            </div>
          </div>

          <button
            onClick={() => setShowSetup(false)}
            style={{
              width: '100%',
              marginTop: '16px',
              padding: '8px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Close Setup Guide
          </button>
        </div>
      )}

      <div style={{
        marginTop: '20px',
        paddingTop: '20px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.5)'
      }}>
        <span>• Min stake: 100 WHISTLE</span>
        <span>• 2TB NVMe storage</span>
        <span>• 64GB RAM (recommended)</span>
        <span>• 99%+ uptime</span>
      </div>
    </div>
  );
}

import { useWallet } from '@solana/wallet-adapter-react';
import ProviderDashboard from './ProviderDashboard';

export default function BecomeProviderSection() {
  const { connected, publicKey } = useWallet();
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (showDashboard) {
    return (
      <div className="provider-dashboard-wrapper">
        <button 
          onClick={() => setShowDashboard(false)}
          className="back-button"
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          ← Back to Dashboard
        </button>
        <ProviderDashboard />
      </div>
    );
  }

  return (
    <div className="become-provider-section" style={{
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      borderRadius: '16px',
      padding: '24px',
      marginTop: '24px',
      color: 'white'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            marginBottom: '8px',
            background: 'linear-gradient(90deg, #8B5CF6 0%, #3B82F6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            BECOME A PROVIDER
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
            Run a WHISTLE node and earn SOL by serving RPC queries to the network.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>AVG EARNINGS</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>$200/mo</p>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#10B981' }}>✓</span>
          <span style={{ fontSize: '14px' }}>Earn SOL per query</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#10B981' }}>✓</span>
          <span style={{ fontSize: '14px' }}>No rate limits</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#10B981' }}>✓</span>
          <span style={{ fontSize: '14px' }}>Decentralized network</span>
        </div>
      </div>

      {!showSetup ? (
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowSetup(true)}
            style={{
              flex: 1,
              padding: '12px',
              background: 'linear-gradient(90deg, #8B5CF6 0%, #3B82F6 100%)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            QUICK START →
          </button>
          
          {connected && (
            <button
              onClick={() => setShowDashboard(true)}
              style={{
                flex: 1,
                padding: '12px',
                background: 'transparent',
                border: '1px solid rgba(139, 92, 246, 0.5)',
                borderRadius: '8px',
                color: '#8B5CF6',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#8B5CF6';
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              OPEN DASHBOARD
            </button>
          )}
        </div>
      ) : (
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '12px',
          padding: '20px',
          marginTop: '20px'
        }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', color: '#8B5CF6' }}>
            Quick Setup - Start Earning in 5 Minutes
          </h3>
          
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
              STEP 1: Install Docker (if not installed)
            </p>
            <div style={{
              background: '#1a1a1a',
              padding: '12px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '13px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <code style={{ color: '#10B981' }}>
                curl -fsSL https://get.docker.com | sh
              </code>
              <button
                onClick={() => copyToClipboard('curl -fsSL https://get.docker.com | sh')}
                style={{
                  background: 'rgba(139, 92, 246, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                {copied ? '✓' : 'COPY'}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
              STEP 2: Run WHISTLE Cache Node
            </p>
            <div style={{
              background: '#1a1a1a',
              padding: '12px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '13px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <code style={{ color: '#10B981', wordBreak: 'break-all' }}>
                docker run -d --name whistle-cache -e WALLET={publicKey?.toBase58() || 'YOUR_WALLET'} whistlenet/cache-node
              </code>
              <button
                onClick={() => copyToClipboard(`docker run -d --name whistle-cache -e WALLET=${publicKey?.toBase58() || 'YOUR_WALLET'} whistlenet/cache-node`)}
                style={{
                  background: 'rgba(139, 92, 246, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  marginLeft: '8px',
                  flexShrink: 0
                }}
              >
                {copied ? '✓' : 'COPY'}
              </button>
            </div>
          </div>

          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px'
          }}>
            <p style={{ fontSize: '13px', color: '#10B981' }}>
              ✓ That's it! Your node will start earning SOL immediately.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>MINIMUM REQUIREMENTS</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>2GB RAM • 10GB Storage</p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>RECOMMENDED VPS</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>DigitalOcean $6/mo</p>
            </div>
          </div>

          <button
            onClick={() => setShowSetup(false)}
            style={{
              width: '100%',
              marginTop: '16px',
              padding: '8px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Close Setup Guide
          </button>
        </div>
      )}

      <div style={{
        marginTop: '20px',
        paddingTop: '20px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.5)'
      }}>
        <span>• Min stake: 100 WHISTLE</span>
        <span>• 2TB NVMe storage</span>
        <span>• 64GB RAM (recommended)</span>
        <span>• 99%+ uptime</span>
      </div>
    </div>
  );
}
