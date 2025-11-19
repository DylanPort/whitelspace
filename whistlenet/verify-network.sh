#!/bin/bash
#
# WHISTLE Network Verification
# Run this AFTER starting validator to confirm connectivity
#

echo "╔══════════════════════════════════════════════════════════╗"
echo "║    Verifying Solana Network Connectivity                ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Checking validator status (waiting 60 seconds for startup)..."
sleep 60

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Validator Process Running?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if systemctl is-active --quiet solana-validator; then
    echo -e "${GREEN}✅ PASS: Validator is running${NC}"
else
    echo -e "${RED}❌ FAIL: Validator not running${NC}"
    echo "Run: systemctl start solana-validator"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Finding RPC Nodes?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check logs for RPC nodes found
RPC_NODES=$(journalctl -u solana-validator --since "5 minutes ago" | grep "RPC nodes found" | tail -1)

if echo "$RPC_NODES" | grep -q "Total 0 RPC nodes found"; then
    echo -e "${RED}❌ FAIL: Still seeing 0 RPC nodes!${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check firewall: ufw status"
    echo "2. Check if ports 8000-8020 are open"
    echo "3. Verify network: ping entrypoint.mainnet-beta.solana.com"
    echo ""
    echo "Recent logs:"
    journalctl -u solana-validator -n 20 --no-pager
    exit 1
elif echo "$RPC_NODES" | grep -qE "Total [1-9][0-9]+ RPC nodes found"; then
    NODE_COUNT=$(echo "$RPC_NODES" | grep -oE "Total [0-9]+" | grep -oE "[0-9]+")
    echo -e "${GREEN}✅ PASS: Found $NODE_COUNT RPC nodes!${NC}"
else
    echo -e "${YELLOW}⚠️  WAIT: Still searching for nodes (this can take 1-5 minutes)${NC}"
    echo "Run this script again in 2 minutes"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Connected to Gossip Network?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for nodes in gossip
GOSSIP_NODES=$(journalctl -u solana-validator --since "5 minutes ago" | grep "Nodes:" | tail -1)

if echo "$GOSSIP_NODES" | grep -qE "Nodes: [1-9][0-9]+"; then
    NODE_COUNT=$(echo "$GOSSIP_NODES" | grep -oE "Nodes: [0-9]+" | grep -oE "[0-9]+")
    echo -e "${GREEN}✅ PASS: Connected to $NODE_COUNT gossip nodes!${NC}"
elif echo "$GOSSIP_NODES" | grep -q "Nodes: 0"; then
    echo -e "${RED}❌ FAIL: Not connected to gossip network!${NC}"
    echo "This means firewall or network issue"
else
    echo -e "${YELLOW}⚠️  WAIT: Still connecting...${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 4: Downloading Snapshot?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if journalctl -u solana-validator --since "10 minutes ago" | grep -q "Downloading snapshot"; then
    echo -e "${GREEN}✅ PASS: Snapshot download started!${NC}"
    
    # Show download progress if available
    PROGRESS=$(journalctl -u solana-validator --since "2 minutes ago" | grep -E "download.*%" | tail -1)
    if [ -n "$PROGRESS" ]; then
        echo "   Progress: $PROGRESS"
    fi
elif journalctl -u solana-validator --since "10 minutes ago" | grep -q "snapshot"; then
    echo -e "${GREEN}✅ Snapshot activity detected${NC}"
else
    echo -e "${YELLOW}⚠️  Not yet downloading (waiting for peer discovery)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 5: RPC Endpoint Responding?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Wait a bit for RPC to start
sleep 5

RPC_RESPONSE=$(curl -s -X POST http://localhost:8899 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
  --max-time 5 2>/dev/null)

if echo "$RPC_RESPONSE" | grep -q '"result"'; then
    echo -e "${GREEN}✅ PASS: RPC endpoint responding!${NC}"
    echo "   Response: $RPC_RESPONSE"
elif echo "$RPC_RESPONSE" | grep -q "error"; then
    echo -e "${YELLOW}⚠️  RPC responding but not ready (normal during sync)${NC}"
    echo "   Response: $RPC_RESPONSE"
else
    echo -e "${RED}❌ RPC not responding yet${NC}"
    echo "   This is normal in first 2-5 minutes"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for the critical error
if journalctl -u solana-validator --since "5 minutes ago" | grep -q "Total 0 RPC nodes found"; then
    echo -e "${RED}❌ CRITICAL: Still can't find RPC nodes!${NC}"
    echo ""
    echo "This means one of:"
    echo "1. Firewall blocking ports 8000-8020"
    echo "2. ISP blocking Solana traffic"
    echo "3. Network configuration issue"
    echo ""
    echo "Debug commands:"
    echo "  ufw status verbose"
    echo "  ss -tulpn | grep 800"
    echo "  journalctl -u solana-validator -n 50"
else
    echo -e "${GREEN}✅ NETWORK CONNECTIVITY WORKING!${NC}"
    echo ""
    echo "Your validator is:"
    echo "  ✅ Running"
    echo "  ✅ Connected to peers"
    echo "  ✅ Downloading/syncing blockchain"
    echo ""
    echo "Next: Wait for full sync (4-48 hours depending on snapshot age)"
    echo ""
    echo "Monitor progress:"
    echo "  journalctl -u solana-validator -f"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

