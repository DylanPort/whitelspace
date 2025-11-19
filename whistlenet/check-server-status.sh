#!/bin/bash
#
# WHISTLE Server Status Check
# Run this to see what's already installed
#

echo "╔══════════════════════════════════════════════════════════╗"
echo "║       WHISTLE Server Status Check                       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# System Info
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SYSTEM INFORMATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
echo "CPU Cores: $(nproc)"
echo "Total RAM: $(free -h | awk '/^Mem:/ {print $2}')"
echo "Used RAM: $(free -h | awk '/^Mem:/ {print $3}')"
echo "Free RAM: $(free -h | awk '/^Mem:/ {print $4}')"
echo "Total Disk: $(df -h / | awk 'NR==2 {print $2}')"
echo "Used Disk: $(df -h / | awk 'NR==2 {print $3}')"
echo "Free Disk: $(df -h / | awk 'NR==2 {print $4}')"
echo "Server IP: $(curl -s ifconfig.me 2>/dev/null || echo 'Unable to detect')"
echo ""

# Check Solana Installation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚡ SOLANA STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if which solana > /dev/null 2>&1; then
    echo "✅ Solana CLI installed: $(solana --version)"
else
    echo "❌ Solana CLI not installed"
fi

if [ -d /home/solana ]; then
    echo "✅ Solana user exists"
    
    if [ -f /home/solana/validator-keypair.json ]; then
        echo "✅ Validator keypair exists"
        if which solana > /dev/null 2>&1; then
            PUBKEY=$(solana-keygen pubkey /home/solana/validator-keypair.json 2>/dev/null)
            echo "   Identity: $PUBKEY"
        fi
    else
        echo "❌ Validator keypair not found"
    fi
else
    echo "❌ Solana user does not exist"
fi

# Check for Solana service
if systemctl list-units --full -all | grep -q solana-validator; then
    echo "✅ Solana validator service exists"
    systemctl is-active --quiet solana-validator && echo "   Status: 🟢 Running" || echo "   Status: 🔴 Stopped"
else
    echo "❌ Solana validator service not configured"
fi

# Check Solana data directories
echo ""
echo "Solana Data Directories:"
if [ -d /mnt/solana-data ]; then
    echo "✅ /mnt/solana-data exists"
    echo "   Total size: $(du -sh /mnt/solana-data 2>/dev/null | cut -f1 || echo 'Unable to calculate')"
    
    if [ -d /mnt/solana-data/ledger ]; then
        LEDGER_SIZE=$(du -sh /mnt/solana-data/ledger 2>/dev/null | cut -f1)
        echo "   Ledger: $LEDGER_SIZE"
    fi
    
    if [ -d /mnt/solana-data/accounts ]; then
        ACCOUNTS_SIZE=$(du -sh /mnt/solana-data/accounts 2>/dev/null | cut -f1)
        echo "   Accounts: $ACCOUNTS_SIZE"
    fi
    
    if [ -d /mnt/solana-data/snapshots ]; then
        SNAPSHOTS_SIZE=$(du -sh /mnt/solana-data/snapshots 2>/dev/null | cut -f1)
        SNAPSHOT_COUNT=$(ls -1 /mnt/solana-data/snapshots/*.tar* 2>/dev/null | wc -l)
        echo "   Snapshots: $SNAPSHOTS_SIZE ($SNAPSHOT_COUNT files)"
    fi
    
    if [ -f /mnt/solana-data/.snapshot_downloaded ]; then
        echo "✅ Snapshot download marker exists"
    else
        echo "⚠️  No snapshot download marker"
    fi
else
    echo "❌ /mnt/solana-data does not exist"
fi

echo ""

# Check PostgreSQL
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  POSTGRESQL STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if which psql > /dev/null 2>&1; then
    echo "✅ PostgreSQL installed: $(psql --version)"
    
    if systemctl is-active --quiet postgresql; then
        echo "✅ PostgreSQL service running"
        
        # Check for whistle database
        if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw whistle_rpc; then
            echo "✅ whistle_rpc database exists"
            
            # Count tables
            TABLE_COUNT=$(sudo -u postgres psql -d whistle_rpc -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
            echo "   Tables: $TABLE_COUNT"
        else
            echo "❌ whistle_rpc database not found"
        fi
    else
        echo "❌ PostgreSQL service not running"
    fi
else
    echo "❌ PostgreSQL not installed"
fi

echo ""

# Check Nginx
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 NGINX STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if which nginx > /dev/null 2>&1; then
    echo "✅ Nginx installed: $(nginx -v 2>&1 | cut -d'/' -f2)"
    
    if systemctl is-active --quiet nginx; then
        echo "✅ Nginx running"
        
        if [ -f /etc/nginx/sites-enabled/whistle ]; then
            echo "✅ WHISTLE site configured"
        else
            echo "❌ WHISTLE site not configured"
        fi
    else
        echo "❌ Nginx not running"
    fi
else
    echo "❌ Nginx not installed"
fi

echo ""

# Check Custom API
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔥 WHISTLE CUSTOM API STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d /opt/whistle-api ]; then
    echo "✅ API directory exists"
    
    if [ -f /opt/whistle-api/server.js ]; then
        echo "✅ server.js exists"
        SIZE=$(wc -l /opt/whistle-api/server.js | awk '{print $1}')
        echo "   Lines: $SIZE"
    else
        echo "❌ server.js not found"
    fi
    
    if [ -f /opt/whistle-api/package.json ]; then
        echo "✅ package.json exists"
    else
        echo "❌ package.json not found"
    fi
    
    if systemctl list-units --full -all | grep -q whistle-api; then
        echo "✅ API service configured"
        systemctl is-active --quiet whistle-api && echo "   Status: 🟢 Running" || echo "   Status: 🔴 Stopped"
    else
        echo "❌ API service not configured"
    fi
else
    echo "❌ /opt/whistle-api does not exist"
fi

echo ""

# Check open ports
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔌 LISTENING PORTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ss -tulpn | grep LISTEN | grep -E ':(80|443|8080|8899|5432)' | while read line; do
    PORT=$(echo $line | awk '{print $5}' | rev | cut -d':' -f1 | rev)
    PROCESS=$(echo $line | awk -F'users:' '{print $2}' | cut -d',' -f1 | tr -d '()"')
    
    case $PORT in
        80) SERVICE="HTTP" ;;
        443) SERVICE="HTTPS" ;;
        8080) SERVICE="Custom API" ;;
        8899) SERVICE="Solana RPC" ;;
        5432) SERVICE="PostgreSQL" ;;
        *) SERVICE="Unknown" ;;
    esac
    
    echo "✅ Port $PORT ($SERVICE) - $PROCESS"
done

if ! ss -tulpn | grep LISTEN | grep -qE ':(80|443|8080|8899|5432)'; then
    echo "❌ No WHISTLE services detected on expected ports"
fi

echo ""

# Check firewall
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔥 FIREWALL STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if which ufw > /dev/null 2>&1; then
    ufw status | head -10
else
    echo "❌ UFW not installed"
fi

echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

READY_COUNT=0
TOTAL_COMPONENTS=6

[ -x "$(command -v solana)" ] && ((READY_COUNT++)) && echo "✅ Solana CLI"
[ -d /mnt/solana-data ] && ((READY_COUNT++)) && echo "✅ Solana data directory"
[ -x "$(command -v psql)" ] && ((READY_COUNT++)) && echo "✅ PostgreSQL"
[ -x "$(command -v nginx)" ] && ((READY_COUNT++)) && echo "✅ Nginx"
[ -d /opt/whistle-api ] && ((READY_COUNT++)) && echo "✅ Custom API"
[ -x "$(command -v node)" ] && ((READY_COUNT++)) && echo "✅ Node.js"

echo ""
echo "Progress: $READY_COUNT/$TOTAL_COMPONENTS components ready"

PERCENTAGE=$((READY_COUNT * 100 / TOTAL_COMPONENTS))
echo "Completion: $PERCENTAGE%"

echo ""
if [ $READY_COUNT -eq 0 ]; then
    echo "🚀 Recommendation: Run full installation script"
elif [ $READY_COUNT -eq $TOTAL_COMPONENTS ]; then
    echo "🎉 System fully deployed! Ready to test endpoints"
else
    echo "⚠️  Recommendation: Continue or re-run installation"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

