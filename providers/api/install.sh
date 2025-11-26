#!/bin/bash
#
# WHISTLE Provider API - Server Installation Script
# Run this on your validator server (212.108.83.86)
#

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║           WHISTLE Provider API - Installation                      ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root (sudo ./install.sh)"
  exit 1
fi

# Install Node.js if not present
if ! command -v node &> /dev/null; then
  echo "📦 Installing Node.js 20.x..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "✓ Node.js version: $(node --version)"
echo "✓ npm version: $(npm --version)"

# Create install directory
INSTALL_DIR="/opt/whistle-api"
echo ""
echo "📁 Installing to $INSTALL_DIR"
mkdir -p $INSTALL_DIR
mkdir -p $INSTALL_DIR/data

# Copy files
cp package.json $INSTALL_DIR/
cp server.js $INSTALL_DIR/

cd $INSTALL_DIR

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install --production

# Get validator pubkey
echo ""
echo "🔑 Detecting validator identity..."
VALIDATOR_PUBKEY=""

# Try to get pubkey from keypair
if [ -f /home/solana/validator-keypairs/validator-keypair.json ]; then
  # Try with 1.18.22 release
  if [ -f /home/solana/.local/share/solana/install/releases/1.18.22/solana-release/bin/solana-keygen ]; then
    VALIDATOR_PUBKEY=$(sudo -u solana /home/solana/.local/share/solana/install/releases/1.18.22/solana-release/bin/solana-keygen pubkey /home/solana/validator-keypairs/validator-keypair.json 2>/dev/null || echo "")
  fi
  # Try with active release
  if [ -z "$VALIDATOR_PUBKEY" ] && [ -f /home/solana/.local/share/solana/install/active_release/bin/solana-keygen ]; then
    VALIDATOR_PUBKEY=$(sudo -u solana /home/solana/.local/share/solana/install/active_release/bin/solana-keygen pubkey /home/solana/validator-keypairs/validator-keypair.json 2>/dev/null || echo "")
  fi
fi

if [ -n "$VALIDATOR_PUBKEY" ]; then
  echo "✓ Validator pubkey: $VALIDATOR_PUBKEY"
else
  echo "⚠ Could not detect validator pubkey. You can set it manually later."
  VALIDATOR_PUBKEY="not-configured"
fi

# Create systemd service
echo ""
echo "🔧 Creating systemd service..."

cat > /etc/systemd/system/whistle-api.service << EOF
[Unit]
Description=WHISTLE Provider API
After=network.target solana-validator.service
Wants=solana-validator.service

[Service]
Type=simple
Restart=always
RestartSec=5
User=root
WorkingDirectory=/opt/whistle-api
Environment="PORT=3001"
Environment="RPC_URL=http://localhost:8899"
Environment="VALIDATOR_PUBKEY=${VALIDATOR_PUBKEY}"
Environment="DB_PATH=/opt/whistle-api/data/whistle.db"
ExecStart=/usr/bin/node server.js

[Install]
WantedBy=multi-user.target
EOF

# Reload and start
systemctl daemon-reload
systemctl enable whistle-api
systemctl start whistle-api

# Wait for startup
sleep 3

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                    Installation Complete!                          ║"
echo "╠═══════════════════════════════════════════════════════════════════╣"
echo "║                                                                     ║"
echo "║  Service:    whistle-api                                            ║"
echo "║  Port:       3001                                                   ║"
echo "║  Database:   /opt/whistle-api/data/whistle.db                       ║"
echo "║                                                                     ║"
echo "║  Commands:                                                          ║"
echo "║    Status:   systemctl status whistle-api                           ║"
echo "║    Logs:     journalctl -u whistle-api -f                           ║"
echo "║    Restart:  systemctl restart whistle-api                          ║"
echo "║                                                                     ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Quick test
echo "🧪 Testing API..."
echo ""

# Test health endpoint
HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null || echo "FAILED")
echo "Health check: $HEALTH"
echo ""

# Test metrics endpoint
echo "Metrics preview:"
curl -s http://localhost:3001/api/metrics 2>/dev/null | head -c 500
echo ""
echo ""

echo "✅ WHISTLE Provider API is running!"
echo ""
echo "Next step: Set up Cloudflare Tunnel to expose at https://api.whistle.ninja"
echo ""

