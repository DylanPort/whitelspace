#!/bin/bash
#
# WHISTLE RPC Provider - Automated Setup Script
# 
# This script automates the entire Solana RPC node setup process
# Run on a fresh Ubuntu 22.04 LTS server
#
# Usage: curl -sSL https://your-domain.com/rpc-setup-auto.sh | bash
#

set -e

echo "============================================"
echo "  WHISTLE RPC Provider Setup"
echo "  Automated Installation Script"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root (sudo)${NC}"
  exit 1
fi

# Get user inputs
echo -e "${YELLOW}Configuration:${NC}"
read -p "Enter your domain (or IP address): " DOMAIN
read -p "Enter your email for SSL (optional, press enter to skip): " EMAIL
read -p "Install monitoring tools? (y/n): " INSTALL_MONITORING

# System information
echo ""
echo -e "${GREEN}System Information:${NC}"
echo "OS: $(lsb_release -d | cut -f2)"
echo "CPU: $(nproc) cores"
echo "RAM: $(free -h | awk '/^Mem:/ {print $2}')"
echo "Disk: $(df -h / | awk 'NR==2 {print $2}')"
echo ""

read -p "Continue with installation? (y/n): " CONTINUE
if [ "$CONTINUE" != "y" ]; then
  echo "Installation cancelled."
  exit 0
fi

# ==================== SYSTEM SETUP ====================

echo -e "${GREEN}[1/10] Updating system packages...${NC}"
apt update && apt upgrade -y

echo -e "${GREEN}[2/10] Installing essential tools...${NC}"
apt install -y curl wget git build-essential pkg-config libssl-dev \
               libudev-dev jq htop tmux ufw fail2ban pbzip2 \
               nginx certbot python3-certbot-nginx

# ==================== FIREWALL ====================

echo -e "${GREEN}[3/10] Configuring firewall...${NC}"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 8899/tcp  # Solana RPC
ufw allow 8001/tcp  # Gossip
ufw allow 8000:8020/tcp  # Dynamic ports
ufw --force enable

echo -e "${GREEN}Firewall configured${NC}"

# ==================== CREATE SOLANA USER ====================

echo -e "${GREEN}[4/10] Creating solana user...${NC}"
if id "solana" &>/dev/null; then
    echo "User solana already exists"
else
    useradd -m -s /bin/bash solana
    usermod -aG sudo solana
    echo "solana ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/solana
fi

# ==================== INSTALL SOLANA CLI ====================

echo -e "${GREEN}[5/10] Installing Solana CLI...${NC}"
su - solana -c 'sh -c "$(curl -sSfL https://release.solana.com/v1.18.26/install)"'
su - solana -c 'echo "export PATH=\"/home/solana/.local/share/solana/install/active_release/bin:\$PATH\"" >> ~/.bashrc'

SOLANA_BIN="/home/solana/.local/share/solana/install/active_release/bin"

# ==================== CREATE VALIDATOR KEYPAIRS ====================

echo -e "${GREEN}[6/10] Creating validator keypairs...${NC}"
if [ ! -f /home/solana/validator-keypair.json ]; then
    su - solana -c "$SOLANA_BIN/solana-keygen new --no-passphrase --outfile ~/validator-keypair.json"
    su - solana -c "$SOLANA_BIN/solana-keygen new --no-passphrase --outfile ~/vote-account-keypair.json"
    su - solana -c "$SOLANA_BIN/solana-keygen new --no-passphrase --outfile ~/authorized-withdrawer-keypair.json"
    
    echo -e "${YELLOW}⚠️  IMPORTANT: Backup these keypairs immediately!${NC}"
    echo "Validator Identity: $(su - solana -c "$SOLANA_BIN/solana-keygen pubkey ~/validator-keypair.json")"
else
    echo "Keypairs already exist"
fi

# ==================== SETUP STORAGE ====================

echo -e "${GREEN}[7/10] Setting up storage...${NC}"
mkdir -p /mnt/solana-data/{ledger,accounts,snapshots}
chown -R solana:solana /mnt/solana-data

# ==================== DOWNLOAD SNAPSHOT ====================

echo -e "${GREEN}[8/10] Downloading Solana snapshot (this may take a while)...${NC}"
cd /mnt/solana-data
if [ ! -f /mnt/solana-data/.snapshot_downloaded ]; then
    echo "Downloading from Triton..."
    su - solana -c "cd /mnt/solana-data && wget -c https://solana-mainnet.rpc.extrnode.com/snapshot.tar.bz2 -O snapshot.tar.bz2"
    
    echo "Extracting snapshot..."
    su - solana -c "cd /mnt/solana-data && tar -I pbzip2 -xf snapshot.tar.bz2 -C ledger/"
    rm -f snapshot.tar.bz2
    touch /mnt/solana-data/.snapshot_downloaded
    echo -e "${GREEN}Snapshot downloaded and extracted${NC}"
else
    echo "Snapshot already downloaded"
fi

# ==================== CREATE SYSTEMD SERVICE ====================

echo -e "${GREEN}[9/10] Creating systemd service...${NC}"
cat > /etc/systemd/system/solana-validator.service << 'EOF'
[Unit]
Description=Solana Validator
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=1
User=solana
LimitNOFILE=1000000
LogRateLimitIntervalSec=0
Environment="PATH=/home/solana/.local/share/solana/install/active_release/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=/home/solana/.local/share/solana/install/active_release/bin/solana-validator \
  --identity /home/solana/validator-keypair.json \
  --vote-account /home/solana/vote-account-keypair.json \
  --authorized-withdrawer /home/solana/authorized-withdrawer-keypair.json \
  --ledger /mnt/solana-data/ledger \
  --accounts /mnt/solana-data/accounts \
  --snapshots /mnt/solana-data/snapshots \
  --log /mnt/solana-data/solana-validator.log \
  --rpc-port 8899 \
  --rpc-bind-address 0.0.0.0 \
  --dynamic-port-range 8000-8020 \
  --entrypoint entrypoint.mainnet-beta.solana.com:8001 \
  --entrypoint entrypoint2.mainnet-beta.solana.com:8001 \
  --entrypoint entrypoint3.mainnet-beta.solana.com:8001 \
  --expected-genesis-hash 5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d \
  --wal-recovery-mode skip_any_corrupted_record \
  --limit-ledger-size 50000000 \
  --enable-rpc-transaction-history \
  --enable-extended-tx-metadata-storage \
  --full-rpc-api \
  --no-voting \
  --private-rpc

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable solana-validator

# ==================== CONFIGURE NGINX ====================

echo -e "${GREEN}[10/10] Configuring Nginx...${NC}"

# Create rate limiting
mkdir -p /var/cache/nginx/rpc_limit

cat > /etc/nginx/sites-available/whistle-rpc << EOF
upstream solana_rpc {
    server 127.0.0.1:8899;
}

limit_req_zone \$binary_remote_addr zone=rpc_limit:10m rate=100r/s;

server {
    listen 80;
    server_name $DOMAIN;

    location / {
        limit_req zone=rpc_limit burst=200 nodelay;

        proxy_pass http://solana_rpc;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /health {
        access_log off;
        return 200 "OK";
    }
}
EOF

ln -sf /etc/nginx/sites-available/whistle-rpc /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Get SSL certificate if email provided
if [ -n "$EMAIL" ] && [ "$DOMAIN" != "localhost" ]; then
    echo -e "${GREEN}Obtaining SSL certificate...${NC}"
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL
    systemctl enable certbot.timer
fi

# ==================== INSTALL MONITORING ====================

if [ "$INSTALL_MONITORING" = "y" ]; then
    echo -e "${GREEN}Installing monitoring tools...${NC}"
    apt install -y prometheus grafana
    
    # Basic Prometheus config for Solana
    cat > /etc/prometheus/prometheus.yml << 'PROM_EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
  
  - job_name: 'solana'
    static_configs:
      - targets: ['localhost:8899']
PROM_EOF
    
    systemctl enable prometheus grafana-server
    systemctl start prometheus grafana-server
    
    echo -e "${GREEN}Grafana available at: http://$DOMAIN:3000${NC}"
    echo "Default credentials: admin/admin"
fi

# ==================== CREATE HEALTH CHECK ====================

echo -e "${GREEN}Creating health check script...${NC}"
cat > /home/solana/rpc-health-check.sh << 'HEALTH_EOF'
#!/bin/bash
# WHISTLE RPC Health Check

RPC_STATUS=$(curl -s -X POST http://localhost:8899 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' | jq -r '.result')

if [ "$RPC_STATUS" != "ok" ]; then
  echo "$(date): RPC unhealthy! Restarting..."
  sudo systemctl restart solana-validator
else
  echo "$(date): RPC healthy"
fi
HEALTH_EOF

chmod +x /home/solana/rpc-health-check.sh
chown solana:solana /home/solana/rpc-health-check.sh

# Add to crontab
(crontab -u solana -l 2>/dev/null; echo "*/5 * * * * /home/solana/rpc-health-check.sh >> /home/solana/health-check.log 2>&1") | crontab -u solana -

# ==================== START VALIDATOR ====================

echo -e "${GREEN}Starting Solana validator...${NC}"
systemctl start solana-validator

# ==================== COMPLETION ====================

echo ""
echo "============================================"
echo -e "${GREEN}✅ Installation Complete!${NC}"
echo "============================================"
echo ""
echo -e "${YELLOW}Your WHISTLE RPC Provider is now running!${NC}"
echo ""
echo "📍 RPC Endpoint: http://$DOMAIN (or https:// if SSL configured)"
echo "🔑 Validator Identity: $(su - solana -c "$SOLANA_BIN/solana-keygen pubkey /home/solana/validator-keypair.json")"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT NEXT STEPS:${NC}"
echo ""
echo "1. BACKUP YOUR KEYPAIRS (critical!):"
echo "   /home/solana/validator-keypair.json"
echo "   /home/solana/vote-account-keypair.json"
echo "   /home/solana/authorized-withdrawer-keypair.json"
echo ""
echo "2. Wait for node to sync (check status):"
echo "   sudo -u solana $SOLANA_BIN/solana catchup /home/solana/validator-keypair.json --our-localhost"
echo ""
echo "3. Monitor sync progress:"
echo "   journalctl -u solana-validator -f"
echo ""
echo "4. Test RPC endpoint:"
echo "   curl -X POST http://localhost:8899 -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getHealth\"}'"
echo ""
echo "5. Register as WHISTLE provider:"
echo "   - Go to your WHISTLE dashboard"
echo "   - Navigate to Provider page"
echo "   - Click 'REGISTER AS PROVIDER'"
echo "   - Enter your RPC endpoint: https://$DOMAIN"
echo "   - Bond 1,000+ WHISTLE tokens"
echo ""
if [ "$INSTALL_MONITORING" = "y" ]; then
echo "6. Access Grafana dashboard:"
echo "   http://$DOMAIN:3000"
echo "   Default: admin/admin"
echo ""
fi
echo -e "${GREEN}Sync will take 1-3 days. Be patient!${NC}"
echo ""
echo "Need help? Check: /mnt/solana-data/solana-validator.log"
echo "============================================"







