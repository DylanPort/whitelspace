#!/bin/bash

# ENAT Deployment Script
# Deploys the contract and initializes the pool

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 ENAT Contract Deployment${NC}"
echo ""

# Ask for network
echo "Select deployment network:"
echo "  1) Localnet (localhost:8899)"
echo "  2) Devnet"
echo "  3) Mainnet-beta"
echo ""
read -p "Enter choice (1-3): " network_choice

case $network_choice in
    1)
        NETWORK_URL="http://localhost:8899"
        NETWORK_NAME="localnet"
        ;;
    2)
        NETWORK_URL="https://api.devnet.solana.com"
        NETWORK_NAME="devnet"
        ;;
    3)
        NETWORK_URL="https://api.mainnet-beta.solana.com"
        NETWORK_NAME="mainnet-beta"
        echo -e "${RED}⚠️  WARNING: Deploying to MAINNET!${NC}"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            echo "Deployment cancelled."
            exit 0
        fi
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${YELLOW}Deploying to: ${NETWORK_NAME}${NC}"

# Set Solana config
solana config set --url $NETWORK_URL

echo ""
echo "📋 Current configuration:"
solana config get

echo ""
echo "💰 Wallet balance:"
solana balance

# Check if we have enough SOL
balance=$(solana balance | awk '{print $1}')
if (( $(echo "$balance < 1" | bc -l) )); then
    echo -e "${RED}❌ Insufficient balance. Need at least 1 SOL for deployment.${NC}"
    
    if [ "$NETWORK_NAME" == "devnet" ] || [ "$NETWORK_NAME" == "localnet" ]; then
        echo ""
        read -p "Request airdrop? (yes/no): " airdrop
        if [ "$airdrop" == "yes" ]; then
            solana airdrop 2
            sleep 2
        fi
    fi
fi

echo ""
echo "🔨 Building contract..."
./build.sh

echo ""
echo "📤 Deploying contract..."
PROGRAM_ID=$(solana program deploy target/deploy/encrypted_network_access_token.so --output json | jq -r '.programId')

if [ -z "$PROGRAM_ID" ] || [ "$PROGRAM_ID" == "null" ]; then
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Contract deployed!${NC}"
echo ""
echo "📝 Program ID: ${PROGRAM_ID}"
echo ""

# Save program ID
echo "$PROGRAM_ID" > .program_id
echo "Program ID saved to .program_id"

# Update client code
echo ""
echo "🔧 Updating client code with new program ID..."

if [ -f "client/enat-client.js" ]; then
    # Backup original
    cp client/enat-client.js client/enat-client.js.backup
    
    # Update program ID in client
    sed -i.bak "s/const PROGRAM_ID = new PublicKey('[^']*');/const PROGRAM_ID = new PublicKey('$PROGRAM_ID');/" client/enat-client.js
    
    echo -e "${GREEN}✅ Client code updated${NC}"
else
    echo -e "${YELLOW}⚠️  Client file not found. Please update PROGRAM_ID manually.${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Initialize the staking pool (see examples/usage-example.js)"
echo "  2. Test the contract"
echo "  3. Integrate with your application"
echo ""
echo "Program ID: ${PROGRAM_ID}"
echo "Network: ${NETWORK_NAME}"
echo ""
echo "To verify deployment:"
echo "  solana program show ${PROGRAM_ID}"

