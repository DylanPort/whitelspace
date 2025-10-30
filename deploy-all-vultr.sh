#!/bin/bash

# Ghost Whistle - Deploy All 5 Vultr Servers
# This script deploys all 10 nodes across 5 VPS instances

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║     Ghost Whistle - Full Vultr Deployment            ║"
echo "║     Deploying 10 nodes across 5 VPS servers          ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if server IPs are provided
if [ "$#" -ne 5 ]; then
    echo -e "${YELLOW}Usage: ./deploy-all-vultr.sh <SERVER1_IP> <SERVER2_IP> <SERVER3_IP> <SERVER4_IP> <SERVER5_IP>${NC}"
    echo ""
    echo "Example:"
    echo "  ./deploy-all-vultr.sh 1.2.3.4 5.6.7.8 9.10.11.12 13.14.15.16 17.18.19.20"
    echo ""
    echo -e "${YELLOW}Or edit this script and set the IPs below:${NC}"
    echo ""
    
    # Allow setting IPs in script
    SERVER1=""  # US-East (nodes 1-2, signaling, backend)
    SERVER2=""  # US-West (nodes 3-4)
    SERVER3=""  # EU-West (nodes 5-6)
    SERVER4=""  # Asia (nodes 7-8)
    SERVER5=""  # Other (nodes 9-10)
    
    if [ -z "$SERVER1" ]; then
        echo -e "${RED}Error: Please provide server IPs as arguments or edit the script.${NC}"
        exit 1
    fi
else
    SERVER1=$1
    SERVER2=$2
    SERVER3=$3
    SERVER4=$4
    SERVER5=$5
fi

# Verify keypairs exist
echo -e "${YELLOW}Checking keypairs...${NC}"
for i in {1..10}; do
    if [ ! -f "node-keys/bootstrap-node-$i-keypair.json" ]; then
        echo -e "${RED}Error: node-keys/bootstrap-node-$i-keypair.json not found!${NC}"
        echo -e "${YELLOW}Generate keypairs first:${NC}"
        echo "  cd node-keys"
        echo "  for i in {1..10}; do"
        echo "    solana-keygen new --outfile bootstrap-node-\$i-keypair.json --no-bip39-passphrase"
        echo "  done"
        exit 1
    fi
done
echo -e "${GREEN}✓ All 10 keypairs found${NC}\n"

# Verify SSH access
echo -e "${YELLOW}Verifying SSH access to all servers...${NC}"
for server in $SERVER1 $SERVER2 $SERVER3 $SERVER4 $SERVER5; do
    echo -n "  Checking $server... "
    if ssh -o ConnectTimeout=5 -o BatchMode=yes root@$server "echo ok" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        echo -e "${RED}Cannot connect to $server via SSH${NC}"
        echo -e "${YELLOW}Make sure you've added your SSH key to the server during Vultr setup${NC}"
        exit 1
    fi
done
echo ""

# Deploy to all servers
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Starting deployments...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

echo -e "${GREEN}[1/5] Deploying to Server 1 (US-East)${NC}"
echo -e "      IP: $SERVER1"
echo -e "      Nodes: 1, 2 + Signaling Server + Backend API\n"
./deploy-to-vultr.sh $SERVER1 1 2 localhost
echo ""
sleep 3

echo -e "${GREEN}[2/5] Deploying to Server 2 (US-West)${NC}"
echo -e "      IP: $SERVER2"
echo -e "      Nodes: 3, 4\n"
./deploy-to-vultr.sh $SERVER2 3 4 $SERVER1
echo ""
sleep 3

echo -e "${GREEN}[3/5] Deploying to Server 3 (EU-West)${NC}"
echo -e "      IP: $SERVER3"
echo -e "      Nodes: 5, 6\n"
./deploy-to-vultr.sh $SERVER3 5 6 $SERVER1
echo ""
sleep 3

echo -e "${GREEN}[4/5] Deploying to Server 4 (Asia)${NC}"
echo -e "      IP: $SERVER4"
echo -e "      Nodes: 7, 8\n"
./deploy-to-vultr.sh $SERVER4 7 8 $SERVER1
echo ""
sleep 3

echo -e "${GREEN}[5/5] Deploying to Server 5 (Other)${NC}"
echo -e "      IP: $SERVER5"
echo -e "      Nodes: 9, 10\n"
./deploy-to-vultr.sh $SERVER5 9 10 $SERVER1
echo ""

# Final summary
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║           🎉 ALL DEPLOYMENTS COMPLETE! 🎉            ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}Deployment Summary:${NC}"
echo "─────────────────────────────────────────────────────────"
echo -e "Server 1 (US-East):    ${GREEN}$SERVER1${NC}"
echo "  ├─ Signaling Server (port 8080)"
echo "  ├─ Backend API (port 3001)"
echo "  ├─ Bootstrap Node 1"
echo "  └─ Bootstrap Node 2"
echo ""
echo -e "Server 2 (US-West):    ${GREEN}$SERVER2${NC}"
echo "  ├─ Bootstrap Node 3"
echo "  └─ Bootstrap Node 4"
echo ""
echo -e "Server 3 (EU-West):    ${GREEN}$SERVER3${NC}"
echo "  ├─ Bootstrap Node 5"
echo "  └─ Bootstrap Node 6"
echo ""
echo -e "Server 4 (Asia):       ${GREEN}$SERVER4${NC}"
echo "  ├─ Bootstrap Node 7"
echo "  └─ Bootstrap Node 8"
echo ""
echo -e "Server 5 (Other):      ${GREEN}$SERVER5${NC}"
echo "  ├─ Bootstrap Node 9"
echo "  └─ Bootstrap Node 10"
echo "─────────────────────────────────────────────────────────"

echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Check all nodes are running:"
echo -e "   ${BLUE}./check-all-nodes.sh $SERVER1 $SERVER2 $SERVER3 $SERVER4 $SERVER5${NC}"
echo ""
echo "2. Update your frontend (index.html) with Server 1 IP:"
echo -e "   ${BLUE}const SIGNALING_SERVER = 'ws://$SERVER1:8080';${NC}"
echo ""
echo "3. Fund node wallets (0.01-0.05 SOL each):"
echo -e "   ${BLUE}./get-node-addresses.sh $SERVER1 $SERVER2 $SERVER3 $SERVER4 $SERVER5${NC}"
echo ""
echo "4. View logs on any server:"
echo -e "   ${BLUE}ssh root@$SERVER1 'cd /root/ghost-whistle && pm2 logs --lines 50'${NC}"
echo ""

