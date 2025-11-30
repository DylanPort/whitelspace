#!/bin/bash
#
# WHISTLE CACHE NODE - EASY START (Linux)
# ═══════════════════════════════════════════════════════════════════
# Run a WHISTLE cache node with Docker and start earning SOL!
#
# Requirements:
#   - Docker installed and running
#   - Your Solana wallet address
#
# Usage:
#   ./CACHE-NODE-EASY.sh                    # Interactive mode
#   ./CACHE-NODE-EASY.sh YOUR_WALLET_HERE   # Direct mode
#   WALLET=YOUR_WALLET ./CACHE-NODE-EASY.sh # Environment variable
#
# ═══════════════════════════════════════════════════════════════════

set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration
CONTAINER_NAME="whistle-cache"
IMAGE_NAME="whistlenet/cache-node:latest"
HOST_PORT=8546  # Use 8546 to avoid conflicts with common ports
CONTAINER_PORT=8545

# Print banner
print_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                       ║"
    echo "║   ██╗    ██╗██╗  ██╗██╗███████╗████████╗██╗     ███████╗              ║"
    echo "║   ██║    ██║██║  ██║██║██╔════╝╚══██╔══╝██║     ██╔════╝              ║"
    echo "║   ██║ █╗ ██║███████║██║███████╗   ██║   ██║     █████╗                ║"
    echo "║   ██║███╗██║██╔══██║██║╚════██║   ██║   ██║     ██╔══╝                ║"
    echo "║   ╚███╔███╔╝██║  ██║██║███████║   ██║   ███████╗███████╗              ║"
    echo "║    ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝╚══════╝   ╚═╝   ╚══════╝╚══════╝              ║"
    echo "║                                                                       ║"
    echo "║              ${YELLOW}CACHE NODE - EASY START (Linux)${CYAN}                         ║"
    echo "║                                                                       ║"
    echo "╚═══════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Print step
print_step() {
    echo -e "${GREEN}▶${NC} $1"
}

# Print info
print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

# Print success
print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

# Print error
print_error() {
    echo -e "${RED}❌${NC} $1"
}

# Print warning
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if Docker is installed and running
check_docker() {
    print_step "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed!"
        echo ""
        echo "Please install Docker first:"
        echo "  Ubuntu/Debian: sudo apt-get install docker.io docker-compose"
        echo "  CentOS/RHEL:   sudo yum install docker docker-compose"
        echo "  Fedora:        sudo dnf install docker docker-compose"
        echo ""
        echo "Then add yourself to the docker group:"
        echo "  sudo usermod -aG docker \$USER"
        echo "  (Log out and back in for this to take effect)"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running!"
        echo ""
        echo "Start Docker with:"
        echo "  sudo systemctl start docker"
        echo "  sudo systemctl enable docker  # Auto-start on boot"
        exit 1
    fi
    
    print_success "Docker is installed and running"
}

# Get wallet address
get_wallet() {
    # Check command line argument first
    if [ -n "$1" ]; then
        WALLET="$1"
        return
    fi
    
    # Check environment variable
    if [ -n "$WALLET" ]; then
        return
    fi
    
    # Check for saved wallet
    WALLET_FILE="$HOME/.whistle-cache-node/wallet-address.txt"
    if [ -f "$WALLET_FILE" ]; then
        SAVED_WALLET=$(cat "$WALLET_FILE")
        echo ""
        print_info "Found saved wallet: ${CYAN}$SAVED_WALLET${NC}"
        read -p "Use this wallet? [Y/n]: " USE_SAVED
        if [ "${USE_SAVED,,}" != "n" ]; then
            WALLET="$SAVED_WALLET"
            return
        fi
    fi
    
    # Interactive prompt
    echo ""
    echo -e "${YELLOW}Enter your Solana wallet address:${NC}"
    echo "(This is where you'll receive your earnings)"
    echo ""
    read -p "Wallet address: " WALLET
    
    if [ -z "$WALLET" ]; then
        print_error "Wallet address is required!"
        exit 1
    fi
    
    # Validate wallet format (basic check - 32-44 base58 characters)
    if ! [[ "$WALLET" =~ ^[1-9A-HJ-NP-Za-km-z]{32,44}$ ]]; then
        print_warning "Wallet address looks invalid. Please double-check it."
        read -p "Continue anyway? [y/N]: " CONTINUE
        if [ "${CONTINUE,,}" != "y" ]; then
            exit 1
        fi
    fi
    
    # Save wallet for future use
    mkdir -p "$(dirname "$WALLET_FILE")"
    echo "$WALLET" > "$WALLET_FILE"
    print_success "Wallet saved for future runs"
}

# Stop and remove existing container
cleanup_container() {
    print_step "Cleaning up existing container..."
    
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        docker stop "$CONTAINER_NAME" 2>/dev/null || true
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
        print_info "Removed existing container"
    fi
}

# Pull latest image
pull_image() {
    print_step "Pulling latest WHISTLE cache node image..."
    if docker pull "$IMAGE_NAME"; then
        print_success "Image updated to latest version"
    else
        print_warning "Could not pull latest image, using cached version"
    fi
}

# Start the container
start_container() {
    print_step "Starting WHISTLE cache node..."
    
    docker run -d \
        --name "$CONTAINER_NAME" \
        --restart unless-stopped \
        -e WALLET_ADDRESS="$WALLET" \
        -p "${HOST_PORT}:${CONTAINER_PORT}" \
        -v whistle-cache-data:/data \
        "$IMAGE_NAME"
    
    if [ $? -eq 0 ]; then
        print_success "Container started successfully!"
    else
        print_error "Failed to start container"
        exit 1
    fi
}

# Show status
show_status() {
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}${BOLD}           🎉 SUCCESS! YOUR NODE IS NOW EARNING SOL! 🎉${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${BOLD}Wallet:${NC}     ${CYAN}$WALLET${NC}"
    echo -e "  ${BOLD}Status:${NC}     $(docker ps --filter name=$CONTAINER_NAME --format '{{.Status}}')"
    echo -e "  ${BOLD}Container:${NC}  $CONTAINER_NAME"
    echo ""
    echo -e "  ${BOLD}📊 Metrics:${NC}       ${CYAN}http://localhost:${HOST_PORT}/metrics${NC}"
    echo -e "  ${BOLD}💚 Health:${NC}        ${CYAN}http://localhost:${HOST_PORT}/health${NC}"
    echo ""
    echo -e "  ${BOLD}Useful Commands:${NC}"
    echo -e "    View logs:        ${YELLOW}docker logs -f $CONTAINER_NAME${NC}"
    echo -e "    Check status:     ${YELLOW}docker ps -f name=$CONTAINER_NAME${NC}"
    echo -e "    Stop node:        ${YELLOW}docker stop $CONTAINER_NAME${NC}"
    echo -e "    Restart node:     ${YELLOW}docker restart $CONTAINER_NAME${NC}"
    echo ""
    echo -e "  ${BOLD}💰 Expected Earnings: \$50-500/month${NC}"
    echo -e "  ${BOLD}🌐 Dashboard:${NC} ${CYAN}https://provider.whistle.ninja${NC}"
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════════════════════${NC}"
}

# Show initial logs
show_logs() {
    echo ""
    print_info "Initial container logs:"
    echo "─────────────────────────────────────────"
    docker logs "$CONTAINER_NAME" 2>&1 | tail -15
    echo "─────────────────────────────────────────"
    echo ""
}

# Main execution
main() {
    print_banner
    check_docker
    get_wallet "$1"
    
    echo ""
    print_info "Your wallet: ${CYAN}$WALLET${NC}"
    echo ""
    
    cleanup_container
    pull_image
    start_container
    
    # Wait for container to start
    sleep 2
    
    show_logs
    show_status
}

# Run main function
main "$@"

