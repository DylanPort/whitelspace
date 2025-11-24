#!/bin/bash

# WHISTLE Cache Node - Universal Quick Install Script
# This script detects your OS and runs the appropriate installer

echo "🚀 WHISTLE Cache Node Quick Installer"
echo "======================================"
echo ""

# Detect operating system
OS="unknown"
ARCH=$(uname -m)

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="mac"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    OS="windows"
fi

# If still unknown, try another method
if [ "$OS" = "unknown" ]; then
    case "$(uname -s)" in
        Linux*)     OS="linux";;
        Darwin*)    OS="mac";;
        MINGW*|MSYS*|CYGWIN*) OS="windows";;
    esac
fi

echo "Detected OS: $OS"
echo "Architecture: $ARCH"
echo ""

# Download and run the appropriate installer
case "$OS" in
    linux)
        echo "📥 Downloading Linux installer..."
        curl -sSL https://raw.githubusercontent.com/whistle-network/cache-node/main/setup-scripts/install-linux.sh | bash
        ;;
    
    mac)
        echo "📥 Downloading macOS installer..."
        curl -sSL https://raw.githubusercontent.com/whistle-network/cache-node/main/setup-scripts/install-mac.sh | bash
        ;;
    
    windows)
        echo "📥 Downloading Windows installer..."
        echo ""
        echo "For Windows, please run this command in PowerShell as Administrator:"
        echo ""
        echo "iwr -useb https://raw.githubusercontent.com/whistle-network/cache-node/main/setup-scripts/install-windows.ps1 | iex"
        echo ""
        echo "Or download and run: https://whistle.network/install-windows.ps1"
        ;;
    
    *)
        echo "❌ Unable to detect operating system"
        echo ""
        echo "Please manually download the appropriate installer:"
        echo ""
        echo "Linux:"
        echo "  curl -sSL https://whistle.network/install-linux.sh | bash"
        echo ""
        echo "macOS:"
        echo "  curl -sSL https://whistle.network/install-mac.sh | bash"
        echo ""
        echo "Windows (PowerShell as Admin):"
        echo "  iwr -useb https://whistle.network/install-windows.ps1 | iex"
        exit 1
        ;;
esac


# WHISTLE Cache Node - Universal Quick Install Script
# This script detects your OS and runs the appropriate installer

echo "🚀 WHISTLE Cache Node Quick Installer"
echo "======================================"
echo ""

# Detect operating system
OS="unknown"
ARCH=$(uname -m)

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="mac"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    OS="windows"
fi

# If still unknown, try another method
if [ "$OS" = "unknown" ]; then
    case "$(uname -s)" in
        Linux*)     OS="linux";;
        Darwin*)    OS="mac";;
        MINGW*|MSYS*|CYGWIN*) OS="windows";;
    esac
fi

echo "Detected OS: $OS"
echo "Architecture: $ARCH"
echo ""

# Download and run the appropriate installer
case "$OS" in
    linux)
        echo "📥 Downloading Linux installer..."
        curl -sSL https://raw.githubusercontent.com/whistle-network/cache-node/main/setup-scripts/install-linux.sh | bash
        ;;
    
    mac)
        echo "📥 Downloading macOS installer..."
        curl -sSL https://raw.githubusercontent.com/whistle-network/cache-node/main/setup-scripts/install-mac.sh | bash
        ;;
    
    windows)
        echo "📥 Downloading Windows installer..."
        echo ""
        echo "For Windows, please run this command in PowerShell as Administrator:"
        echo ""
        echo "iwr -useb https://raw.githubusercontent.com/whistle-network/cache-node/main/setup-scripts/install-windows.ps1 | iex"
        echo ""
        echo "Or download and run: https://whistle.network/install-windows.ps1"
        ;;
    
    *)
        echo "❌ Unable to detect operating system"
        echo ""
        echo "Please manually download the appropriate installer:"
        echo ""
        echo "Linux:"
        echo "  curl -sSL https://whistle.network/install-linux.sh | bash"
        echo ""
        echo "macOS:"
        echo "  curl -sSL https://whistle.network/install-mac.sh | bash"
        echo ""
        echo "Windows (PowerShell as Admin):"
        echo "  iwr -useb https://whistle.network/install-windows.ps1 | iex"
        exit 1
        ;;
esac
