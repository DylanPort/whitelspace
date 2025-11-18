#!/bin/bash
#
# WHISTLE Network - Solana RPC Setup Script
# Optimized for Hetzner EX63 (192GB RAM, 15.36TB NVMe)
#
# Usage: curl -sL https://raw.githubusercontent.com/YOUR_REPO/main/whistlenet/rpc-setup-hetzner-ex63.sh | bash
# OR: wget -qO- https://raw.githubusercontent.com/YOUR_REPO/main/whistlenet/rpc-setup-hetzner-ex63.sh | bash

set -e

echo "======================================================"
echo "  WHISTLE Network - Solana RPC Setup"
echo "  Hetzner EX63 Optimized Configuration"
echo "======================================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (or use sudo)"
    exit 1
fi

# Check available RAM
TOTAL_RAM=$(grep MemTotal /proc/meminfo | awk '{print $2}')
RAM_GB=$((TOTAL_RAM / 1024 / 1024))
echo "✅ Detected ${RAM_GB}GB RAM"

if [ $RAM_GB -lt 64 ]; then
    echo "❌ Insufficient RAM. Solana RPC needs at least 64GB."
    exit 1
fi

# Check available disk space
TOTAL_DISK=$(df -BG / | tail -1 | awk '{print $2}' | sed 's/G//')
echo "✅ Detected ${TOTAL_DISK}GB disk space"

if [ $TOTAL_DISK -lt 3000 ]; then
    echo "⚠️  Warning: Less than 3TB disk space. Consider upgrading."
fi

echo ""
echo "📦 Step 1/8: Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y curl wget git build-essential libssl-dev libudev-dev pkg-config zlib1g-dev llvm clang cmake make libprotobuf-dev protobuf-compiler

echo ""
echo "📦 Step 2/8: Installing Solana CLI..."
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="/root/.local/share/solana/install/active_release/bin:$PATH"
echo 'export PATH="/root/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc

# Verify installation
solana --version
echo "✅ Solana installed: $(solana --version)"

echo ""
echo "📦 Step 3/8: Configuring system limits..."
cat >> /etc/security/limits.conf << EOF

# Solana RPC optimization
* soft nofile 1000000
* hard nofile 1000000
* soft nproc 65535
* hard nproc 65535
EOF

cat >> /etc/sysctl.conf << EOF

# Solana RPC network optimization
net.core.rmem_default = 134217728
net.core.rmem_max = 134217728
net.core.wmem_default = 134217728
net.core.wmem_max = 134217728
net.core.optmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.ipv4.tcp_congestion_control = bbr
vm.max_map_count = 1000000
kernel.nmi_watchdog = 0
EOF

sysctl -p

echo ""
echo "📦 Step 4/8: Creating Solana user and directories..."
useradd -m -s /bin/bash sol || echo "User 'sol' already exists"

# Create data directories
mkdir -p /mnt/solana-ledger
mkdir -p /mnt/solana-accounts
mkdir -p /mnt/solana-snapshots
chown -R sol:sol /mnt/solana-*

echo ""
echo "📦 Step 5/8: Downloading latest Solana snapshot..."
echo "⏰ This will take 30-60 minutes (downloading ~300GB)..."

# Download snapshot as sol user
su - sol -c "solana-validator --ledger /mnt/solana-ledger catchup --our-localhost"

echo ""
echo "📦 Step 6/8: Creating Solana RPC configuration..."

# Create systemd service
cat > /etc/systemd/system/solana-rpc.service << 'EOF'
[Unit]
Description=Solana RPC Node
After=network.target
Wants=systuner.service
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=1
User=sol
LimitNOFILE=1000000
LogRateLimitIntervalSec=0
Environment="PATH=/bin:/usr/bin:/root/.local/share/solana/install/active_release/bin"
ExecStart=/root/.local/share/solana/install/active_release/bin/solana-validator \
    --identity /home/sol/validator-keypair.json \
    --ledger /mnt/solana-ledger \
    --accounts /mnt/solana-accounts \
    --rpc-port 8899 \
    --rpc-bind-address 0.0.0.0 \
    --dynamic-port-range 8000-8020 \
    --entrypoint entrypoint.mainnet-beta.solana.com:8001 \
    --entrypoint entrypoint2.mainnet-beta.solana.com:8001 \
    --entrypoint entrypoint3.mainnet-beta.solana.com:8001 \
    --entrypoint entrypoint4.mainnet-beta.solana.com:8001 \
    --entrypoint entrypoint5.mainnet-beta.solana.com:8001 \
    --expected-genesis-hash 5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d \
    --wal-recovery-mode skip_any_corrupted_record \
    --limit-ledger-size 200000000 \
    --log /home/sol/solana-rpc.log \
    --full-rpc-api \
    --no-voting \
    --enable-rpc-transaction-history \
    --enable-cpi-and-log-storage \
    --rpc-faucet-address 127.0.0.1:9900 \
    --account-index program-id \
    --account-index spl-token-owner \
    --account-index spl-token-mint

[Install]
WantedBy=multi-user.target
EOF

echo ""
echo "📦 Step 7/8: Generating validator identity..."
su - sol -c "solana-keygen new --no-passphrase -o ~/validator-keypair.json"

echo ""
echo "📦 Step 8/8: Configuring firewall..."
apt-get install -y ufw
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 8000:8020/tcp  # Solana gossip
ufw allow 8000:8020/udp  # Solana gossip
ufw allow 8899/tcp  # RPC
ufw reload

echo ""
echo "🚀 Starting Solana RPC service..."
systemctl daemon-reload
systemctl enable solana-rpc
systemctl start solana-rpc

echo ""
echo "======================================================"
echo "  ✅ INSTALLATION COMPLETE!"
echo "======================================================"
echo ""
echo "Your Solana RPC node is now running!"
echo ""
echo "📊 Service Status:"
echo "   systemctl status solana-rpc"
echo ""
echo "📝 View Logs:"
echo "   journalctl -u solana-rpc -f"
echo "   tail -f /home/sol/solana-rpc.log"
echo ""
echo "🔗 RPC Endpoint:"
echo "   http://157.180.102.153:8899"
echo ""
echo "🧪 Test RPC:"
echo "   curl -X POST http://localhost:8899 -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getHealth\"}'"
echo ""
echo "⏰ Initial sync will take 2-3 hours."
echo "   Monitor progress: solana catchup --our-localhost"
echo ""
echo "======================================================"
echo ""







