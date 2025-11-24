import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import ProviderDashboardDark from '../components/ProviderDashboardDark';
import BecomeProviderSection from '../components/BecomeProviderSection';

export default function ProviderPage() {
  const { connected } = useWallet();

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0a0a0a',
      color: 'white'
    }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              background: 'linear-gradient(90deg, #8B5CF6 0%, #3B82F6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              WHISTLE NETWORK
            </h1>
            <nav style={{ display: 'flex', gap: '30px' }}>
              <a href="/" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
                Dashboard
              </a>
              <a href="/provider" style={{ color: 'white', textDecoration: 'none' }}>
                Provider
              </a>
              <a href="/staking" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
                Staking
              </a>
            </nav>
          </div>
          <WalletMultiButton />
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        {connected ? (
          <ProviderDashboardDark />
        ) : (
          <div>
            {/* Hero Section */}
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              marginBottom: '40px'
            }}>
              <h2 style={{
                fontSize: '48px',
                fontWeight: 'bold',
                marginBottom: '20px',
                background: 'linear-gradient(90deg, #8B5CF6 0%, #3B82F6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Become a WHISTLE Provider
              </h2>
              <p style={{
                fontSize: '20px',
                color: 'rgba(255,255,255,0.7)',
                marginBottom: '30px',
                maxWidth: '600px',
                margin: '0 auto 30px'
              }}>
                Run a cache node and earn SOL by serving RPC queries to the decentralized network
              </p>
              <div style={{
                display: 'flex',
                gap: '20px',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: '40px'
              }}>
                <div>
                  <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#10B981' }}>$200+</p>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Monthly Earnings</p>
                </div>
                <div style={{
                  width: '1px',
                  height: '40px',
                  background: 'rgba(255,255,255,0.2)'
                }} />
                <div>
                  <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#8B5CF6' }}>5 min</p>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Setup Time</p>
                </div>
                <div style={{
                  width: '1px',
                  height: '40px',
                  background: 'rgba(255,255,255,0.2)'
                }} />
                <div>
                  <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#3B82F6' }}>$6/mo</p>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>VPS Cost</p>
                </div>
              </div>
              <p style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: '14px'
              }}>
                Connect your wallet to access the provider dashboard
              </p>
            </div>

            {/* Provider Section */}
            <BecomeProviderSection />

            {/* Benefits Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              marginTop: '40px'
            }}>
              <div style={{
                background: 'rgba(20, 20, 20, 0.8)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <h3 style={{ fontSize: '20px', marginBottom: '10px', color: '#8B5CF6' }}>
                  Easy Setup
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                  One-command installation. Get started in under 5 minutes with Docker.
                </p>
              </div>

              <div style={{
                background: 'rgba(20, 20, 20, 0.8)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <h3 style={{ fontSize: '20px', marginBottom: '10px', color: '#3B82F6' }}>
                  Low Requirements
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Just 2GB RAM and 10GB storage. Run on any VPS or home server.
                </p>
              </div>

              <div style={{
                background: 'rgba(20, 20, 20, 0.8)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <h3 style={{ fontSize: '20px', marginBottom: '10px', color: '#10B981' }}>
                  Passive Income
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Earn SOL automatically for every cached RPC request you serve.
                </p>
              </div>
            </div>

            {/* FAQ Section */}
            <div style={{
              marginTop: '60px',
              padding: '40px',
              background: 'rgba(20, 20, 20, 0.5)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <h3 style={{
                fontSize: '28px',
                marginBottom: '30px',
                textAlign: 'center',
                background: 'linear-gradient(90deg, #8B5CF6 0%, #3B82F6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Frequently Asked Questions
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '18px', marginBottom: '8px', color: '#8B5CF6' }}>
                    How much can I earn?
                  </h4>
                  <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Node operators typically earn $50-500/month depending on uptime, location, and network demand.
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '18px', marginBottom: '8px', color: '#8B5CF6' }}>
                    What are the requirements?
                  </h4>
                  <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Minimum: 1 CPU core, 2GB RAM, 10GB storage, 10 Mbps internet. We recommend using a $6/mo VPS.
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '18px', marginBottom: '8px', color: '#8B5CF6' }}>
                    How do I get paid?
                  </h4>
                  <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Earnings are automatically sent to your wallet address daily based on cache hits served.
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '18px', marginBottom: '8px', color: '#8B5CF6' }}>
                    Can I run multiple nodes?
                  </h4>
                  <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Yes! Run as many nodes as you want across different locations to maximize earnings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import ProviderDashboardDark from '../components/ProviderDashboardDark';
import BecomeProviderSection from '../components/BecomeProviderSection';

export default function ProviderPage() {
  const { connected } = useWallet();

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0a0a0a',
      color: 'white'
    }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              background: 'linear-gradient(90deg, #8B5CF6 0%, #3B82F6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              WHISTLE NETWORK
            </h1>
            <nav style={{ display: 'flex', gap: '30px' }}>
              <a href="/" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
                Dashboard
              </a>
              <a href="/provider" style={{ color: 'white', textDecoration: 'none' }}>
                Provider
              </a>
              <a href="/staking" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
                Staking
              </a>
            </nav>
          </div>
          <WalletMultiButton />
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        {connected ? (
          <ProviderDashboardDark />
        ) : (
          <div>
            {/* Hero Section */}
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              marginBottom: '40px'
            }}>
              <h2 style={{
                fontSize: '48px',
                fontWeight: 'bold',
                marginBottom: '20px',
                background: 'linear-gradient(90deg, #8B5CF6 0%, #3B82F6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Become a WHISTLE Provider
              </h2>
              <p style={{
                fontSize: '20px',
                color: 'rgba(255,255,255,0.7)',
                marginBottom: '30px',
                maxWidth: '600px',
                margin: '0 auto 30px'
              }}>
                Run a cache node and earn SOL by serving RPC queries to the decentralized network
              </p>
              <div style={{
                display: 'flex',
                gap: '20px',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: '40px'
              }}>
                <div>
                  <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#10B981' }}>$200+</p>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Monthly Earnings</p>
                </div>
                <div style={{
                  width: '1px',
                  height: '40px',
                  background: 'rgba(255,255,255,0.2)'
                }} />
                <div>
                  <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#8B5CF6' }}>5 min</p>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Setup Time</p>
                </div>
                <div style={{
                  width: '1px',
                  height: '40px',
                  background: 'rgba(255,255,255,0.2)'
                }} />
                <div>
                  <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#3B82F6' }}>$6/mo</p>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>VPS Cost</p>
                </div>
              </div>
              <p style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: '14px'
              }}>
                Connect your wallet to access the provider dashboard
              </p>
            </div>

            {/* Provider Section */}
            <BecomeProviderSection />

            {/* Benefits Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              marginTop: '40px'
            }}>
              <div style={{
                background: 'rgba(20, 20, 20, 0.8)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <h3 style={{ fontSize: '20px', marginBottom: '10px', color: '#8B5CF6' }}>
                  Easy Setup
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                  One-command installation. Get started in under 5 minutes with Docker.
                </p>
              </div>

              <div style={{
                background: 'rgba(20, 20, 20, 0.8)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <h3 style={{ fontSize: '20px', marginBottom: '10px', color: '#3B82F6' }}>
                  Low Requirements
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Just 2GB RAM and 10GB storage. Run on any VPS or home server.
                </p>
              </div>

              <div style={{
                background: 'rgba(20, 20, 20, 0.8)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <h3 style={{ fontSize: '20px', marginBottom: '10px', color: '#10B981' }}>
                  Passive Income
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Earn SOL automatically for every cached RPC request you serve.
                </p>
              </div>
            </div>

            {/* FAQ Section */}
            <div style={{
              marginTop: '60px',
              padding: '40px',
              background: 'rgba(20, 20, 20, 0.5)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <h3 style={{
                fontSize: '28px',
                marginBottom: '30px',
                textAlign: 'center',
                background: 'linear-gradient(90deg, #8B5CF6 0%, #3B82F6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Frequently Asked Questions
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '18px', marginBottom: '8px', color: '#8B5CF6' }}>
                    How much can I earn?
                  </h4>
                  <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Node operators typically earn $50-500/month depending on uptime, location, and network demand.
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '18px', marginBottom: '8px', color: '#8B5CF6' }}>
                    What are the requirements?
                  </h4>
                  <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Minimum: 1 CPU core, 2GB RAM, 10GB storage, 10 Mbps internet. We recommend using a $6/mo VPS.
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '18px', marginBottom: '8px', color: '#8B5CF6' }}>
                    How do I get paid?
                  </h4>
                  <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Earnings are automatically sent to your wallet address daily based on cache hits served.
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '18px', marginBottom: '8px', color: '#8B5CF6' }}>
                    Can I run multiple nodes?
                  </h4>
                  <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Yes! Run as many nodes as you want across different locations to maximize earnings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
