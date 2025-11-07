#!/bin/bash

# Check status of all nodes across all servers

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ "$#" -ne 5 ]; then
    echo "Usage: ./check-all-nodes.sh <SERVER1_IP> <SERVER2_IP> <SERVER3_IP> <SERVER4_IP> <SERVER5_IP>"
    exit 1
fi

echo -e "${YELLOW}Checking all Ghost Whistle nodes...${NC}\n"

for i in 1 2 3 4 5; do
    SERVER=${!i}
    echo -e "${YELLOW}═══ Server $i ($SERVER) ═══${NC}"
    ssh root@$SERVER << 'ENDSSH'
        cd /root/ghost-whistle
        pm2 status
        echo ""
        echo "Node status:"
        pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status)"' 2>/dev/null || echo "PM2 processes listed above"
ENDSSH
    echo ""
done

echo -e "${GREEN}Check complete!${NC}"
echo ""
echo "To view logs for a specific server:"
echo "  ssh root@SERVER_IP 'cd /root/ghost-whistle && pm2 logs --lines 50'"

