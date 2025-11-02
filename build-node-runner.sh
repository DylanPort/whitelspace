#!/bin/bash

# Ghost Whistle Node Runner - Build Script
# Creates standalone executables for Linux, Windows, and macOS

echo "🚀 Ghost Whistle Node Runner - Build Script"
echo "============================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi

echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

echo ""
echo -e "${BLUE}🔨 Building executables...${NC}"
echo ""

# Create dist directory
mkdir -p dist

# Build menu
echo "Select build option:"
echo "1) Build Linux executable"
echo "2) Build Windows executable"
echo "3) Build macOS executable"
echo "4) Build all platforms"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        echo -e "${YELLOW}Building Linux executable...${NC}"
        npm run build:linux
        echo -e "${GREEN}✅ Linux executable created: ./dist/ghost-node-runner-linux${NC}"
        ;;
    2)
        echo -e "${YELLOW}Building Windows executable...${NC}"
        npm run build:windows
        echo -e "${GREEN}✅ Windows executable created: ./dist/ghost-node-runner-win.exe${NC}"
        ;;
    3)
        echo -e "${YELLOW}Building macOS executable...${NC}"
        npm run build:macos
        echo -e "${GREEN}✅ macOS executable created: ./dist/ghost-node-runner-macos${NC}"
        ;;
    4)
        echo -e "${YELLOW}Building all platforms...${NC}"
        npm run build:node-runner
        echo -e "${GREEN}✅ All executables created in ./dist/ directory${NC}"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo "📂 Executables location: ./dist/"
echo ""
echo "🚀 To run the node:"
echo "   Linux:   ./dist/ghost-node-runner-linux"
echo "   Windows: ./dist/ghost-node-runner-win.exe"
echo "   macOS:   ./dist/ghost-node-runner-macos"
echo ""
echo "📋 File sizes:"
ls -lh dist/ 2>/dev/null
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

