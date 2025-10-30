#!/bin/bash

# Generate fresh keypairs for all 10 bootstrap nodes

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Generating 10 fresh keypairs for bootstrap nodes...${NC}\n"

# Create node-keys directory if it doesn't exist
mkdir -p node-keys

# Check if keypairs already exist
EXISTING=0
for i in {1..10}; do
    if [ -f "node-keys/bootstrap-node-$i-keypair.json" ]; then
        EXISTING=$((EXISTING + 1))
    fi
done

if [ $EXISTING -gt 0 ]; then
    echo -e "${RED}Warning: $EXISTING keypair(s) already exist!${NC}"
    echo -e "${YELLOW}This will OVERWRITE existing keypairs.${NC}"
    echo -e "${YELLOW}Make sure you've backed up any funded wallets!${NC}\n"
    read -p "Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Aborted."
        exit 1
    fi
    echo ""
fi

# Generate keypairs
for i in {1..10}; do
    echo -n "Generating bootstrap-node-$i-keypair.json... "
    solana-keygen new \
        --outfile "node-keys/bootstrap-node-$i-keypair.json" \
        --no-bip39-passphrase \
        --force \
        --silent 2>/dev/null
    echo -e "${GREEN}✓${NC}"
done

# Set secure permissions
chmod 600 node-keys/*.json
chmod 700 node-keys

echo ""
echo -e "${GREEN}✓ All 10 keypairs generated successfully!${NC}\n"

echo -e "${YELLOW}Wallet addresses:${NC}"
for i in {1..10}; do
    ADDR=$(solana-keygen pubkey node-keys/bootstrap-node-$i-keypair.json)
    echo "  Node $i: $ADDR"
done

echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Create encrypted backup:"
echo "   tar -czf node-keys.tar.gz node-keys/"
echo "   gpg --symmetric --cipher-algo AES256 node-keys.tar.gz"
echo ""
echo "2. Deploy to Vultr servers:"
echo "   ./deploy-all-vultr.sh <IPs>"
echo ""
echo "3. Fund each wallet with 0.01-0.05 SOL"
echo ""

