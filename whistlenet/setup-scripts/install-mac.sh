#!/bin/bash

# WHISTLE Cache Node Setup Script for macOS
# Run this script in Terminal

echo -e "\033[36m╔══════════════════════════════════════════════════════════╗\033[0m"
echo -e "\033[36m║         WHISTLE Cache Node Setup - macOS                 ║\033[0m"
echo -e "\033[36m╚══════════════════════════════════════════════════════════╝\033[0m"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Step 1: Check if Docker is installed
echo -e "${YELLOW}Step 1: Checking Docker installation...${NC}"

if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker is already installed${NC}"
    docker --version
else
    echo -e "${YELLOW}📦 Docker not found. Installing Docker Desktop...${NC}"
    
    # Check if Homebrew is installed
    if command -v brew &> /dev/null; then
        echo -e "${CYAN}Installing Docker Desktop via Homebrew...${NC}"
        brew install --cask docker
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Docker Desktop installed successfully${NC}"
            echo -e "${YELLOW}Starting Docker Desktop...${NC}"
            open -a Docker
            
            echo -e "${YELLOW}Waiting for Docker to start (this may take a minute)...${NC}"
            while ! docker info &> /dev/null; do
                sleep 5
                echo -n "."
            done
            echo ""
            echo -e "${GREEN}✅ Docker is running${NC}"
        else
            echo -e "${RED}❌ Failed to install Docker Desktop${NC}"
            echo -e "${YELLOW}Please install Docker Desktop manually from: https://docker.com${NC}"
            exit 1
        fi
    else
        echo -e "${CYAN}Homebrew not found. Downloading Docker Desktop directly...${NC}"
        echo -e "${YELLOW}Opening Docker Desktop download page...${NC}"
        open "https://desktop.docker.com/mac/stable/Docker.dmg"
        
        echo -e "${YELLOW}Please install Docker Desktop manually and run this script again${NC}"
        echo -e "${CYAN}After installation:${NC}"
        echo "1. Open Docker Desktop from Applications"
        echo "2. Wait for Docker to start"
        echo "3. Run this script again"
        exit 0
    fi
fi

# Step 2: Ensure Docker is running
echo ""
echo -e "${YELLOW}Step 2: Verifying Docker is running...${NC}"

if ! docker info &> /dev/null; then
    echo -e "${YELLOW}Starting Docker Desktop...${NC}"
    open -a Docker
    
    timeout=60
    elapsed=0
    
    while ! docker info &> /dev/null && [ $elapsed -lt $timeout ]; do
        sleep 5
        elapsed=$((elapsed + 5))
        echo -n "."
    done
    
    if [ $elapsed -ge $timeout ]; then
        echo ""
        echo -e "${RED}❌ Docker failed to start. Please start Docker Desktop manually.${NC}"
        exit 1
    fi
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

# Step 5: Stop existing container if running
echo ""
echo -e "${YELLOW}Step 5: Checking for existing cache node...${NC}"

if docker ps -a --format '{{.Names}}' | grep -q "^whistle-cache$"; then
    echo -e "${YELLOW}Stopping existing cache node...${NC}"
    docker stop whistle-cache &> /dev/null
    docker rm whistle-cache &> /dev/null
    echo -e "${GREEN}✅ Existing node stopped${NC}"
fi

# Step 6: Run the cache node
echo ""
echo -e "${YELLOW}Step 6: Starting WHISTLE cache node...${NC}"

run_command="docker run -d \
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
    docker ps --filter "name=whistle-cache" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    # Show logs
    echo ""
    echo -e "${YELLOW}Node Logs:${NC}"
    docker logs whistle-cache --tail 20
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              🎉 Setup Complete!                          ║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  Your cache node is now running and earning SOL!         ║${NC}"
    echo -e "${GREEN}║                                                          ║${NC}"
    echo -e "${GREEN}║  Monitor your node:                                      ║${NC}"
    echo -e "${GREEN}║  > Logs: docker logs whistle-cache -f                    ║${NC}"
    echo -e "${GREEN}║  > Stats: curl http://localhost:8545/metrics             ║${NC}"
    echo -e "${GREEN}║  > Stop: docker stop whistle-cache                       ║${NC}"
    echo -e "${GREEN}║                                                          ║${NC}"
    echo -e "${GREEN}║  Dashboard: https://whistle.network/provider             ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    
    # Create alias for easy monitoring
    echo ""
    read -p "Add 'whistle-node' alias to your shell for easy monitoring? (y/n): " add_alias
    
    if [[ "$add_alias" == "y" || "$add_alias" == "Y" ]]; then
        shell_rc=""
        
        if [ -n "$ZSH_VERSION" ]; then
            shell_rc="$HOME/.zshrc"
        elif [ -n "$BASH_VERSION" ]; then
            shell_rc="$HOME/.bashrc"
        fi
        
        if [ -n "$shell_rc" ]; then
            echo "" >> "$shell_rc"
            echo "# WHISTLE Cache Node aliases" >> "$shell_rc"
            echo "alias whistle-logs='docker logs whistle-cache -f'" >> "$shell_rc"
            echo "alias whistle-stats='curl http://localhost:8545/metrics | python -m json.tool'" >> "$shell_rc"
            echo "alias whistle-stop='docker stop whistle-cache'" >> "$shell_rc"
            echo "alias whistle-start='docker start whistle-cache'" >> "$shell_rc"
            echo "alias whistle-restart='docker restart whistle-cache'" >> "$shell_rc"
            
            echo -e "${GREEN}✅ Aliases added to $shell_rc${NC}"
            echo -e "${YELLOW}Run 'source $shell_rc' or restart your terminal to use them${NC}"
            echo ""
            echo "Available commands:"
            echo "  whistle-logs    - View live logs"
            echo "  whistle-stats   - Check node metrics"
            echo "  whistle-stop    - Stop the node"
            echo "  whistle-start   - Start the node"
            echo "  whistle-restart - Restart the node"
        fi
    fi
    
    # Create LaunchAgent for auto-start (optional)
    echo ""
    read -p "Enable auto-start on system boot? (y/n): " auto_start
    
    if [[ "$auto_start" == "y" || "$auto_start" == "Y" ]]; then
        plist_file="$HOME/Library/LaunchAgents/com.whistle.cache-node.plist"
        
        cat > "$plist_file" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.whistle.cache-node</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/docker</string>
        <string>start</string>
        <string>whistle-cache</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardErrorPath</key>
    <string>/tmp/whistle-cache-node.err</string>
    <key>StandardOutPath</key>
    <string>/tmp/whistle-cache-node.out</string>
</dict>
</plist>
EOF
        
        launchctl load "$plist_file"
        echo -e "${GREEN}✅ Auto-start enabled${NC}"
    fi
    
else
    echo -e "${RED}❌ Failed to start cache node${NC}"
    exit 1
fi

echo ""


# WHISTLE Cache Node Setup Script for macOS
# Run this script in Terminal

echo -e "\033[36m╔══════════════════════════════════════════════════════════╗\033[0m"
echo -e "\033[36m║         WHISTLE Cache Node Setup - macOS                 ║\033[0m"
echo -e "\033[36m╚══════════════════════════════════════════════════════════╝\033[0m"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Step 1: Check if Docker is installed
echo -e "${YELLOW}Step 1: Checking Docker installation...${NC}"

if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker is already installed${NC}"
    docker --version
else
    echo -e "${YELLOW}📦 Docker not found. Installing Docker Desktop...${NC}"
    
    # Check if Homebrew is installed
    if command -v brew &> /dev/null; then
        echo -e "${CYAN}Installing Docker Desktop via Homebrew...${NC}"
        brew install --cask docker
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Docker Desktop installed successfully${NC}"
            echo -e "${YELLOW}Starting Docker Desktop...${NC}"
            open -a Docker
            
            echo -e "${YELLOW}Waiting for Docker to start (this may take a minute)...${NC}"
            while ! docker info &> /dev/null; do
                sleep 5
                echo -n "."
            done
            echo ""
            echo -e "${GREEN}✅ Docker is running${NC}"
        else
            echo -e "${RED}❌ Failed to install Docker Desktop${NC}"
            echo -e "${YELLOW}Please install Docker Desktop manually from: https://docker.com${NC}"
            exit 1
        fi
    else
        echo -e "${CYAN}Homebrew not found. Downloading Docker Desktop directly...${NC}"
        echo -e "${YELLOW}Opening Docker Desktop download page...${NC}"
        open "https://desktop.docker.com/mac/stable/Docker.dmg"
        
        echo -e "${YELLOW}Please install Docker Desktop manually and run this script again${NC}"
        echo -e "${CYAN}After installation:${NC}"
        echo "1. Open Docker Desktop from Applications"
        echo "2. Wait for Docker to start"
        echo "3. Run this script again"
        exit 0
    fi
fi

# Step 2: Ensure Docker is running
echo ""
echo -e "${YELLOW}Step 2: Verifying Docker is running...${NC}"

if ! docker info &> /dev/null; then
    echo -e "${YELLOW}Starting Docker Desktop...${NC}"
    open -a Docker
    
    timeout=60
    elapsed=0
    
    while ! docker info &> /dev/null && [ $elapsed -lt $timeout ]; do
        sleep 5
        elapsed=$((elapsed + 5))
        echo -n "."
    done
    
    if [ $elapsed -ge $timeout ]; then
        echo ""
        echo -e "${RED}❌ Docker failed to start. Please start Docker Desktop manually.${NC}"
        exit 1
    fi
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

# Step 5: Stop existing container if running
echo ""
echo -e "${YELLOW}Step 5: Checking for existing cache node...${NC}"

if docker ps -a --format '{{.Names}}' | grep -q "^whistle-cache$"; then
    echo -e "${YELLOW}Stopping existing cache node...${NC}"
    docker stop whistle-cache &> /dev/null
    docker rm whistle-cache &> /dev/null
    echo -e "${GREEN}✅ Existing node stopped${NC}"
fi

# Step 6: Run the cache node
echo ""
echo -e "${YELLOW}Step 6: Starting WHISTLE cache node...${NC}"

run_command="docker run -d \
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
    docker ps --filter "name=whistle-cache" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    # Show logs
    echo ""
    echo -e "${YELLOW}Node Logs:${NC}"
    docker logs whistle-cache --tail 20
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              🎉 Setup Complete!                          ║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  Your cache node is now running and earning SOL!         ║${NC}"
    echo -e "${GREEN}║                                                          ║${NC}"
    echo -e "${GREEN}║  Monitor your node:                                      ║${NC}"
    echo -e "${GREEN}║  > Logs: docker logs whistle-cache -f                    ║${NC}"
    echo -e "${GREEN}║  > Stats: curl http://localhost:8545/metrics             ║${NC}"
    echo -e "${GREEN}║  > Stop: docker stop whistle-cache                       ║${NC}"
    echo -e "${GREEN}║                                                          ║${NC}"
    echo -e "${GREEN}║  Dashboard: https://whistle.network/provider             ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    
    # Create alias for easy monitoring
    echo ""
    read -p "Add 'whistle-node' alias to your shell for easy monitoring? (y/n): " add_alias
    
    if [[ "$add_alias" == "y" || "$add_alias" == "Y" ]]; then
        shell_rc=""
        
        if [ -n "$ZSH_VERSION" ]; then
            shell_rc="$HOME/.zshrc"
        elif [ -n "$BASH_VERSION" ]; then
            shell_rc="$HOME/.bashrc"
        fi
        
        if [ -n "$shell_rc" ]; then
            echo "" >> "$shell_rc"
            echo "# WHISTLE Cache Node aliases" >> "$shell_rc"
            echo "alias whistle-logs='docker logs whistle-cache -f'" >> "$shell_rc"
            echo "alias whistle-stats='curl http://localhost:8545/metrics | python -m json.tool'" >> "$shell_rc"
            echo "alias whistle-stop='docker stop whistle-cache'" >> "$shell_rc"
            echo "alias whistle-start='docker start whistle-cache'" >> "$shell_rc"
            echo "alias whistle-restart='docker restart whistle-cache'" >> "$shell_rc"
            
            echo -e "${GREEN}✅ Aliases added to $shell_rc${NC}"
            echo -e "${YELLOW}Run 'source $shell_rc' or restart your terminal to use them${NC}"
            echo ""
            echo "Available commands:"
            echo "  whistle-logs    - View live logs"
            echo "  whistle-stats   - Check node metrics"
            echo "  whistle-stop    - Stop the node"
            echo "  whistle-start   - Start the node"
            echo "  whistle-restart - Restart the node"
        fi
    fi
    
    # Create LaunchAgent for auto-start (optional)
    echo ""
    read -p "Enable auto-start on system boot? (y/n): " auto_start
    
    if [[ "$auto_start" == "y" || "$auto_start" == "Y" ]]; then
        plist_file="$HOME/Library/LaunchAgents/com.whistle.cache-node.plist"
        
        cat > "$plist_file" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.whistle.cache-node</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/docker</string>
        <string>start</string>
        <string>whistle-cache</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardErrorPath</key>
    <string>/tmp/whistle-cache-node.err</string>
    <key>StandardOutPath</key>
    <string>/tmp/whistle-cache-node.out</string>
</dict>
</plist>
EOF
        
        launchctl load "$plist_file"
        echo -e "${GREEN}✅ Auto-start enabled${NC}"
    fi
    
else
    echo -e "${RED}❌ Failed to start cache node${NC}"
    exit 1
fi

echo ""
