#!/bin/bash
#
# WHISTLE Metrics Exporter - Installation Script
# Run this on your validator server (212.108.83.86)
#

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║       WHISTLE Metrics Exporter - Installation                 ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo ./install.sh)"
  exit 1
fi

# Install Node.js if not present
if ! command -v node &> /dev/null; then
  echo "Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Create directory
INSTALL_DIR="/opt/whistle-metrics"
mkdir -p $INSTALL_DIR

# Copy files
cp package.json $INSTALL_DIR/
cp index.js $INSTALL_DIR/

cd $INSTALL_DIR

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install --production

# Get validator identity
VALIDATOR_ID=$(cat /home/solana/validator-keypairs/validator-keypair.json 2>/dev/null | head -1)
if [ -z "$VALIDATOR_ID" ]; then
  # Try to get pubkey
  VALIDATOR_ID=$(sudo -u solana /home/solana/.local/share/solana/install/releases/1.18.22/solana-release/bin/solana-keygen pubkey /home/solana/validator-keypairs/validator-keypair.json 2>/dev/null)
fi

# Create systemd service
cat > /etc/systemd/system/whistle-metrics.service << EOF
[Unit]
Description=WHISTLE Metrics Exporter
After=network.target solana-validator.service

[Service]
Type=simple
Restart=always
RestartSec=5
User=root
WorkingDirectory=/opt/whistle-metrics
Environment="PORT=3001"
Environment="RPC_URL=http://localhost:8899"
Environment="VALIDATOR_ID=${VALIDATOR_ID}"
ExecStart=/usr/bin/node index.js

[Install]
WantedBy=multi-user.target
EOF

# Reload and start
systemctl daemon-reload
systemctl enable whistle-metrics
systemctl start whistle-metrics

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    Installation Complete!                      ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  Service:   whistle-metrics                                    ║"
echo "║  Port:      3001                                               ║"
echo "║  Status:    systemctl status whistle-metrics                   ║"
echo "║  Logs:      journalctl -u whistle-metrics -f                   ║"
echo "║                                                                 ║"
echo "║  Test:      curl http://localhost:3001/health                  ║"
echo "║  Metrics:   curl http://localhost:3001/metrics                 ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Quick test
sleep 2
echo "Testing endpoint..."
curl -s http://localhost:3001/health | head -20
echo ""

