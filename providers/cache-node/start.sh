#!/bin/bash
#
# WHISTLE Cache Node - Quick Start Script
#
# Usage:
#   ./start.sh                    # Start with defaults
#   ./start.sh YOUR_WALLET_ADDR   # Start with your wallet
#

WALLET=${1:-""}

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║              WHISTLE Cache Node - Starting...                      ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo "🐳 Docker detected - using containerized deployment"
    
    if [ -n "$WALLET" ]; then
        PROVIDER_WALLET=$WALLET docker-compose up -d
    else
        docker-compose up -d
    fi
    
    echo ""
    echo "✅ Cache node started!"
    echo ""
    echo "   View logs:    docker logs -f whistle-cache"
    echo "   Stop:         docker-compose down"
    echo "   Health:       curl http://localhost:8545/health"
    echo "   Metrics:      curl http://localhost:8545/metrics"
    echo ""
    
elif command -v node &> /dev/null; then
    echo "📦 Node.js detected - running directly"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    # Set environment and run
    export PORT=8545
    export UPSTREAM_RPC=https://rpc.whistle.ninja/rpc
    export COORDINATOR_URL=https://coordinator.whistle.ninja
    export PROVIDER_WALLET=$WALLET
    
    node src/index.js
    
else
    echo "❌ Neither Docker nor Node.js found!"
    echo ""
    echo "Please install one of:"
    echo "  - Docker: https://docker.com"
    echo "  - Node.js: https://nodejs.org"
    exit 1
fi

