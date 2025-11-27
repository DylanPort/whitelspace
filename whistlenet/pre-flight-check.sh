#!/bin/bash
#
# WHISTLE Pre-Flight Network Check
# Run this BEFORE installation to verify connectivity
#

echo "╔══════════════════════════════════════════════════════════╗"
echo "║       Solana Network Connectivity Check                 ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

echo "Testing Solana mainnet connectivity..."
echo ""

# Test 1: DNS Resolution
echo -n "1. DNS Resolution (entrypoint.mainnet-beta.solana.com)... "
if host entrypoint.mainnet-beta.solana.com > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAIL++))
fi

# Test 2: Ping Solana Entrypoints
echo -n "2. Ping Solana Entrypoint 1... "
if ping -c 2 -W 3 entrypoint.mainnet-beta.solana.com > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
else
    echo -e "${YELLOW}⚠️  WARN (ping may be blocked, not critical)${NC}"
fi

# Test 3: Port 8001 (Gossip)
echo -n "3. Port 8001 reachable (gossip entrypoint)... "
if timeout 5 bash -c "cat < /dev/null > /dev/tcp/entrypoint.mainnet-beta.solana.com/8001" 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL - Port 8001 blocked!${NC}"
    ((FAIL++))
fi

# Test 4: Outbound Firewall Check
echo -n "4. Checking if ports 8000-8020 are open outbound... "
if ss -tulpn | grep -q ":8000.*LISTEN" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Port 8000 already in use${NC}"
else
    echo -e "${GREEN}✅ PASS (available)${NC}"
    ((PASS++))
fi

# Test 5: Check if UFW is blocking
echo -n "5. Firewall configuration... "
if which ufw > /dev/null 2>&1; then
    if ufw status | grep -q "Status: active"; then
        if ufw status | grep -qE "8000:8020.*ALLOW"; then
            echo -e "${GREEN}✅ PASS (ports allowed)${NC}"
            ((PASS++))
        else
            echo -e "${RED}❌ FAIL (UFW active but ports not open)${NC}"
            ((FAIL++))
        fi
    else
        echo -e "${GREEN}✅ PASS (UFW inactive)${NC}"
        ((PASS++))
    fi
else
    echo -e "${GREEN}✅ PASS (no UFW)${NC}"
    ((PASS++))
fi

# Test 6: Check network speed
echo -n "6. Network speed test (downloading 10MB)... "
START=$(date +%s)
if wget -q -O /dev/null http://speedtest.ftp.otenet.gr/files/test10Mb.db 2>/dev/null; then
    END=$(date +%s)
    DURATION=$((END - START))
    if [ $DURATION -lt 5 ]; then
        echo -e "${GREEN}✅ PASS (${DURATION}s - good speed)${NC}"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠️  WARN (${DURATION}s - slow connection)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  WARN (couldn't test)${NC}"
fi

# Test 7: Check available disk space
echo -n "7. Disk space check (need 1.5TB+)... "
AVAIL=$(df / | awk 'NR==2 {print $4}')
AVAIL_GB=$((AVAIL / 1024 / 1024))
if [ $AVAIL_GB -gt 1500 ]; then
    echo -e "${GREEN}✅ PASS (${AVAIL_GB}GB available)${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL (only ${AVAIL_GB}GB available, need 1500GB+)${NC}"
    ((FAIL++))
fi

# Test 8: RAM check
echo -n "8. RAM check (need 64GB+)... "
RAM_GB=$(free -g | awk '/^Mem:/ {print $2}')
if [ $RAM_GB -gt 64 ]; then
    echo -e "${GREEN}✅ PASS (${RAM_GB}GB)${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL (only ${RAM_GB}GB)${NC}"
    ((FAIL++))
fi

# Test 9: Test actual Solana RPC endpoint
echo -n "9. Testing public Solana RPC... "
RESPONSE=$(curl -s -X POST https://api.mainnet-beta.solana.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
  --max-time 5)

if echo "$RESPONSE" | grep -q '"result"'; then
    echo -e "${GREEN}✅ PASS (RPC accessible)${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL (can't reach Solana RPC)${NC}"
    ((FAIL++))
fi

# Test 10: Check if validator ports are free
echo -n "10. Check if validator ports are free... "
PORTS_USED=0
for port in 8899 8900; do
    if ss -tulpn | grep -q ":$port.*LISTEN"; then
        PORTS_USED=1
    fi
done

if [ $PORTS_USED -eq 0 ]; then
    echo -e "${GREEN}✅ PASS (ports available)${NC}"
    ((PASS++))
else
    echo -e "${YELLOW}⚠️  WARN (some ports in use)${NC}"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Your server is READY for Solana installation!${NC}"
    echo ""
    echo "Next step: Run the installation script"
    exit 0
elif [ $FAIL -le 2 ]; then
    echo -e "${YELLOW}⚠️  Some warnings detected, but should be OK to proceed${NC}"
    echo "Review the warnings above before continuing."
    exit 0
else
    echo -e "${RED}❌ Multiple critical issues detected!${NC}"
    echo ""
    echo "Common fixes:"
    echo "1. Open firewall ports:"
    echo "   ufw allow 8000:8020/tcp"
    echo "   ufw allow 8899/tcp"
    echo ""
    echo "2. Check if your ISP blocks P2P traffic"
    echo "3. Verify DNS resolution works"
    echo ""
    echo "Fix these issues before running installation."
    exit 1
fi



