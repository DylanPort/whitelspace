#!/bin/bash
# Ghost VPN - One-Click Setup for Mac/Linux
# Usage: bash ghost-vpn-quick-setup.sh [SERVER_IP]

SERVER_IP="${1:-YOUR_SERVER_IP}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}   Ghost VPN - One-Click Setup${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Detect OS
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    *)          MACHINE="UNKNOWN"
esac

echo -e "${CYAN}[1/5] System detected: $MACHINE${NC}"

# Check if server is reachable
echo ""
echo -e "${CYAN}[2/5] Checking VPN server...${NC}"
if ping -c 1 -W 2 "$SERVER_IP" &> /dev/null; then
    echo -e "${GREEN}✓ VPN server is reachable at $SERVER_IP${NC}"
else
    echo -e "${RED}✗ Cannot reach VPN server at $SERVER_IP${NC}"
    echo -e "${YELLOW}Please check the server IP and your internet connection.${NC}"
    exit 1
fi

# Detect browsers
echo ""
echo -e "${CYAN}[3/5] Detecting browsers...${NC}"

CHROME_PATH=""
FIREFOX_PATH=""
SAFARI_PATH=""

if [ "$MACHINE" == "Mac" ]; then
    [ -d "/Applications/Google Chrome.app" ] && CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" && echo -e "${GREEN}✓ Chrome detected${NC}"
    [ -d "/Applications/Firefox.app" ] && FIREFOX_PATH="/Applications/Firefox.app/Contents/MacOS/firefox" && echo -e "${GREEN}✓ Firefox detected${NC}"
    [ -d "/Applications/Safari.app" ] && SAFARI_PATH="/Applications/Safari.app/Contents/MacOS/Safari" && echo -e "${GREEN}✓ Safari detected${NC}"
elif [ "$MACHINE" == "Linux" ]; then
    command -v google-chrome &> /dev/null && CHROME_PATH="google-chrome" && echo -e "${GREEN}✓ Chrome detected${NC}"
    command -v chromium-browser &> /dev/null && CHROME_PATH="chromium-browser" && echo -e "${GREEN}✓ Chromium detected${NC}"
    command -v firefox &> /dev/null && FIREFOX_PATH="firefox" && echo -e "${GREEN}✓ Firefox detected${NC}"
fi

# Configure proxy
echo ""
echo -e "${CYAN}[4/5] Configuring SOCKS5 proxy...${NC}"
echo -e "Proxy: ${YELLOW}$SERVER_IP:1080${NC}"

if [ "$MACHINE" == "Mac" ]; then
    # macOS - Configure network proxy
    NETWORK_SERVICE=$(networksetup -listallnetworkservices | grep -v "asterisk" | head -n 1)
    if [ -n "$NETWORK_SERVICE" ]; then
        sudo networksetup -setsocksfirewallproxy "$NETWORK_SERVICE" "$SERVER_IP" 1080
        sudo networksetup -setsocksfirewallproxystate "$NETWORK_SERVICE" on
        echo -e "${GREEN}✓ System proxy configured for: $NETWORK_SERVICE${NC}"
    else
        echo -e "${YELLOW}⚠ Could not detect network service${NC}"
    fi
    
elif [ "$MACHINE" == "Linux" ]; then
    # Linux - Try different proxy methods
    
    # GNOME/Ubuntu
    if command -v gsettings &> /dev/null; then
        gsettings set org.gnome.system.proxy mode 'manual' 2>/dev/null
        gsettings set org.gnome.system.proxy.socks host "$SERVER_IP" 2>/dev/null
        gsettings set org.gnome.system.proxy.socks port 1080 2>/dev/null
        echo -e "${GREEN}✓ GNOME proxy configured${NC}"
    fi
    
    # KDE
    if command -v kwriteconfig5 &> /dev/null; then
        kwriteconfig5 --file kioslaverc --group "Proxy Settings" --key "ProxyType" 1
        kwriteconfig5 --file kioslaverc --group "Proxy Settings" --key "socksProxy" "socks://$SERVER_IP:1080"
        echo -e "${GREEN}✓ KDE proxy configured${NC}"
    fi
    
    # Environment variables (works for many apps)
    echo "export ALL_PROXY=socks5://$SERVER_IP:1080" >> ~/.bashrc
    echo "export all_proxy=socks5://$SERVER_IP:1080" >> ~/.bashrc
    export ALL_PROXY="socks5://$SERVER_IP:1080"
    export all_proxy="socks5://$SERVER_IP:1080"
    echo -e "${GREEN}✓ Environment proxy configured${NC}"
fi

# Create disconnect script
echo ""
echo -e "${CYAN}[5/5] Creating disconnect script...${NC}"

cat > ghost-vpn-disconnect.sh << 'DISCONNECT_EOF'
#!/bin/bash
# Ghost VPN - Disconnect

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Disconnecting Ghost VPN...${NC}"

OS="$(uname -s)"
if [ "$OS" == "Darwin" ]; then
    # macOS
    NETWORK_SERVICE=$(networksetup -listallnetworkservices | grep -v "asterisk" | head -n 1)
    sudo networksetup -setsocksfirewallproxystate "$NETWORK_SERVICE" off
    echo -e "${GREEN}✓ macOS proxy disabled${NC}"
elif [ "$OS" == "Linux" ]; then
    # Linux
    gsettings set org.gnome.system.proxy mode 'none' 2>/dev/null
    sed -i '/ALL_PROXY/d' ~/.bashrc 2>/dev/null
    sed -i '/all_proxy/d' ~/.bashrc 2>/dev/null
    unset ALL_PROXY
    unset all_proxy
    echo -e "${GREEN}✓ Linux proxy disabled${NC}"
fi

echo -e "${GREEN}✓ Ghost VPN disconnected${NC}"
DISCONNECT_EOF

chmod +x ghost-vpn-disconnect.sh
echo -e "${GREEN}✓ Disconnect script created: ghost-vpn-disconnect.sh${NC}"

# Summary
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}   ✓ Ghost VPN Setup Complete!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "Your browser is now configured to use:"
echo -e "  ${YELLOW}SOCKS5 Proxy: $SERVER_IP:1080${NC}"
echo ""
echo -e "Testing connection..."
if ping -c 1 -W 2 "$SERVER_IP" &> /dev/null; then
    echo -e "${GREEN}✓ VPN connection active!${NC}"
else
    echo -e "${YELLOW}⚠ Warning: VPN server not responding${NC}"
fi

echo ""
echo -e "What's next:"
echo "  1. Open your browser (Chrome/Firefox/Safari)"
echo "  2. Visit https://whatismyip.com to verify"
echo "  3. Your IP should show: $SERVER_IP"
echo ""
echo -e "To disconnect:"
echo -e "  Run: ${YELLOW}bash ghost-vpn-disconnect.sh${NC}"
echo ""

# Offer to open browser
read -p "Open browser now to test? (y/n): " OPEN_BROWSER
if [ "$OPEN_BROWSER" == "y" ] || [ "$OPEN_BROWSER" == "Y" ]; then
    if [ -n "$CHROME_PATH" ]; then
        "$CHROME_PATH" "https://whatismyip.com" &>/dev/null &
        echo -e "${GREEN}✓ Chrome opened${NC}"
    elif [ -n "$FIREFOX_PATH" ]; then
        "$FIREFOX_PATH" "https://whatismyip.com" &>/dev/null &
        echo -e "${GREEN}✓ Firefox opened${NC}"
    elif [ -n "$SAFARI_PATH" ]; then
        open -a Safari "https://whatismyip.com" &>/dev/null
        echo -e "${GREEN}✓ Safari opened${NC}"
    fi
fi

echo ""


