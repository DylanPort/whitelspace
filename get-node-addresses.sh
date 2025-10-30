#!/bin/bash

# Get wallet addresses for all nodes across all servers

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ "$#" -ne 5 ]; then
    echo "Usage: ./get-node-addresses.sh <SERVER1_IP> <SERVER2_IP> <SERVER3_IP> <SERVER4_IP> <SERVER5_IP>"
    exit 1
fi

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║          Ghost Whistle Node Wallet Addresses         ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

echo -e "${YELLOW}Retrieving wallet addresses from all nodes...${NC}\n"

SERVERS=("$1" "$2" "$3" "$4" "$5")
NODE_PAIRS=("1 2" "3 4" "5 6" "7 8" "9 10")

for i in 0 1 2 3 4; do
    SERVER=${SERVERS[$i]}
    read -r NODE1 NODE2 <<< "${NODE_PAIRS[$i]}"
    
    echo -e "${GREEN}Server $((i+1)) ($SERVER):${NC}"
    
    # Get addresses for both nodes on this server
    ssh root@$SERVER << ENDSSH
        export PATH="/root/.local/share/solana/install/active_release/bin:\$PATH"
        cd /root/ghost-whistle
        
        echo "  Node $NODE1:"
        ADDR1=\$(solana-keygen pubkey node-keys/bootstrap-node-$NODE1-keypair.json)
        echo "    Address: \$ADDR1"
        BAL1=\$(solana balance \$ADDR1 2>/dev/null || echo "0 SOL")
        echo "    Balance: \$BAL1"
        
        echo "  Node $NODE2:"
        ADDR2=\$(solana-keygen pubkey node-keys/bootstrap-node-$NODE2-keypair.json)
        echo "    Address: \$ADDR2"
        BAL2=\$(solana balance \$ADDR2 2>/dev/null || echo "0 SOL")
        echo "    Balance: \$BAL2"
ENDSSH
    echo ""
done

echo -e "${YELLOW}─────────────────────────────────────────────────────────${NC}"
echo -e "${YELLOW}Fund each node with 0.01-0.05 SOL for transaction fees${NC}"
echo -e "${YELLOW}─────────────────────────────────────────────────────────${NC}"

