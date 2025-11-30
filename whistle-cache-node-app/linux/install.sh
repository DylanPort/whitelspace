#!/bin/bash
#
# WHISTLE Cache Node - Linux Installation Script
# ═══════════════════════════════════════════════════════════════════
# This script installs the WHISTLE Cache Node on Linux systems
#
# Supported:
#   - Ubuntu 20.04+ / Debian 10+
#   - CentOS 8+ / RHEL 8+
#   - Fedora 34+
#   - Arch Linux
#
# Features:
#   - Installs Docker if not present
#   - Installs the WHISTLE Cache Node app (AppImage/deb/rpm)
#   - Optionally sets up systemd service for headless operation
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/DylanPort/whitelspace/main/whistle-cache-node-app/linux/install.sh | bash
#   or
#   ./install.sh
#
# ═══════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# Configuration
VERSION="1.0.0"
REPO_URL="https://github.com/DylanPort/whitelspace"
RELEASES_URL="$REPO_URL/releases/latest/download"
INSTALL_DIR="/opt/whistle-cache-node"
BIN_DIR="/usr/local/bin"
CONFIG_DIR="$HOME/.whistle-cache-node"
SERVICE_NAME="whistle-cache-node"

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
    echo "║                   ${YELLOW}LINUX INSTALLATION SCRIPT${CYAN}                          ║"
    echo "║                                                                       ║"
    echo "╚═══════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Print functions
print_step() { echo -e "${GREEN}▶${NC} $1"; }
print_info() { echo -e "${CYAN}ℹ${NC} $1"; }
print_success() { echo -e "${GREEN}✅${NC} $1"; }
print_error() { echo -e "${RED}❌${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }

# Detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    elif [ -f /etc/redhat-release ]; then
        OS="rhel"
    else
        OS=$(uname -s)
    fi
    
    ARCH=$(uname -m)
    if [ "$ARCH" = "x86_64" ]; then
        ARCH="x64"
    elif [ "$ARCH" = "aarch64" ]; then
        ARCH="arm64"
    fi
    
    print_info "Detected: $OS $OS_VERSION ($ARCH)"
}

# Check if running as root for system-wide install
check_privileges() {
    if [ "$EUID" -ne 0 ] && [ "$1" = "system" ]; then
        print_error "System-wide installation requires root privileges"
        echo "Please run: sudo $0 system"
        exit 1
    fi
}

# Install Docker
install_docker() {
    if command -v docker &> /dev/null; then
        print_success "Docker is already installed"
        return 0
    fi
    
    print_step "Installing Docker..."
    
    case $OS in
        ubuntu|debian|pop)
            sudo apt-get update
            sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
            curl -fsSL https://download.docker.com/linux/$OS/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/$OS $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            ;;
        centos|rhel|rocky|almalinux)
            sudo yum install -y yum-utils
            sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            ;;
        fedora)
            sudo dnf -y install dnf-plugins-core
            sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
            sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            ;;
        arch|manjaro)
            sudo pacman -S --noconfirm docker docker-compose
            ;;
        *)
            print_error "Unsupported OS: $OS"
            echo "Please install Docker manually: https://docs.docker.com/engine/install/"
            exit 1
            ;;
    esac
    
    # Start and enable Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # Add user to docker group
    if [ "$EUID" -ne 0 ]; then
        sudo usermod -aG docker "$USER"
        print_warning "Added $USER to docker group. Log out and back in for this to take effect."
    fi
    
    print_success "Docker installed successfully"
}

# Install GUI application
install_gui_app() {
    print_step "Installing WHISTLE Cache Node GUI..."
    
    case $OS in
        ubuntu|debian|pop)
            # Try deb package first
            DEB_FILE="/tmp/whistle-cache-node.deb"
            if curl -fsSL -o "$DEB_FILE" "$RELEASES_URL/WHISTLE-Cache-Node-${VERSION}-linux-x64.deb" 2>/dev/null; then
                sudo dpkg -i "$DEB_FILE" || sudo apt-get install -f -y
                rm -f "$DEB_FILE"
                print_success "Installed .deb package"
                return 0
            fi
            ;;
        centos|rhel|rocky|almalinux|fedora)
            # Try rpm package
            RPM_FILE="/tmp/whistle-cache-node.rpm"
            if curl -fsSL -o "$RPM_FILE" "$RELEASES_URL/WHISTLE-Cache-Node-${VERSION}-linux-x64.rpm" 2>/dev/null; then
                sudo rpm -i "$RPM_FILE" || sudo yum localinstall -y "$RPM_FILE"
                rm -f "$RPM_FILE"
                print_success "Installed .rpm package"
                return 0
            fi
            ;;
    esac
    
    # Fallback to AppImage
    print_info "Installing AppImage..."
    
    APPIMAGE_FILE="$CONFIG_DIR/WHISTLE-Cache-Node.AppImage"
    mkdir -p "$CONFIG_DIR"
    
    if curl -fsSL -o "$APPIMAGE_FILE" "$RELEASES_URL/WHISTLE-Cache-Node-${VERSION}-linux-x64.AppImage" 2>/dev/null; then
        chmod +x "$APPIMAGE_FILE"
        
        # Create symlink in bin
        sudo ln -sf "$APPIMAGE_FILE" "$BIN_DIR/whistle-cache-node"
        
        # Create desktop entry
        mkdir -p "$HOME/.local/share/applications"
        cat > "$HOME/.local/share/applications/whistle-cache-node.desktop" << EOF
[Desktop Entry]
Name=WHISTLE Cache Node
Comment=Earn SOL by running a WHISTLE cache node
Exec=$APPIMAGE_FILE
Icon=whistle-cache-node
Terminal=false
Type=Application
Categories=Network;P2P;Finance;
Keywords=whistle;solana;crypto;node;cache;rpc;earn
StartupNotify=true
EOF
        
        print_success "Installed AppImage"
    else
        print_warning "Could not download GUI app. You can still use Docker directly."
    fi
}

# Install systemd service for headless operation
install_service() {
    print_step "Installing systemd service..."
    
    if [ "$EUID" -ne 0 ]; then
        print_warning "Systemd service installation requires root. Skipping..."
        return 0
    fi
    
    # Prompt for wallet
    echo ""
    read -p "Enter your Solana wallet address: " WALLET_ADDRESS
    
    if [ -z "$WALLET_ADDRESS" ]; then
        print_error "Wallet address is required for systemd service"
        return 1
    fi
    
    # Create service file
    cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=WHISTLE Cache Node - Earn SOL by serving RPC requests
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=simple
Environment="WALLET_ADDRESS=$WALLET_ADDRESS"
Environment="NODE_PORT=8546"
Environment="CONTAINER_NAME=whistle-cache"
Environment="IMAGE_NAME=whistlenet/cache-node:latest"

ExecStartPre=-/usr/bin/docker stop \${CONTAINER_NAME}
ExecStartPre=-/usr/bin/docker rm \${CONTAINER_NAME}
ExecStartPre=/usr/bin/docker pull \${IMAGE_NAME}

ExecStart=/usr/bin/docker run \\
    --name \${CONTAINER_NAME} \\
    --rm \\
    -e WALLET_ADDRESS=\${WALLET_ADDRESS} \\
    -p \${NODE_PORT}:8545 \\
    -v whistle-cache-data:/data \\
    \${IMAGE_NAME}

ExecStop=/usr/bin/docker stop -t 30 \${CONTAINER_NAME}

Restart=always
RestartSec=10
TimeoutStartSec=300
TimeoutStopSec=60

StandardOutput=journal
StandardError=journal
SyslogIdentifier=whistle-cache

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload and enable
    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
    
    print_success "Systemd service installed"
    print_info "Start with: sudo systemctl start $SERVICE_NAME"
    print_info "View logs: journalctl -u $SERVICE_NAME -f"
}

# Install Docker-only (for servers without GUI)
install_docker_only() {
    print_step "Setting up Docker-based cache node..."
    
    mkdir -p "$CONFIG_DIR"
    
    # Copy the easy start script
    SCRIPT_URL="https://raw.githubusercontent.com/DylanPort/whitelspace/main/CACHE-NODE-EASY.sh"
    if curl -fsSL -o "$CONFIG_DIR/start-cache-node.sh" "$SCRIPT_URL" 2>/dev/null; then
        chmod +x "$CONFIG_DIR/start-cache-node.sh"
    else
        # Create local version
        cat > "$CONFIG_DIR/start-cache-node.sh" << 'SCRIPT'
#!/bin/bash
WALLET="${WALLET:-}"
CONTAINER_NAME="whistle-cache"
IMAGE="whistlenet/cache-node:latest"
PORT=8546

if [ -z "$WALLET" ]; then
    read -p "Enter wallet address: " WALLET
fi

docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true
docker pull $IMAGE

docker run -d \
    --name $CONTAINER_NAME \
    --restart unless-stopped \
    -e WALLET_ADDRESS="$WALLET" \
    -p $PORT:8545 \
    -v whistle-cache-data:/data \
    $IMAGE

echo "Node started! Metrics: http://localhost:$PORT/metrics"
echo "Logs: docker logs -f $CONTAINER_NAME"
SCRIPT
        chmod +x "$CONFIG_DIR/start-cache-node.sh"
    fi
    
    sudo ln -sf "$CONFIG_DIR/start-cache-node.sh" "$BIN_DIR/whistle-cache-start"
    
    print_success "Docker setup complete"
    print_info "Run: whistle-cache-start"
}

# Main installation
main() {
    print_banner
    
    echo "Installation options:"
    echo "  1) Full install (GUI app + Docker + systemd service)"
    echo "  2) GUI app only (Electron app)"
    echo "  3) Docker only (headless/server)"
    echo "  4) Systemd service only (requires Docker)"
    echo ""
    read -p "Select option [1-4]: " OPTION
    
    detect_os
    
    case $OPTION in
        1)
            install_docker
            install_gui_app
            install_docker_only
            if [ "$EUID" -eq 0 ]; then
                read -p "Install systemd service? [y/N]: " INSTALL_SVC
                if [ "${INSTALL_SVC,,}" = "y" ]; then
                    install_service
                fi
            fi
            ;;
        2)
            install_gui_app
            ;;
        3)
            install_docker
            install_docker_only
            ;;
        4)
            install_docker
            install_service
            ;;
        *)
            print_error "Invalid option"
            exit 1
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}${BOLD}              🎉 INSTALLATION COMPLETE! 🎉${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run the cache node: whistle-cache-start"
    echo "  2. Check your earnings: https://provider.whistle.ninja"
    echo "  3. Join community: https://t.me/whistleninja"
    echo ""
}

main "$@"

