#!/bin/bash

# Ghost Whistle - Automated Vultr Deployment Script
# This script deploys 2 nodes to a single Vultr VPS

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ "$#" -lt 3 ]; then
    echo -e "${RED}Usage: ./deploy-to-vultr.sh <SERVER_IP> <NODE_ID_1> <NODE_ID_2> [SIGNALING_IP]${NC}"
    echo ""
    echo "Examples:"
    echo "  ./deploy-to-vultr.sh 1.2.3.4 1 2 localhost           # First server (with signaling)"
    echo "  ./deploy-to-vultr.sh 5.6.7.8 3 4 1.2.3.4             # Other servers"
    echo ""
    exit 1
fi

SERVER_IP=$1
NODE1=$2
NODE2=$3
SIGNALING_IP=${4:-"localhost"}

echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Ghost Whistle - Deploying to $SERVER_IP${NC}"
echo -e "${GREEN}   Nodes: bootstrap-node-$NODE1, bootstrap-node-$NODE2${NC}"
echo -e "${GREEN}   Signaling: $SIGNALING_IP${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"

# Check if keypairs exist
if [ ! -f "node-keys/bootstrap-node-$NODE1-keypair.json" ]; then
    echo -e "${RED}Error: node-keys/bootstrap-node-$NODE1-keypair.json not found!${NC}"
    exit 1
fi

if [ ! -f "node-keys/bootstrap-node-$NODE2-keypair.json" ]; then
    echo -e "${RED}Error: node-keys/bootstrap-node-$NODE2-keypair.json not found!${NC}"
    exit 1
fi

# Step 1: Initial server setup
echo -e "\n${YELLOW}[1/6] Setting up server...${NC}"
ssh root@$SERVER_IP << 'ENDSSH'
    # Update system
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get upgrade -y -qq
    
    # Install Node.js 18
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs -qq
    
    # Install PM2
    npm install -g pm2 --silent
    
    # Install Solana CLI
    sh -c "$(curl -sSfL https://release.solana.com/stable/install)" > /dev/null 2>&1
    echo 'export PATH="/root/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
    
    # Configure firewall
    ufw --force enable
    ufw allow 22/tcp > /dev/null 2>&1
    ufw allow 8080/tcp > /dev/null 2>&1
    ufw allow 3001/tcp > /dev/null 2>&1
    
    # Create directories
    mkdir -p /root/ghost-whistle/node-keys
    mkdir -p /root/ghost-whistle/node-storage
    
    echo "✓ Server setup complete"
ENDSSH

# Step 2: Upload application files
echo -e "${YELLOW}[2/6] Uploading application files...${NC}"
scp -q -r \
    node-client.js \
    signaling-server.js \
    server.js \
    package.json \
    root@$SERVER_IP:/root/ghost-whistle/

# Step 3: Upload keypairs
echo -e "${YELLOW}[3/6] Uploading keypairs...${NC}"
scp -q node-keys/bootstrap-node-$NODE1-keypair.json root@$SERVER_IP:/root/ghost-whistle/node-keys/
scp -q node-keys/bootstrap-node-$NODE2-keypair.json root@$SERVER_IP:/root/ghost-whistle/node-keys/

# Step 4: Create PM2 config
echo -e "${YELLOW}[4/6] Creating PM2 configuration...${NC}"

IS_SIGNALING_SERVER="false"
if [ "$SIGNALING_IP" == "localhost" ]; then
    IS_SIGNALING_SERVER="true"
fi

# Determine region based on node numbers
REGION="Unknown"
case $NODE1 in
    1|2) REGION="US-East" ;;
    3|4) REGION="US-West" ;;
    5|6) REGION="EU-West" ;;
    7|8) REGION="Asia-Pacific" ;;
    9|10) REGION="Other" ;;
esac

# Create PM2 config
cat > /tmp/ecosystem.config.js << EOF
module.exports = {
  apps: [
EOF

# Add signaling server if this is the first server
if [ "$IS_SIGNALING_SERVER" == "true" ]; then
    cat >> /tmp/ecosystem.config.js << EOF
    {
      name: 'signaling-server',
      script: './signaling-server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        PORT: 8080,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'backend-api',
      script: './server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        PORT: 3001,
        NODE_ENV: 'production'
      }
    },
EOF
fi

# Add both nodes
cat >> /tmp/ecosystem.config.js << EOF
    {
      name: 'bootstrap-node-$NODE1',
      script: './node-client.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ID: 'bootstrap-node-$NODE1',
        NODE_REGION: '$REGION',
        KEYPAIR_PATH: './node-keys/bootstrap-node-$NODE1-keypair.json',
        SIGNALING_SERVER: 'ws://$SIGNALING_IP:8080',
        RPC_URL: 'https://api.mainnet-beta.solana.com',
        STORAGE_DIR: './node-storage/node-$NODE1'
      }
    },
    {
      name: 'bootstrap-node-$NODE2',
      script: './node-client.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ID: 'bootstrap-node-$NODE2',
        NODE_REGION: '$REGION',
        KEYPAIR_PATH: './node-keys/bootstrap-node-$NODE2-keypair.json',
        SIGNALING_SERVER: 'ws://$SIGNALING_IP:8080',
        RPC_URL: 'https://api.mainnet-beta.solana.com',
        STORAGE_DIR: './node-storage/node-$NODE2'
      }
    }
  ]
};
EOF

# Upload config
scp -q /tmp/ecosystem.config.js root@$SERVER_IP:/root/ghost-whistle/ecosystem.config.js
rm /tmp/ecosystem.config.js

# Step 5: Install dependencies and set permissions
echo -e "${YELLOW}[5/6] Installing dependencies...${NC}"
ssh root@$SERVER_IP << 'ENDSSH'
    cd /root/ghost-whistle
    chmod 600 node-keys/*.json
    npm install --silent > /dev/null 2>&1
    echo "✓ Dependencies installed"
ENDSSH

# Step 6: Start services
echo -e "${YELLOW}[6/6] Starting services...${NC}"
ssh root@$SERVER_IP << 'ENDSSH'
    cd /root/ghost-whistle
    pm2 delete all > /dev/null 2>&1 || true
    pm2 start ecosystem.config.js
    pm2 save > /dev/null 2>&1
    pm2 startup > /dev/null 2>&1 || true
    echo "✓ Services started"
ENDSSH

# Summary
echo -e "\n${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Server: ${GREEN}$SERVER_IP${NC}"
echo -e "Nodes:  ${GREEN}bootstrap-node-$NODE1, bootstrap-node-$NODE2${NC}"
echo ""
echo -e "Check status:"
echo -e "  ${YELLOW}ssh root@$SERVER_IP 'cd /root/ghost-whistle && pm2 status'${NC}"
echo ""
echo -e "View logs:"
echo -e "  ${YELLOW}ssh root@$SERVER_IP 'cd /root/ghost-whistle && pm2 logs --lines 50'${NC}"
echo ""

