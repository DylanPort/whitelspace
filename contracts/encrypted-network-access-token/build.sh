#!/bin/bash

# ENAT Smart Contract Build Script
# This script builds and optionally deploys the Encrypted Network Access Token contract

set -e

echo "🔧 Building Encrypted Network Access Token Contract..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Cargo not found. Please install Rust: https://rustup.rs/${NC}"
    exit 1
fi

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo -e "${RED}❌ Solana CLI not found. Please install: https://docs.solana.com/cli/install-solana-cli-tools${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies verified${NC}"
echo ""

# Build the program
echo "📦 Building smart contract..."
cargo build-bpf

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful!${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo ""
echo "📍 Binary location:"
ls -lh target/deploy/*.so

echo ""
echo "🎯 Next steps:"
echo ""
echo "  1. Deploy to localnet:"
echo "     solana-test-validator"
echo "     solana program deploy target/deploy/encrypted_network_access_token.so"
echo ""
echo "  2. Deploy to devnet:"
echo "     solana config set --url devnet"
echo "     solana program deploy target/deploy/encrypted_network_access_token.so"
echo ""
echo "  3. Deploy to mainnet:"
echo "     solana config set --url mainnet-beta"
echo "     solana program deploy target/deploy/encrypted_network_access_token.so"
echo ""
echo -e "${YELLOW}⚠️  Remember to update PROGRAM_ID in client/enat-client.js after deployment!${NC}"

