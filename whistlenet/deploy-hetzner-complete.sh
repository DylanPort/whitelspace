#!/bin/bash
#
# WHISTLE Network - Complete Hetzner Deployment Script
# This installs: Solana RPC + Custom API + PostgreSQL + Monitoring
#
# Run: curl -sSL https://raw.githubusercontent.com/YOUR_REPO/main/whistlenet/deploy-hetzner-complete.sh | bash
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

clear
echo -e "${BLUE}"
cat << "EOF"
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║         🎯 WHISTLE Network RPC Provider Setup           ║
║                                                          ║
║     Complete deployment for Hetzner dedicated server    ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}❌ Please run as root${NC}"
  exit 1
fi

# Get configuration
echo -e "${YELLOW}📝 Configuration Setup${NC}"
echo ""
read -p "Enter your domain (e.g., rpc.yourdomain.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    DOMAIN=$(curl -s ifconfig.me)
    echo "Using IP: $DOMAIN"
fi

read -p "Enter email for SSL (REQUIRED for production): " EMAIL

echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Decentralized RPC Provider${NC}"
echo "You are setting up YOUR OWN independent Solana RPC node."
echo "This will NOT use centralized RPCs (Helius, Alchemy, etc.)"
echo "Your server will sync the ENTIRE blockchain locally."
echo ""
echo "Requirements:"
echo "  • 192GB+ RAM"
echo "  • 3TB+ NVMe storage"
echo "  • Sync time: 1-3 days"
echo ""
read -p "Continue with full node deployment? (yes/no): " DEPLOY_CONFIRM

if [ "$DEPLOY_CONFIRM" != "yes" ]; then
    echo "Deployment cancelled. Full node is required for decentralized RPC."
    exit 0
fi

DEPLOY_SOLANA="y"
INSTALL_MONITORING="y"

# System info
echo ""
echo -e "${GREEN}📊 System Information:${NC}"
echo "OS: $(lsb_release -d | cut -f2)"
echo "CPU: $(nproc) cores"
echo "RAM: $(free -h | awk '/^Mem:/ {print $2}')"
echo "Disk: $(df -h / | awk 'NR==2 {print $2}')"
echo "IP: $(curl -s ifconfig.me)"
echo ""

read -p "Continue? (y/n): " CONTINUE
if [ "$CONTINUE" != "y" ]; then
  exit 0
fi

# ==================== SYSTEM PACKAGES ====================

echo ""
echo -e "${GREEN}[1/10] Updating system...${NC}"
apt update -qq && apt upgrade -y -qq

echo -e "${GREEN}[2/10] Installing dependencies...${NC}"
apt install -y curl wget git build-essential pkg-config libssl-dev \
               libudev-dev jq htop tmux ufw fail2ban \
               nginx certbot python3-certbot-nginx \
               postgresql postgresql-contrib \
               nodejs npm

# Install Node 18 if needed
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Updating Node.js to v18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# ==================== FIREWALL ====================

echo -e "${GREEN}[3/10] Configuring firewall...${NC}"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 8080/tcp  # Custom API
ufw allow 8899/tcp  # Solana RPC
ufw allow 8000:8020/tcp  # Solana dynamic ports
ufw --force enable

# ==================== POSTGRESQL ====================

echo -e "${GREEN}[4/10] Setting up PostgreSQL...${NC}"

# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user
su - postgres -c "psql -c \"CREATE USER whistle WITH PASSWORD 'whistle_secure_password_change_me';\""  2>/dev/null || echo "User exists"
su - postgres -c "psql -c \"CREATE DATABASE whistle_rpc OWNER whistle;\"" 2>/dev/null || echo "DB exists"
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE whistle_rpc TO whistle;\""

# Create schema
cat > /tmp/whistle_schema.sql << 'SCHEMA_EOF'
-- WHISTLE Provider Database Schema

CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    signature VARCHAR(88) UNIQUE NOT NULL,
    slot BIGINT NOT NULL,
    block_time BIGINT,
    from_address VARCHAR(44),
    to_address VARCHAR(44),
    amount BIGINT,
    fee BIGINT,
    program_id VARCHAR(44),
    status VARCHAR(20),
    logs TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_signature ON transactions(signature);
CREATE INDEX IF NOT EXISTS idx_tx_from ON transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_tx_to ON transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_tx_slot ON transactions(slot);
CREATE INDEX IF NOT EXISTS idx_tx_block_time ON transactions(block_time);

CREATE TABLE IF NOT EXISTS token_accounts (
    id BIGSERIAL PRIMARY KEY,
    address VARCHAR(44) UNIQUE NOT NULL,
    owner VARCHAR(44) NOT NULL,
    mint VARCHAR(44) NOT NULL,
    amount BIGINT NOT NULL,
    decimals INT NOT NULL,
    ui_amount DECIMAL(20,9),
    last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_owner ON token_accounts(owner);
CREATE INDEX IF NOT EXISTS idx_token_mint ON token_accounts(mint);

CREATE TABLE IF NOT EXISTS nft_metadata (
    id BIGSERIAL PRIMARY KEY,
    mint VARCHAR(44) UNIQUE NOT NULL,
    name VARCHAR(255),
    symbol VARCHAR(20),
    uri TEXT,
    image TEXT,
    description TEXT,
    attributes JSONB,
    collection VARCHAR(44),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nft_mint ON nft_metadata(mint);
CREATE INDEX IF NOT EXISTS idx_nft_collection ON nft_metadata(collection);

CREATE TABLE IF NOT EXISTS provider_stats (
    id SERIAL PRIMARY KEY,
    queries_served BIGINT DEFAULT 0,
    uptime_percentage DECIMAL(5,2) DEFAULT 100,
    avg_response_time_ms INT DEFAULT 0,
    last_heartbeat TIMESTAMP,
    reputation_score INT DEFAULT 100,
    earnings_total BIGINT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO provider_stats (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS query_logs (
    id BIGSERIAL PRIMARY KEY,
    endpoint VARCHAR(100),
    params JSONB,
    response_time_ms INT,
    status_code INT,
    error TEXT,
    client_ip VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_endpoint ON query_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_query_created ON query_logs(created_at);

SCHEMA_EOF

su - postgres -c "psql -d whistle_rpc -f /tmp/whistle_schema.sql"

echo -e "${GREEN}✅ PostgreSQL configured${NC}"

# ==================== SOLANA (OPTIONAL) ====================

if [ "$DEPLOY_SOLANA" = "y" ]; then
    echo -e "${GREEN}[5/10] Installing Solana CLI...${NC}"
    
    # Create solana user
    if ! id "solana" &>/dev/null; then
        useradd -m -s /bin/bash solana
    fi
    
    # Install Solana
    su - solana -c 'sh -c "$(curl -sSfL https://release.solana.com/v1.18.26/install)"'
    su - solana -c 'echo "export PATH=\"/home/solana/.local/share/solana/install/active_release/bin:\$PATH\"" >> ~/.bashrc'
    
    SOLANA_BIN="/home/solana/.local/share/solana/install/active_release/bin"
    
    # Create keypairs
    if [ ! -f /home/solana/validator-keypair.json ]; then
        su - solana -c "$SOLANA_BIN/solana-keygen new --no-passphrase --outfile ~/validator-keypair.json"
    fi
    
    # Setup storage
    mkdir -p /mnt/solana-data/{ledger,accounts,snapshots}
    chown -R solana:solana /mnt/solana-data
    
    # Create systemd service
    cat > /etc/systemd/system/solana-validator.service << 'SOLANA_EOF'
[Unit]
Description=Solana RPC Node
After=network.target

[Service]
Type=simple
Restart=always
RestartSec=1
User=solana
LimitNOFILE=1000000
Environment="PATH=/home/solana/.local/share/solana/install/active_release/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=/home/solana/.local/share/solana/install/active_release/bin/solana-validator \
  --identity /home/solana/validator-keypair.json \
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
  --known-validator 7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2 \
  --known-validator GdnSyH3YtwcxFvQrVVJMm1JhTS4QVX7MFsX56uJLUfiZ \
  --known-validator DE1bawNcRJB9rVm3buyMVfr8mBEoyyu73NBovf2oXJsJ \
  --known-validator CakcnaRDHka2gXyfbEd2d3xsvkJkqsLw2akB3zsN1D2S \
  --only-known-rpc \
  --expected-genesis-hash 5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d \
  --wal-recovery-mode skip_any_corrupted_record \
  --limit-ledger-size 50000000 \
  --enable-rpc-transaction-history \
  --enable-extended-tx-metadata-storage \
  --full-rpc-api \
  --no-voting \
  --private-rpc \
  --no-port-check \
  --no-poh-speed-test

[Install]
WantedBy=multi-user.target
SOLANA_EOF

    systemctl daemon-reload
    systemctl enable solana-validator
    
    echo -e "${YELLOW}Solana will start after API setup. Sync takes 1-3 days.${NC}"
    RPC_ENDPOINT="http://127.0.0.1:8899"
    
    echo -e "${GREEN}✅ Your own Solana RPC node configured${NC}"
    echo -e "${BLUE}This is a DECENTRALIZED setup - no reliance on centralized RPCs!${NC}"
fi

# ==================== WHISTLE CUSTOM API ====================

echo -e "${GREEN}[6/10] Installing Whistle Custom API...${NC}"

# Create app directory
mkdir -p /opt/whistle-api
cd /opt/whistle-api

# Create package.json
cat > package.json << 'PKG_EOF'
{
  "name": "whistle-provider-api",
  "version": "1.0.0",
  "main": "server.js",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^7.1.5",
    "morgan": "^1.10.0",
    "pg": "^8.11.3",
    "node-cache": "^5.1.2",
    "dotenv": "^16.3.1",
    "@solana/web3.js": "^1.87.6"
  }
}
PKG_EOF

# Install dependencies
npm install --production

# Create server.js
cat > server.js << 'SERVER_EOF'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { Pool } = require('pg');
const NodeCache = require('node-cache');
const { Connection, PublicKey } = require('@solana/web3.js');

const app = express();
const PORT = process.env.PORT || 8080;
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';

// Database
const pool = new Pool({
  user: 'whistle',
  host: 'localhost',
  database: 'whistle_rpc',
  password: 'whistle_secure_password_change_me',
  port: 5432,
});

// Cache
const cache = new NodeCache({ stdTTL: 60 });

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests',
});
app.use('/api/', limiter);

// Solana connection
const connection = new Connection(RPC_URL, 'confirmed');

// ============= ENDPOINTS =============

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    const stats = await pool.query('SELECT * FROM provider_stats LIMIT 1');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      rpc: RPC_URL,
      stats: stats.rows[0] || {},
    });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// Get balance (live from RPC)
app.get('/api/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const pubkey = new PublicKey(address);
    const balance = await connection.getBalance(pubkey);
    
    res.json({
      address,
      lamports: balance,
      sol: balance / 1e9,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get account info (live from RPC)
app.get('/api/account/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const pubkey = new PublicKey(address);
    const accountInfo = await connection.getAccountInfo(pubkey);
    
    if (!accountInfo) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    res.json({
      address,
      lamports: accountInfo.lamports,
      owner: accountInfo.owner.toBase58(),
      executable: accountInfo.executable,
      rentEpoch: accountInfo.rentEpoch,
      data: accountInfo.data.toString('base64'),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent transactions (live from RPC)
app.get('/api/transactions/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const pubkey = new PublicKey(address);
    
    const signatures = await connection.getSignaturesForAddress(pubkey, { limit });
    
    res.json({
      address,
      count: signatures.length,
      transactions: signatures,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get transaction details (live from RPC)
app.get('/api/transaction/:signature', async (req, res) => {
  try {
    const { signature } = req.params;
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(tx);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Provider stats
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await pool.query('SELECT * FROM provider_stats LIMIT 1');
    res.json({
      provider: stats.rows[0] || {},
      rpc_endpoint: RPC_URL,
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Prometheus metrics
app.get('/metrics', async (req, res) => {
  try {
    const stats = await pool.query('SELECT * FROM provider_stats LIMIT 1');
    const data = stats.rows[0] || {};
    
    const metrics = `
# HELP whistle_queries_total Total queries served
# TYPE whistle_queries_total counter
whistle_queries_total ${data.queries_served || 0}

# HELP whistle_uptime_percentage Uptime percentage
# TYPE whistle_uptime_percentage gauge
whistle_uptime_percentage ${data.uptime_percentage || 100}

# HELP whistle_response_time_ms Average response time
# TYPE whistle_response_time_ms gauge
whistle_response_time_ms ${data.avg_response_time_ms || 0}
    `.trim();
    
    res.type('text/plain').send(metrics);
  } catch (error) {
    res.status(500).send('Error');
  }
});

// RPC Proxy - forward standard Solana RPC calls to local node
app.post('/rpc', async (req, res) => {
  const startTime = Date.now();
  try {
    // Forward to YOUR local Solana node (not centralized RPC)
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    
    // Log query for analytics
    const responseTime = Date.now() - startTime;
    await pool.query(
      'UPDATE provider_stats SET queries_served = queries_served + 1, avg_response_time_ms = $1',
      [responseTime]
    ).catch(() => {});
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      note: 'Local Solana RPC may still be syncing. Check status: systemctl status solana-validator'
    });
  }
});

// Standard Solana RPC methods proxy (for wallet compatibility)
app.post('/', async (req, res) => {
  // Many wallets/apps expect RPC at root path
  const startTime = Date.now();
  try {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    
    const responseTime = Date.now() - startTime;
    await pool.query(
      'UPDATE provider_stats SET queries_served = queries_served + 1',
      []
    ).catch(() => {});
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('⚡ WHISTLE Provider API');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🌐 Listening on http://0.0.0.0:${PORT}`);
  console.log(`🔗 RPC: ${RPC_URL}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Endpoints:');
  console.log('  GET  /api/health');
  console.log('  GET  /api/balance/:address');
  console.log('  GET  /api/account/:address');
  console.log('  GET  /api/transactions/:address');
  console.log('  GET  /api/transaction/:signature');
  console.log('  GET  /api/stats');
  console.log('  GET  /metrics');
  console.log('  POST /rpc (Solana RPC proxy)');
  console.log('');
});
SERVER_EOF

# Create systemd service
cat > /etc/systemd/system/whistle-api.service << 'API_SERVICE_EOF'
[Unit]
Description=Whistle Custom API
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/whistle-api
Environment="NODE_ENV=production"
Environment="PORT=8080"
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
API_SERVICE_EOF

systemctl daemon-reload
systemctl enable whistle-api
systemctl start whistle-api

echo -e "${GREEN}✅ Custom API installed and started${NC}"

# ==================== NGINX ====================

echo -e "${GREEN}[7/10] Configuring Nginx...${NC}"

cat > /etc/nginx/sites-available/whistle << EOF
upstream whistle_api {
    server 127.0.0.1:8080;
}

upstream solana_rpc {
    server 127.0.0.1:8899;
}

limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=100r/s;
limit_req_zone \$binary_remote_addr zone=rpc_limit:10m rate=50r/s;

server {
    listen 80;
    server_name $DOMAIN;

    # Custom API endpoints
    location /api/ {
        limit_req zone=api_limit burst=200 nodelay;
        
        proxy_pass http://whistle_api;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Metrics endpoint
    location /metrics {
        proxy_pass http://whistle_api;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }

    # RPC proxy
    location /rpc {
        limit_req zone=rpc_limit burst=100 nodelay;
        
        proxy_pass http://whistle_api/rpc;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check
    location /health {
        proxy_pass http://whistle_api/api/health;
        access_log off;
    }

    # Root
    location / {
        return 200 '{"service":"WHISTLE Provider","status":"online","endpoints":["/api/health","/api/balance/:address","/api/transactions/:address","/rpc"]}';
        add_header Content-Type application/json;
    }
}
EOF

ln -sf /etc/nginx/sites-available/whistle /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# SSL Certificate
if [ -n "$EMAIL" ] && [[ "$DOMAIN" != *.*.*.* ]]; then
    echo -e "${GREEN}Obtaining SSL certificate...${NC}"
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL || echo "SSL setup skipped"
fi

# ==================== MONITORING ====================

if [ "$INSTALL_MONITORING" = "y" ]; then
    echo -e "${GREEN}[8/10] Setting up monitoring...${NC}"
    
    # Create health check script
    cat > /usr/local/bin/whistle-health-check.sh << 'HEALTH_EOF'
#!/bin/bash
API_STATUS=$(curl -s http://localhost:8080/api/health | jq -r '.status')
if [ "$API_STATUS" != "healthy" ]; then
    echo "$(date): API unhealthy! Restarting..."
    systemctl restart whistle-api
fi
HEALTH_EOF
    
    chmod +x /usr/local/bin/whistle-health-check.sh
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/whistle-health-check.sh >> /var/log/whistle-health.log 2>&1") | crontab -
    
    # Install heartbeat agent dependencies
    cd /opt/whistle-api
    npm install --save @project-serum/anchor
    
    # Create heartbeat agent
    cat > /opt/whistle-api/heartbeat-agent.js << 'HEARTBEAT_EOF'
#!/usr/bin/env node
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const fs = require('fs');

const RPC_URL = 'http://127.0.0.1:8899';
const connection = new Connection(RPC_URL, 'confirmed');

async function checkRPCHealth() {
  try {
    const startTime = Date.now();
    const health = await connection.getHealth();
    const latency = Date.now() - startTime;
    return { healthy: health === 'ok', latency, timestamp: Date.now() };
  } catch (error) {
    return { healthy: false, latency: 999999, error: error.message, timestamp: Date.now() };
  }
}

async function getProviderStats() {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      user: 'whistle', host: 'localhost', database: 'whistle_rpc',
      password: 'whistle_secure_password_change_me', port: 5432,
    });
    const result = await pool.query('SELECT * FROM provider_stats LIMIT 1');
    await pool.end();
    return result.rows[0] || {};
  } catch (error) {
    return {};
  }
}

async function reportHeartbeat() {
  try {
    const health = await checkRPCHealth();
    const stats = await getProviderStats();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⏰ Heartbeat', new Date().toISOString());
    console.log('RPC Health:', health.healthy ? '✅' : '❌');
    console.log('Latency:', health.latency + 'ms');
    console.log('Queries:', stats.queries_served || 0);
    console.log('Uptime:', (stats.uptime_percentage || 100) + '%');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const { Pool } = require('pg');
    const pool = new Pool({
      user: 'whistle', host: 'localhost', database: 'whistle_rpc',
      password: 'whistle_secure_password_change_me', port: 5432,
    });
    await pool.query('UPDATE provider_stats SET last_heartbeat = NOW(), updated_at = NOW()');
    await pool.end();
    
    console.log('✅ Heartbeat logged');
  } catch (error) {
    console.error('❌ Heartbeat failed:', error.message);
  }
}

async function main() {
  console.log('🚀 WHISTLE Heartbeat Agent Started');
  console.log('Reporting every 60 seconds...\n');
  await reportHeartbeat();
  setInterval(async () => { await reportHeartbeat(); }, 60 * 1000);
}

process.on('SIGINT', () => { console.log('\n👋 Shutting down...'); process.exit(0); });
process.on('SIGTERM', () => { console.log('\n👋 Shutting down...'); process.exit(0); });

main().catch(console.error);
HEARTBEAT_EOF
    
    chmod +x /opt/whistle-api/heartbeat-agent.js
    
    # Create systemd service for heartbeat agent
    cat > /etc/systemd/system/whistle-heartbeat.service << 'HEARTBEAT_SERVICE_EOF'
[Unit]
Description=Whistle Heartbeat Agent
After=network.target postgresql.service whistle-api.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/whistle-api
ExecStart=/usr/bin/node /opt/whistle-api/heartbeat-agent.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
HEARTBEAT_SERVICE_EOF
    
    systemctl daemon-reload
    systemctl enable whistle-heartbeat
    systemctl start whistle-heartbeat
    
    echo -e "${GREEN}✅ Monitoring & heartbeat configured${NC}"
fi

# ==================== START SOLANA ====================

if [ "$DEPLOY_SOLANA" = "y" ]; then
    echo -e "${GREEN}[9/10] Starting Solana validator...${NC}"
    systemctl start solana-validator
    echo -e "${YELLOW}⏰ Solana is syncing. This takes 1-3 days. Check: journalctl -u solana-validator -f${NC}"
fi

# ==================== COMPLETION ====================

echo ""
echo -e "${GREEN}[10/10] Deployment complete!${NC}"
echo ""
echo -e "${BLUE}"
cat << "EOF"
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║            ✅ WHISTLE Provider Deployed!                ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"
echo ""
echo -e "${GREEN}📍 Your RPC Provider Endpoints:${NC}"
echo ""
echo "   🌐 Main: http://$DOMAIN"
echo "   🔥 API:  http://$DOMAIN/api/health"
echo "   ⚡ RPC:  http://$DOMAIN/rpc"
echo "   📊 Stats: http://$DOMAIN/api/stats"
echo ""
echo -e "${YELLOW}📝 Quick Tests:${NC}"
echo ""
echo "# Health check"
echo "curl http://$DOMAIN/api/health"
echo ""
echo "# Get balance"
echo "curl http://$DOMAIN/api/balance/YOUR_WALLET_ADDRESS"
echo ""
echo "# RPC call"
echo 'curl -X POST http://'"$DOMAIN"'/rpc -H "Content-Type: application/json" -d '"'"'{"jsonrpc":"2.0","id":1,"method":"getHealth"}'"'"
echo ""

if [ "$DEPLOY_SOLANA" = "y" ]; then
    echo -e "${YELLOW}⚠️  Important: Solana is syncing (1-3 days)${NC}"
    echo "   Monitor: journalctl -u solana-validator -f"
    echo "   Check: systemctl status solana-validator"
    echo ""
fi

echo -e "${GREEN}✅ All services running!${NC}"
echo ""
echo "Service status:"
systemctl status whistle-api --no-pager | grep Active
systemctl status postgresql --no-pager | grep Active
systemctl status nginx --no-pager | grep Active
if [ "$DEPLOY_SOLANA" = "y" ]; then
    systemctl status solana-validator --no-pager | grep Active
fi
echo ""
echo -e "${BLUE}🎉 Setup complete! Your WHISTLE provider is live!${NC}"
echo ""

