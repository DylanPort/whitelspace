#!/bin/bash
# WHISTLE RPC Provider - Simple Setup for UK Server
# This bypasses the full validator and just runs an RPC proxy

set -e

echo "======================================"
echo "WHISTLE RPC Provider - Quick Setup"
echo "======================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root (sudo su)"
  exit 1
fi

# Server details
SERVER_IP="212.108.83.176"
echo "Server IP: $SERVER_IP"

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Create working directory
WHISTLE_DIR="/opt/whistle-rpc"
mkdir -p $WHISTLE_DIR
cd $WHISTLE_DIR

# Create simple RPC proxy server
cat > server.js << 'EOF'
const express = require('express');
const { Connection, clusterApiUrl } = require('@solana/web3.js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Connect to Solana mainnet via public RPC (for now)
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    provider: 'WHISTLE Beta Provider #1',
    network: 'mainnet-beta',
    version: '0.1.0-beta'
  });
});

// Metadata endpoint for WHISTLE network
app.get('/api/metadata', (req, res) => {
  res.json({
    metadata: {
      network: 'https://api.mainnet-beta.solana.com',
      supported_chains: ['SOL'],
    },
    ok: true,
    supported_mints: [
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump'  // WHISTLE
    ],
    version: 'WHISTLE-v0.1-beta'
  });
});

// RPC proxy endpoint
app.post('/rpc', async (req, res) => {
  try {
    const { method, params } = req.body;
    
    // Forward request to Solana RPC
    const result = await connection._rpcRequest(method, params);
    res.json(result);
  } catch (error) {
    console.error('RPC Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// JSON-RPC endpoint (standard)
app.post('/', async (req, res) => {
  try {
    const { jsonrpc, method, params, id } = req.body;
    
    const result = await connection._rpcRequest(method, params || []);
    
    res.json({
      jsonrpc: jsonrpc || '2.0',
      id: id || 1,
      result: result.result || result
    });
  } catch (error) {
    console.error('JSON-RPC Error:', error);
    res.json({
      jsonrpc: '2.0',
      id: req.body.id || 1,
      error: {
        code: -32603,
        message: error.message
      }
    });
  }
});

const PORT = process.env.PORT || 8899;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔊 WHISTLE RPC Provider listening on port ${PORT}`);
  console.log(`Health: http://${process.env.SERVER_IP || 'localhost'}:${PORT}/health`);
  console.log(`Metadata: http://${process.env.SERVER_IP || 'localhost'}:${PORT}/api/metadata`);
});
EOF

# Create package.json
cat > package.json << 'EOF'
{
  "name": "whistle-rpc-provider",
  "version": "0.1.0-beta",
  "description": "WHISTLE RPC Provider Beta",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "@solana/web3.js": "^1.95.0",
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
EOF

# Install dependencies
echo "Installing dependencies..."
npm install

# Create systemd service
cat > /etc/systemd/system/whistle-rpc.service << EOF
[Unit]
Description=WHISTLE RPC Provider Beta
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$WHISTLE_DIR
Environment="SERVER_IP=$SERVER_IP"
Environment="PORT=8899"
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start service
systemctl daemon-reload
systemctl enable whistle-rpc
systemctl restart whistle-rpc

echo ""
echo "======================================"
echo "✅ WHISTLE RPC Provider Started!"
echo "======================================"
echo ""
echo "Status: systemctl status whistle-rpc"
echo "Logs:   journalctl -u whistle-rpc -f"
echo ""
echo "Endpoints:"
echo "  Health:   http://$SERVER_IP:8899/health"
echo "  Metadata: http://$SERVER_IP:8899/api/metadata"
echo "  RPC:      http://$SERVER_IP:8899/rpc"
echo ""
echo "Test it:"
echo "  curl http://$SERVER_IP:8899/health"
echo ""

