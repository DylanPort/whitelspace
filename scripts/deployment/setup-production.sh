#!/bin/bash

##############################################################################
# Ghost Whistle - Production Setup Script
# This script automates the production setup on a new server
##############################################################################

set -e  # Exit on any error

echo "🚀 Ghost Whistle Production Setup"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Please run as regular user, not root"
    exit 1
fi

echo "Step 1: Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq
print_success "System updated"

echo ""
echo "Step 2: Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_success "Node.js installed: $(node --version)"
else
    print_success "Node.js already installed: $(node --version)"
fi

echo ""
echo "Step 3: Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    print_success "PM2 installed: $(pm2 --version)"
else
    print_success "PM2 already installed: $(pm2 --version)"
fi

echo ""
echo "Step 4: Installing dependencies..."
if [ -f "package.json" ]; then
    npm install --production
    print_success "Dependencies installed"
else
    print_error "package.json not found"
    exit 1
fi

echo ""
echo "Step 5: Creating required directories..."
mkdir -p logs node-storage
chmod 755 logs node-storage
print_success "Directories created"

echo ""
echo "Step 6: Checking node keypairs..."
if [ -d "node-keys" ] && [ "$(ls -A node-keys)" ]; then
    KEY_COUNT=$(ls node-keys/*.json 2>/dev/null | wc -l)
    print_success "Found $KEY_COUNT node keypairs"
    
    # Set secure permissions
    chmod 700 node-keys
    chmod 600 node-keys/*.json
    print_success "Secure permissions set on keypairs"
else
    print_error "node-keys directory is empty or missing"
    print_warning "Please transfer your node keypairs to node-keys/"
    echo ""
    echo "On your local machine, run:"
    echo "  scp -r node-keys $(whoami)@$(hostname -I | awk '{print $1}'):~/ghost-whistle/"
    exit 1
fi

echo ""
echo "Step 7: Configuring environment..."
if [ ! -f ".env" ]; then
    print_warning "No .env file found. Creating template..."
    cat > .env << 'EOF'
# Production Environment Configuration

# Signaling Server
SIGNALING_SERVER=wss://your-signaling-server.com

# Solana RPC (Get your own at helius.dev or quicknode.com)
RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY

# Node Environment
NODE_ENV=production

# Supabase (Optional - for stats tracking)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-key
EOF
    print_warning ".env template created - PLEASE EDIT IT WITH YOUR VALUES"
    echo ""
    echo "Edit the file with: nano .env"
    echo "Then run this script again."
    exit 1
else
    print_success ".env file found"
fi

echo ""
echo "Step 8: Setting up PM2 for auto-start..."
pm2 startup systemd -u $(whoami) --hp $(eval echo ~$(whoami)) > /tmp/pm2-startup.sh 2>&1
if grep -q "sudo" /tmp/pm2-startup.sh; then
    print_warning "Run the following command to enable PM2 auto-start:"
    echo ""
    grep "sudo" /tmp/pm2-startup.sh
    echo ""
else
    print_success "PM2 startup configured"
fi

echo ""
echo "Step 9: Installing PM2 log rotate..."
pm2 install pm2-logrotate 2>/dev/null || true
pm2 set pm2-logrotate:max_size 10M 2>/dev/null || true
pm2 set pm2-logrotate:retain 30 2>/dev/null || true
print_success "Log rotation configured"

echo ""
echo "Step 10: Configuring firewall..."
if command -v ufw &> /dev/null; then
    read -p "Do you want to configure UFW firewall? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo ufw --force enable
        sudo ufw default deny incoming
        sudo ufw default allow outgoing
        sudo ufw allow ssh
        sudo ufw allow 8080/tcp  # If running signaling server
        print_success "Firewall configured"
    fi
else
    print_warning "UFW not installed, skipping firewall setup"
fi

echo ""
echo "=================================="
echo "✅ Production Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Edit .env if you haven't already: nano .env"
echo "2. Choose which nodes to run on this server"
echo "3. Start nodes: pm2 start ecosystem.production.js"
echo "4. Save PM2 config: pm2 save"
echo "5. Check status: pm2 status"
echo "6. View logs: pm2 logs"
echo ""
echo "Useful commands:"
echo "  pm2 list          - List all processes"
echo "  pm2 logs          - View logs"
echo "  pm2 restart all   - Restart all nodes"
echo "  pm2 monit         - Monitor resources"
echo ""
print_success "Your Ghost Whistle node is ready to start!"

