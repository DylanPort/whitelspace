#!/bin/bash

# WHISTLE Cache Node Setup Script for Linux
# Supports Ubuntu, Debian, Fedora, CentOS, Arch, and other major distributions

echo -e "\033[36m╔══════════════════════════════════════════════════════════╗\033[0m"
echo -e "\033[36m║         WHISTLE Cache Node Setup - Linux                 ║\033[0m"
echo -e "\033[36m╚══════════════════════════════════════════════════════════╝\033[0m"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Detect Linux distribution
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
        ID=$ID
    elif type lsb_release >/dev/null 2>&1; then
        OS=$(lsb_release -si)
        VER=$(lsb_release -sr)
    else
        OS=$(uname -s)
        VER=$(uname -r)
    fi
    
    echo -e "${CYAN}Detected: $OS${NC}"
}

detect_distro

# Step 1: Check if Docker is installed
echo -e "${YELLOW}Step 1: Checking Docker installation...${NC}"

if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker is already installed${NC}"
    docker --version
else
    echo -e "${YELLOW}📦 Docker not found. Installing Docker...${NC}"
    
    # Install Docker based on distribution
    case "$ID" in
        ubuntu|debian|raspbian)
            echo -e "${CYAN}Installing Docker for $OS...${NC}"
            
            # Update package index
            sudo apt-get update
            
            # Install prerequisites
            sudo apt-get install -y \
                apt-transport-https \
                ca-certificates \
                curl \
                gnupg \
                lsb-release
            
            # Add Docker's official GPG key
            curl -fsSL https://download.docker.com/linux/$ID/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
            
            # Set up stable repository
            echo \
              "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/$ID \
              $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            
            # Install Docker Engine
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            ;;
            
        fedora|centos|rhel)
            echo -e "${CYAN}Installing Docker for $OS...${NC}"
            
            # Install prerequisites
            sudo dnf -y install dnf-plugins-core
            
            # Add Docker repository
            sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
            
            # Install Docker Engine
            sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            ;;
            
        arch|manjaro)
            echo -e "${CYAN}Installing Docker for $OS...${NC}"
            
            # Install Docker
            sudo pacman -S --noconfirm docker docker-compose
            ;;
            
        *)
            echo -e "${CYAN}Using universal Docker installation script...${NC}"
            curl -fsSL https://get.docker.com | sh
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Docker installed successfully${NC}"
        
        # Start Docker service
        sudo systemctl start docker
        sudo systemctl enable docker
        
        # Add current user to docker group
        echo -e "${YELLOW}Adding user to docker group...${NC}"
        sudo usermod -aG docker $USER
        
        echo -e "${YELLOW}⚠️  You need to log out and back in for group changes to take effect${NC}"
        echo -e "${YELLOW}Or run: newgrp docker${NC}"
        
        # Try to activate group without logout
        newgrp docker &> /dev/null || true
    else
        echo -e "${RED}❌ Failed to install Docker${NC}"
        echo -e "${YELLOW}Please install Docker manually from: https://docs.docker.com/engine/install/${NC}"
        exit 1
    fi
fi

# Step 2: Ensure Docker service is running
echo ""
echo -e "${YELLOW}Step 2: Verifying Docker service...${NC}"

if ! systemctl is-active --quiet docker; then
    echo -e "${YELLOW}Starting Docker service...${NC}"
    sudo systemctl start docker
fi

if ! docker info &> /dev/null; then
    echo -e "${YELLOW}Docker requires sudo or group membership. Trying with sudo...${NC}"
    if ! sudo docker info &> /dev/null; then
        echo -e "${RED}❌ Docker is not running properly${NC}"
        exit 1
    fi
    DOCKER_CMD="sudo docker"
else
    DOCKER_CMD="docker"
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Step 3: Get wallet address
echo ""
echo -e "${YELLOW}Step 3: Configure your wallet${NC}"
read -p "Enter your Solana wallet address: " wallet

if [ -z "$wallet" ]; then
    echo -e "${RED}❌ Wallet address is required${NC}"
    exit 1
fi

# Step 4: Choose location
echo ""
echo -e "${YELLOW}Step 4: Select your geographic location${NC}"
echo "1. US-East"
echo "2. US-West"
echo "3. Europe"
echo "4. Asia"
echo "5. Other"
read -p "Enter choice (1-5): " location_choice

case $location_choice in
    1) location="US-East" ;;
    2) location="US-West" ;;
    3) location="Europe" ;;
    4) location="Asia" ;;
    *) location="Global" ;;
esac

# Step 5: Configure firewall (if applicable)
echo ""
echo -e "${YELLOW}Step 5: Configuring firewall...${NC}"

# Check for UFW (Ubuntu/Debian)
if command -v ufw &> /dev/null; then
    if sudo ufw status | grep -q "Status: active"; then
        echo -e "${CYAN}Opening port 8545 in UFW...${NC}"
        sudo ufw allow 8545/tcp
        echo -e "${GREEN}✅ Firewall configured${NC}"
    fi
# Check for firewalld (Fedora/CentOS/RHEL)
elif command -v firewall-cmd &> /dev/null; then
    if sudo firewall-cmd --state 2>/dev/null | grep -q "running"; then
        echo -e "${CYAN}Opening port 8545 in firewalld...${NC}"
        sudo firewall-cmd --permanent --add-port=8545/tcp
        sudo firewall-cmd --reload
        echo -e "${GREEN}✅ Firewall configured${NC}"
    fi
else
    echo -e "${CYAN}No active firewall detected${NC}"
fi

# Step 6: Stop existing container if running
echo ""
echo -e "${YELLOW}Step 6: Checking for existing cache node...${NC}"

if $DOCKER_CMD ps -a --format '{{.Names}}' | grep -q "^whistle-cache$"; then
    echo -e "${YELLOW}Stopping existing cache node...${NC}"
    $DOCKER_CMD stop whistle-cache &> /dev/null
    $DOCKER_CMD rm whistle-cache &> /dev/null
    echo -e "${GREEN}✅ Existing node stopped${NC}"
fi

# Step 7: Run the cache node
echo ""
echo -e "${YELLOW}Step 7: Starting WHISTLE cache node...${NC}"

run_command="$DOCKER_CMD run -d \
  --name whistle-cache \
  -e WALLET_ADDRESS=$wallet \
  -e NODE_LOCATION=$location \
  -p 8545:8545 \
  --restart unless-stopped \
  --memory=\"2g\" \
  --cpus=\"1\" \
  whistlenet/cache-node:latest"

echo -e "${CYAN}Running command:${NC}"
echo "$run_command"

if eval $run_command; then
    echo ""
    echo -e "${GREEN}✅ Cache node started successfully!${NC}"
    
    # Wait a moment for container to start
    sleep 3
    
    # Show container status
    echo ""
    echo -e "${YELLOW}Container Status:${NC}"
    $DOCKER_CMD ps --filter "name=whistle-cache" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    # Show logs
    echo ""
    echo -e "${YELLOW}Node Logs:${NC}"
    $DOCKER_CMD logs whistle-cache --tail 20
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              🎉 Setup Complete!                          ║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  Your cache node is now running and earning SOL!         ║${NC}"
    echo -e "${GREEN}║                                                          ║${NC}"
    echo -e "${GREEN}║  Monitor your node:                                      ║${NC}"
    echo -e "${GREEN}║  > Logs: $DOCKER_CMD logs whistle-cache -f              ║${NC}"
    echo -e "${GREEN}║  > Stats: curl http://localhost:8545/metrics            ║${NC}"
    echo -e "${GREEN}║  > Stop: $DOCKER_CMD stop whistle-cache                 ║${NC}"
    echo -e "${GREEN}║                                                          ║${NC}"
    echo -e "${GREEN}║  Dashboard: https://whistle.network/provider             ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    
    # Create systemd service for auto-start
    echo ""
    read -p "Create systemd service for auto-start on boot? (y/n): " create_service
    
    if [[ "$create_service" == "y" || "$create_service" == "Y" ]]; then
        service_file="/etc/systemd/system/whistle-cache-node.service"
        
        sudo tee $service_file > /dev/null << EOF
[Unit]
Description=WHISTLE Cache Node
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/docker start whistle-cache
ExecStop=/usr/bin/docker stop whistle-cache

[Install]
WantedBy=multi-user.target
EOF
        
        sudo systemctl daemon-reload
        sudo systemctl enable whistle-cache-node.service
        echo -e "${GREEN}✅ Systemd service created and enabled${NC}"
        echo -e "${CYAN}The node will automatically start on system boot${NC}"
    fi
    
    # Create convenience scripts
    echo ""
    read -p "Create helper scripts in /usr/local/bin? (y/n): " create_scripts
    
    if [[ "$create_scripts" == "y" || "$create_scripts" == "Y" ]]; then
        # Create whistle-node command
        sudo tee /usr/local/bin/whistle-node > /dev/null << 'EOF'
#!/bin/bash

case "$1" in
    logs)
        docker logs whistle-cache -f
        ;;
    stats)
        curl -s http://localhost:8545/metrics | python3 -m json.tool
        ;;
    stop)
        docker stop whistle-cache
        echo "Cache node stopped"
        ;;
    start)
        docker start whistle-cache
        echo "Cache node started"
        ;;
    restart)
        docker restart whistle-cache
        echo "Cache node restarted"
        ;;
    status)
        docker ps --filter "name=whistle-cache" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        ;;
    earnings)
        curl -s http://localhost:8545/metrics | python3 -c "import sys, json; data = json.load(sys.stdin); print(f\"Total Earnings: {data.get('totalEarnings', 0)} SOL\")"
        ;;
    *)
        echo "WHISTLE Cache Node Manager"
        echo "Usage: whistle-node [command]"
        echo ""
        echo "Commands:"
        echo "  logs     - View live logs"
        echo "  stats    - Show node metrics"
        echo "  stop     - Stop the node"
        echo "  start    - Start the node"
        echo "  restart  - Restart the node"
        echo "  status   - Show node status"
        echo "  earnings - Show total earnings"
        ;;
esac
EOF
        
        sudo chmod +x /usr/local/bin/whistle-node
        echo -e "${GREEN}✅ Helper script installed${NC}"
        echo -e "${CYAN}You can now use 'whistle-node' command to manage your node${NC}"
        echo ""
        echo "Available commands:"
        echo "  whistle-node logs     - View live logs"
        echo "  whistle-node stats    - Check node metrics"
        echo "  whistle-node stop     - Stop the node"
        echo "  whistle-node start    - Start the node"
        echo "  whistle-node restart  - Restart the node"
        echo "  whistle-node status   - Show node status"
        echo "  whistle-node earnings - Show total earnings"
    fi
    
    # Setup log rotation
    echo ""
    echo -e "${CYAN}Setting up log rotation...${NC}"
    sudo tee /etc/logrotate.d/whistle-cache-node > /dev/null << EOF
/var/lib/docker/containers/*-json.log {
    daily
    rotate 7
    compress
    missingok
    delaycompress
    copytruncate
}
EOF
    echo -e "${GREEN}✅ Log rotation configured${NC}"
    
else
    echo -e "${RED}❌ Failed to start cache node${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}Setup complete! Your node is running and earning SOL.${NC}"
echo ""


# WHISTLE Cache Node Setup Script for Linux
# Supports Ubuntu, Debian, Fedora, CentOS, Arch, and other major distributions

echo -e "\033[36m╔══════════════════════════════════════════════════════════╗\033[0m"
echo -e "\033[36m║         WHISTLE Cache Node Setup - Linux                 ║\033[0m"
echo -e "\033[36m╚══════════════════════════════════════════════════════════╝\033[0m"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Detect Linux distribution
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
        ID=$ID
    elif type lsb_release >/dev/null 2>&1; then
        OS=$(lsb_release -si)
        VER=$(lsb_release -sr)
    else
        OS=$(uname -s)
        VER=$(uname -r)
    fi
    
    echo -e "${CYAN}Detected: $OS${NC}"
}

detect_distro

# Step 1: Check if Docker is installed
echo -e "${YELLOW}Step 1: Checking Docker installation...${NC}"

if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker is already installed${NC}"
    docker --version
else
    echo -e "${YELLOW}📦 Docker not found. Installing Docker...${NC}"
    
    # Install Docker based on distribution
    case "$ID" in
        ubuntu|debian|raspbian)
            echo -e "${CYAN}Installing Docker for $OS...${NC}"
            
            # Update package index
            sudo apt-get update
            
            # Install prerequisites
            sudo apt-get install -y \
                apt-transport-https \
                ca-certificates \
                curl \
                gnupg \
                lsb-release
            
            # Add Docker's official GPG key
            curl -fsSL https://download.docker.com/linux/$ID/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
            
            # Set up stable repository
            echo \
              "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/$ID \
              $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            
            # Install Docker Engine
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            ;;
            
        fedora|centos|rhel)
            echo -e "${CYAN}Installing Docker for $OS...${NC}"
            
            # Install prerequisites
            sudo dnf -y install dnf-plugins-core
            
            # Add Docker repository
            sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
            
            # Install Docker Engine
            sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            ;;
            
        arch|manjaro)
            echo -e "${CYAN}Installing Docker for $OS...${NC}"
            
            # Install Docker
            sudo pacman -S --noconfirm docker docker-compose
            ;;
            
        *)
            echo -e "${CYAN}Using universal Docker installation script...${NC}"
            curl -fsSL https://get.docker.com | sh
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Docker installed successfully${NC}"
        
        # Start Docker service
        sudo systemctl start docker
        sudo systemctl enable docker
        
        # Add current user to docker group
        echo -e "${YELLOW}Adding user to docker group...${NC}"
        sudo usermod -aG docker $USER
        
        echo -e "${YELLOW}⚠️  You need to log out and back in for group changes to take effect${NC}"
        echo -e "${YELLOW}Or run: newgrp docker${NC}"
        
        # Try to activate group without logout
        newgrp docker &> /dev/null || true
    else
        echo -e "${RED}❌ Failed to install Docker${NC}"
        echo -e "${YELLOW}Please install Docker manually from: https://docs.docker.com/engine/install/${NC}"
        exit 1
    fi
fi

# Step 2: Ensure Docker service is running
echo ""
echo -e "${YELLOW}Step 2: Verifying Docker service...${NC}"

if ! systemctl is-active --quiet docker; then
    echo -e "${YELLOW}Starting Docker service...${NC}"
    sudo systemctl start docker
fi

if ! docker info &> /dev/null; then
    echo -e "${YELLOW}Docker requires sudo or group membership. Trying with sudo...${NC}"
    if ! sudo docker info &> /dev/null; then
        echo -e "${RED}❌ Docker is not running properly${NC}"
        exit 1
    fi
    DOCKER_CMD="sudo docker"
else
    DOCKER_CMD="docker"
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Step 3: Get wallet address
echo ""
echo -e "${YELLOW}Step 3: Configure your wallet${NC}"
read -p "Enter your Solana wallet address: " wallet

if [ -z "$wallet" ]; then
    echo -e "${RED}❌ Wallet address is required${NC}"
    exit 1
fi

# Step 4: Choose location
echo ""
echo -e "${YELLOW}Step 4: Select your geographic location${NC}"
echo "1. US-East"
echo "2. US-West"
echo "3. Europe"
echo "4. Asia"
echo "5. Other"
read -p "Enter choice (1-5): " location_choice

case $location_choice in
    1) location="US-East" ;;
    2) location="US-West" ;;
    3) location="Europe" ;;
    4) location="Asia" ;;
    *) location="Global" ;;
esac

# Step 5: Configure firewall (if applicable)
echo ""
echo -e "${YELLOW}Step 5: Configuring firewall...${NC}"

# Check for UFW (Ubuntu/Debian)
if command -v ufw &> /dev/null; then
    if sudo ufw status | grep -q "Status: active"; then
        echo -e "${CYAN}Opening port 8545 in UFW...${NC}"
        sudo ufw allow 8545/tcp
        echo -e "${GREEN}✅ Firewall configured${NC}"
    fi
# Check for firewalld (Fedora/CentOS/RHEL)
elif command -v firewall-cmd &> /dev/null; then
    if sudo firewall-cmd --state 2>/dev/null | grep -q "running"; then
        echo -e "${CYAN}Opening port 8545 in firewalld...${NC}"
        sudo firewall-cmd --permanent --add-port=8545/tcp
        sudo firewall-cmd --reload
        echo -e "${GREEN}✅ Firewall configured${NC}"
    fi
else
    echo -e "${CYAN}No active firewall detected${NC}"
fi

# Step 6: Stop existing container if running
echo ""
echo -e "${YELLOW}Step 6: Checking for existing cache node...${NC}"

if $DOCKER_CMD ps -a --format '{{.Names}}' | grep -q "^whistle-cache$"; then
    echo -e "${YELLOW}Stopping existing cache node...${NC}"
    $DOCKER_CMD stop whistle-cache &> /dev/null
    $DOCKER_CMD rm whistle-cache &> /dev/null
    echo -e "${GREEN}✅ Existing node stopped${NC}"
fi

# Step 7: Run the cache node
echo ""
echo -e "${YELLOW}Step 7: Starting WHISTLE cache node...${NC}"

run_command="$DOCKER_CMD run -d \
  --name whistle-cache \
  -e WALLET_ADDRESS=$wallet \
  -e NODE_LOCATION=$location \
  -p 8545:8545 \
  --restart unless-stopped \
  --memory=\"2g\" \
  --cpus=\"1\" \
  whistlenet/cache-node:latest"

echo -e "${CYAN}Running command:${NC}"
echo "$run_command"

if eval $run_command; then
    echo ""
    echo -e "${GREEN}✅ Cache node started successfully!${NC}"
    
    # Wait a moment for container to start
    sleep 3
    
    # Show container status
    echo ""
    echo -e "${YELLOW}Container Status:${NC}"
    $DOCKER_CMD ps --filter "name=whistle-cache" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    # Show logs
    echo ""
    echo -e "${YELLOW}Node Logs:${NC}"
    $DOCKER_CMD logs whistle-cache --tail 20
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              🎉 Setup Complete!                          ║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  Your cache node is now running and earning SOL!         ║${NC}"
    echo -e "${GREEN}║                                                          ║${NC}"
    echo -e "${GREEN}║  Monitor your node:                                      ║${NC}"
    echo -e "${GREEN}║  > Logs: $DOCKER_CMD logs whistle-cache -f              ║${NC}"
    echo -e "${GREEN}║  > Stats: curl http://localhost:8545/metrics            ║${NC}"
    echo -e "${GREEN}║  > Stop: $DOCKER_CMD stop whistle-cache                 ║${NC}"
    echo -e "${GREEN}║                                                          ║${NC}"
    echo -e "${GREEN}║  Dashboard: https://whistle.network/provider             ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    
    # Create systemd service for auto-start
    echo ""
    read -p "Create systemd service for auto-start on boot? (y/n): " create_service
    
    if [[ "$create_service" == "y" || "$create_service" == "Y" ]]; then
        service_file="/etc/systemd/system/whistle-cache-node.service"
        
        sudo tee $service_file > /dev/null << EOF
[Unit]
Description=WHISTLE Cache Node
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/docker start whistle-cache
ExecStop=/usr/bin/docker stop whistle-cache

[Install]
WantedBy=multi-user.target
EOF
        
        sudo systemctl daemon-reload
        sudo systemctl enable whistle-cache-node.service
        echo -e "${GREEN}✅ Systemd service created and enabled${NC}"
        echo -e "${CYAN}The node will automatically start on system boot${NC}"
    fi
    
    # Create convenience scripts
    echo ""
    read -p "Create helper scripts in /usr/local/bin? (y/n): " create_scripts
    
    if [[ "$create_scripts" == "y" || "$create_scripts" == "Y" ]]; then
        # Create whistle-node command
        sudo tee /usr/local/bin/whistle-node > /dev/null << 'EOF'
#!/bin/bash

case "$1" in
    logs)
        docker logs whistle-cache -f
        ;;
    stats)
        curl -s http://localhost:8545/metrics | python3 -m json.tool
        ;;
    stop)
        docker stop whistle-cache
        echo "Cache node stopped"
        ;;
    start)
        docker start whistle-cache
        echo "Cache node started"
        ;;
    restart)
        docker restart whistle-cache
        echo "Cache node restarted"
        ;;
    status)
        docker ps --filter "name=whistle-cache" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        ;;
    earnings)
        curl -s http://localhost:8545/metrics | python3 -c "import sys, json; data = json.load(sys.stdin); print(f\"Total Earnings: {data.get('totalEarnings', 0)} SOL\")"
        ;;
    *)
        echo "WHISTLE Cache Node Manager"
        echo "Usage: whistle-node [command]"
        echo ""
        echo "Commands:"
        echo "  logs     - View live logs"
        echo "  stats    - Show node metrics"
        echo "  stop     - Stop the node"
        echo "  start    - Start the node"
        echo "  restart  - Restart the node"
        echo "  status   - Show node status"
        echo "  earnings - Show total earnings"
        ;;
esac
EOF
        
        sudo chmod +x /usr/local/bin/whistle-node
        echo -e "${GREEN}✅ Helper script installed${NC}"
        echo -e "${CYAN}You can now use 'whistle-node' command to manage your node${NC}"
        echo ""
        echo "Available commands:"
        echo "  whistle-node logs     - View live logs"
        echo "  whistle-node stats    - Check node metrics"
        echo "  whistle-node stop     - Stop the node"
        echo "  whistle-node start    - Start the node"
        echo "  whistle-node restart  - Restart the node"
        echo "  whistle-node status   - Show node status"
        echo "  whistle-node earnings - Show total earnings"
    fi
    
    # Setup log rotation
    echo ""
    echo -e "${CYAN}Setting up log rotation...${NC}"
    sudo tee /etc/logrotate.d/whistle-cache-node > /dev/null << EOF
/var/lib/docker/containers/*-json.log {
    daily
    rotate 7
    compress
    missingok
    delaycompress
    copytruncate
}
EOF
    echo -e "${GREEN}✅ Log rotation configured${NC}"
    
else
    echo -e "${RED}❌ Failed to start cache node${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}Setup complete! Your node is running and earning SOL.${NC}"
echo ""
