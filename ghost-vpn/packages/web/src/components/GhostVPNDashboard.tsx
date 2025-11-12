/**
 * Ghost VPN Dashboard Component
 * Integrated into Ghost Whistle platform
 */

import React, { useState, useEffect } from 'react';
import { GhostVPNClient } from '@ghost-vpn/core';
import { KillSwitch } from '@ghost-vpn/core';
import QRCode from 'qrcode';
import './GhostVPNDashboard.css';

interface VPNServer {
  id: string;
  ip: string;
  region: string;
  protocol: string;
  status: 'active' | 'stopped' | 'deleted';
  config: string;
  monthly_cost: number;
  created_at: string;
}

interface CloudProvider {
  id: string;
  name: string;
  cost: number;
  icon: string;
}

const REGIONS = [
  { code: 'nyc1', name: '🇺🇸 New York', flag: '🇺🇸' },
  { code: 'sfo2', name: '🇺🇸 San Francisco', flag: '🇺🇸' },
  { code: 'ams3', name: '🇳🇱 Amsterdam', flag: '🇳🇱' },
  { code: 'sgp1', name: '🇸🇬 Singapore', flag: '🇸🇬' },
  { code: 'lon1', name: '🇬🇧 London', flag: '🇬🇧' },
  { code: 'fra1', name: '🇩🇪 Frankfurt', flag: '🇩🇪' },
  { code: 'tor1', name: '🇨🇦 Toronto', flag: '🇨🇦' },
  { code: 'blr1', name: '🇮🇳 Bangalore', flag: '🇮🇳' }
];

const PROVIDERS: CloudProvider[] = [
  { id: 'digitalocean', name: 'DigitalOcean', cost: 5.00, icon: '🌊' },
  { id: 'vultr', name: 'Vultr', cost: 5.00, icon: '🔷' },
  { id: 'linode', name: 'Linode', cost: 5.00, icon: '🟦' },
  { id: 'aws', name: 'AWS Lightsail', cost: 3.50, icon: '☁️' }
];

export const GhostVPNDashboard: React.FC = () => {
  const [vpnClient] = useState(() => new GhostVPNClient());
  const [killSwitch] = useState(() => new KillSwitch({ enabled: true, blockOnDisconnect: true, allowLAN: true }));
  
  const [server, setServer] = useState<VPNServer | null>(null);
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState({ bytesReceived: 0, bytesSent: 0, latency: 0, uptime: 0 });
  
  const [deploying, setDeploying] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('nyc1');
  const [selectedProtocol, setSelectedProtocol] = useState('wireguard');
  const [selectedProvider, setSelectedProvider] = useState('digitalocean');
  const [apiKey, setApiKey] = useState('');
  
  const [qrCodeDataURL, setQrCodeDataURL] = useState('');
  const [showDeployForm, setShowDeployForm] = useState(false);

  useEffect(() => {
    // Load existing server
    loadServer();

    // Setup VPN client events
    vpnClient.on('connected', () => setConnected(true));
    vpnClient.on('disconnected', () => setConnected(false));
    vpnClient.on('stats-updated', (newStats) => setStats(newStats));

    return () => {
      vpnClient.removeAllListeners();
    };
  }, []);

  const loadServer = async () => {
    try {
      const response = await fetch('/.netlify/functions/get-vpn-server', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.server) {
          setServer(data.server);
          await vpnClient.loadConfig(data.server.config);
          // Generate QR code
          const qrDataURL = await QRCode.toDataURL(data.server.config);
          setQrCodeDataURL(qrDataURL);
        } else {
          setShowDeployForm(true);
        }
      }
    } catch (error) {
      console.error('Failed to load server:', error);
    }
  };

  const deployServer = async () => {
    if (!apiKey) {
      alert('Please enter your cloud provider API key');
      return;
    }

    setDeploying(true);

    try {
      const response = await fetch('/.netlify/functions/deploy-vpn-server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        },
        body: JSON.stringify({
          userId: localStorage.getItem('user_id'),
          region: selectedRegion,
          protocol: selectedProtocol,
          provider: selectedProvider,
          apiKey
        })
      });

      const result = await response.json();

      if (result.success) {
        setServer(result.server);
        await vpnClient.loadConfig(result.server.config);
        
        // Generate QR code
        const qrDataURL = await QRCode.toDataURL(result.server.config);
        setQrCodeDataURL(qrDataURL);
        
        setShowDeployForm(false);
        alert('✅ Ghost VPN deployed successfully!');
      } else {
        alert(`❌ Deployment failed: ${result.error}`);
      }
    } catch (error: any) {
      alert(`❌ Deployment failed: ${error.message}`);
    } finally {
      setDeploying(false);
    }
  };

  const connectVPN = async () => {
    try {
      await vpnClient.connect();
      await killSwitch.enable();
    } catch (error: any) {
      alert(`Connection failed: ${error.message}`);
    }
  };

  const disconnectVPN = async () => {
    try {
      await vpnClient.disconnect();
      await killSwitch.disable();
    } catch (error: any) {
      alert(`Disconnection failed: ${error.message}`);
    }
  };

  const deleteServer = async () => {
    if (!confirm('⚠️ Delete your Ghost VPN server? This cannot be undone!')) {
      return;
    }

    try {
      await fetch('/.netlify/functions/delete-vpn-server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        },
        body: JSON.stringify({ userId: localStorage.getItem('user_id') })
      });

      setServer(null);
      setShowDeployForm(true);
      alert('🗑️ Server deleted');
    } catch (error: any) {
      alert(`Delete failed: ${error.message}`);
    }
  };

  const downloadConfig = (platform: string) => {
    if (!server) return;

    const blob = new Blob([server.config], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ghost-vpn-${platform}.conf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  if (showDeployForm) {
    return (
      <div className="ghost-vpn-dashboard">
        <div className="vpn-header">
          <h2>🔒 Deploy Your Ghost VPN</h2>
          <p>Create your own private VPN server in 3 minutes</p>
        </div>

        <div className="deploy-form">
          <div className="form-section">
            <label>Server Location</label>
            <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
              {REGIONS.map(region => (
                <option key={region.code} value={region.code}>{region.name}</option>
              ))}
            </select>
          </div>

          <div className="form-section">
            <label>Protocol</label>
            <div className="protocol-options">
              {[
                { value: 'wireguard', name: 'WireGuard', badge: '⚡ Fastest' },
                { value: 'openvpn', name: 'OpenVPN', badge: '🛡️ Reliable' },
                { value: 'shadowsocks', name: 'Shadowsocks', badge: '🕵️ Stealth' }
              ].map(protocol => (
                <label key={protocol.value} className={selectedProtocol === protocol.value ? 'selected' : ''}>
                  <input 
                    type="radio" 
                    name="protocol" 
                    value={protocol.value}
                    checked={selectedProtocol === protocol.value}
                    onChange={(e) => setSelectedProtocol(e.target.value)}
                  />
                  <div className="protocol-card">
                    <strong>{protocol.name}</strong>
                    <span className="badge">{protocol.badge}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label>Cloud Provider</label>
            <div className="provider-options">
              {PROVIDERS.map(provider => (
                <label key={provider.id} className={selectedProvider === provider.id ? 'selected' : ''}>
                  <input
                    type="radio"
                    name="provider"
                    value={provider.id}
                    checked={selectedProvider === provider.id}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                  />
                  <div className="provider-card">
                    <span className="provider-icon">{provider.icon}</span>
                    <strong>{provider.name}</strong>
                    <span className="cost">${provider.cost}/mo</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label>API Key (encrypted & secure)</label>
            <input
              type="password"
              placeholder="Enter your cloud provider API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <a href={`https://${selectedProvider}.com/api`} target="_blank" rel="noopener noreferrer">
              Get API Key →
            </a>
          </div>

          <button className="deploy-btn" onClick={deployServer} disabled={deploying}>
            {deploying ? '🚀 Deploying...' : '🚀 Deploy Ghost VPN'}
          </button>

          <div className="cost-estimate">
            <p>💰 Cost: <strong>${PROVIDERS.find(p => p.id === selectedProvider)?.cost}/month</strong></p>
            <p>⚡ Setup: <strong>3-5 minutes</strong></p>
            <p>🔒 Privacy: <strong>100% yours</strong></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ghost-vpn-dashboard">
      <div className="vpn-header">
        <h2>🔒 Ghost VPN</h2>
        <div className="vpn-status">
          <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}></span>
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      <div className="vpn-main">
        <div className="connection-card">
          <div className="server-info">
            <h3>Server Information</h3>
            <p><strong>IP:</strong> {server?.ip}</p>
            <p><strong>Region:</strong> {REGIONS.find(r => r.code === server?.region)?.name}</p>
            <p><strong>Protocol:</strong> {server?.protocol}</p>
            <p><strong>Cost:</strong> ${server?.monthly_cost}/month</p>
          </div>

          <div className="connection-controls">
            {!connected ? (
              <button className="connect-btn" onClick={connectVPN}>
                🔐 Connect to Ghost VPN
              </button>
            ) : (
              <button className="disconnect-btn" onClick={disconnectVPN}>
                ⏸️ Disconnect
              </button>
            )}
          </div>

          {connected && (
            <div className="connection-stats">
              <div className="stat">
                <span className="stat-label">⬇️ Downloaded</span>
                <span className="stat-value">{formatBytes(stats.bytesReceived)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">⬆️ Uploaded</span>
                <span className="stat-value">{formatBytes(stats.bytesSent)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">⚡ Latency</span>
                <span className="stat-value">{stats.latency}ms</span>
              </div>
              <div className="stat">
                <span className="stat-label">⏱️ Uptime</span>
                <span className="stat-value">{formatUptime(stats.uptime)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="clients-card">
          <h3>Download Clients</h3>
          <div className="client-buttons">
            <button onClick={() => downloadConfig('windows')}>🪟 Windows</button>
            <button onClick={() => downloadConfig('mac')}>🍎 macOS</button>
            <button onClick={() => downloadConfig('linux')}>🐧 Linux</button>
            <button onClick={() => window.open('https://play.google.com/store/apps/details?id=com.wireguard.android')}>
              🤖 Android
            </button>
            <button onClick={() => window.open('https://apps.apple.com/us/app/wireguard/id1441195209')}>
              📱 iOS
            </button>
          </div>

          {qrCodeDataURL && (
            <div className="qr-code">
              <h4>Or Scan QR Code (Mobile)</h4>
              <img src={qrCodeDataURL} alt="VPN Config QR Code" />
            </div>
          )}
        </div>

        <div className="management-card">
          <h3>Server Management</h3>
          <div className="management-buttons">
            <button onClick={deleteServer} className="delete-btn">
              🗑️ Delete Server
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GhostVPNDashboard;

