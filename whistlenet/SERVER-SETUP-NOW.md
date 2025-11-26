# SOLANA VALIDATOR SETUP - STEP BY STEP COMMANDS

## You're currently here: root@164548:~#

### Step 1: Create the setup script on the server

```bash
# Create the setup script
cat > /root/solana-validator-setup.sh << 'SCRIPTEOF'
#!/bin/bash
##############################################################################
# SOLANA MAINNET VALIDATOR SETUP - WHISTLENET INFRASTRUCTURE
# Based on: https://github.com/solanahcl/solanahcl
# Hardware: AMD EPYC 9354 | 768GB RAM | 2×3.84TB NVMe | 10Gbps
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
cat << "EOF"
╦ ╦╦ ╦╦╔═╗╔╦╗╦  ╔═╗  ╦  ╦╔═╗╦  ╦╔╦╗╔═╗╔╦╗╔═╗╦═╗
║║║╠═╣║╚═╗ ║ ║  ║╣   ╚╗╔╝╠═╣║  ║ ║║╠═╣ ║ ║ ║╠╦╝
╚╩╝╩ ╩╩╚═╝ ╩ ╩═╝╚═╝   ╚╝ ╩ ╩╩═╝╩═╩╝╩ ╩ ╩ ╚═╝╩╚═
Solana Mainnet Validator Setup
EOF
echo -e "${NC}"

##############################################################################
# STEP 1: SYSTEM CHECKS
##############################################################################

echo -e "\n${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}STEP 1: Pre-Flight System Checks${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}\n"

# Check if root
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}❌ Please run as root: sudo su${NC}"
   exit 1
fi

echo -e "${YELLOW}✓ Running as root${NC}"

# Check Ubuntu version
echo -e "\n${BLUE}Checking OS...${NC}"
lsb_release -a

# Check CPU
echo -e "\n${BLUE}Checking CPU...${NC}"
CPU_MODEL=$(lscpu | grep "Model name" | cut -d: -f2 | xargs)
CPU_CORES=$(nproc)
CPU_FREQ=$(lscpu | grep "CPU MHz" | head -1 | awk '{print $3}')
echo -e "CPU: ${GREEN}$CPU_MODEL${NC}"
echo -e "Cores: ${GREEN}$CPU_CORES${NC}"
echo -e "Frequency: ${GREEN}$CPU_FREQ MHz${NC}"

# Check AVX2/AVX-512 support
if grep -q avx2 /proc/cpuinfo; then
    echo -e "${GREEN}✓ AVX2 support detected${NC}"
else
    echo -e "${RED}❌ AVX2 NOT detected - REQUIRED!${NC}"
    exit 1
fi

if grep -q avx512 /proc/cpuinfo; then
    echo -e "${GREEN}✓ AVX-512 support detected (EXCELLENT!)${NC}"
fi

# Check RAM
echo -e "\n${BLUE}Checking RAM...${NC}"
TOTAL_RAM=$(free -h | awk '/^Mem:/ {print $2}')
echo -e "Total RAM: ${GREEN}$TOTAL_RAM${NC}"

# Check NVMe drives
echo -e "\n${BLUE}Checking NVMe drives...${NC}"
lsblk -d -o NAME,SIZE,MODEL,ROTA | grep nvme || true
NVME_COUNT=$(lsblk -d -o NAME,ROTA 2>/dev/null | grep "nvme" | grep "0" | wc -l)
echo -e "NVMe drives found: ${GREEN}$NVME_COUNT${NC}"

if [ "$NVME_COUNT" -lt 2 ]; then
    echo -e "${YELLOW}⚠️  Warning: Less than 2 NVMe drives detected${NC}"
    echo -e "${YELLOW}   You may need to use partitions or a single drive${NC}"
fi

# Check network
echo -e "\n${BLUE}Checking network...${NC}"
ip addr show | grep "inet " | head -3

echo -e "\n${YELLOW}════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Hardware check complete!${NC}"
echo -e "${YELLOW}════════════════════════════════════════════${NC}"
read -p "Press Enter to continue with setup (or Ctrl+C to abort)..."

##############################################################################
# STEP 2: SYSTEM OPTIMIZATION (CORE - from HCL)
##############################################################################

echo -e "\n${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}STEP 2: System Optimization (CORE)${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}\n"

# Update system first
echo -e "${BLUE}Updating system packages...${NC}"
apt update

# C: Check CPU performance (Enable performance mode)
echo -e "\n${BLUE}Enabling CPU performance mode...${NC}"
apt install -y cpufrequtils

# Set performance governor
echo 'performance' | tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor > /dev/null
echo 'GOVERNOR="performance"' > /etc/default/cpufrequtils

# Make it persistent
cat > /etc/systemd/system/cpu-performance.service << 'CPUEOF'
[Unit]
Description=Set CPU Governor to Performance
After=network.target

[Service]
Type=oneshot
ExecStart=/bin/bash -c "echo performance | tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor"
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
CPUEOF

systemctl daemon-reload
systemctl enable cpu-performance.service
systemctl start cpu-performance.service

echo -e "${GREEN}✓ CPU performance mode enabled${NC}"

# System limits
echo -e "\n${BLUE}Configuring system limits...${NC}"
cat >> /etc/sysctl.conf << 'SYSCTLEOF'

# Solana Validator Optimizations
net.core.rmem_default=134217728
net.core.rmem_max=134217728
net.core.wmem_default=134217728
net.core.wmem_max=134217728
vm.max_map_count=1000000
fs.nr_open=1000000
SYSCTLEOF

sysctl -p

cat >> /etc/security/limits.conf << 'LIMITSEOF'
* soft nofile 1000000
* hard nofile 1000000
* soft nproc 1000000
* hard nproc 1000000
LIMITSEOF

echo -e "${GREEN}✓ System limits configured${NC}"

# Disable swap (as per HCL recommendation)
echo -e "\n${BLUE}Disabling swap (HCL recommendation)...${NC}"
swapoff -a || true
sed -i '/swap/d' /etc/fstab
echo -e "${GREEN}✓ Swap disabled${NC}"

##############################################################################
# STEP 3: DISK SETUP (O: Optimize NVMe)
##############################################################################

echo -e "\n${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}STEP 3: NVMe Storage Optimization${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}Available block devices:${NC}"
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT

# Create mount points
mkdir -p /mnt/solana-accounts
mkdir -p /mnt/solana-ledger

echo -e "\n${BLUE}We'll set up storage for:${NC}"
echo -e "  • /mnt/solana-accounts → Accounts database"
echo -e "  • /mnt/solana-ledger   → Ledger storage"
echo ""

# Auto-detect NVMe drives
NVME_DRIVES=($(lsblk -d -o NAME,ROTA | grep "nvme" | grep "0" | awk '{print "/dev/"$1}'))
DRIVE_COUNT=${#NVME_DRIVES[@]}

if [ "$DRIVE_COUNT" -ge 2 ]; then
    ACCOUNTS_DRIVE="${NVME_DRIVES[0]}"
    LEDGER_DRIVE="${NVME_DRIVES[1]}"
    
    echo -e "${BLUE}Detected drives:${NC}"
    echo -e "  Accounts: $ACCOUNTS_DRIVE"
    echo -e "  Ledger: $LEDGER_DRIVE"
    
    echo -e "\n${RED}⚠️  WARNING: About to format these drives!${NC}"
    echo -e "${RED}    ALL DATA WILL BE ERASED!${NC}"
    read -p "Type 'YES' to continue: " confirm
    if [ "$confirm" != "YES" ]; then
        echo "Aborted."
        exit 1
    fi
    
    echo -e "\n${BLUE}Formatting $ACCOUNTS_DRIVE for accounts...${NC}"
    mkfs.ext4 -F "$ACCOUNTS_DRIVE"
    
    echo -e "${BLUE}Formatting $LEDGER_DRIVE for ledger...${NC}"
    mkfs.ext4 -F "$LEDGER_DRIVE"
    
    # Get UUIDs
    UUID_ACCOUNTS=$(blkid -s UUID -o value "$ACCOUNTS_DRIVE")
    UUID_LEDGER=$(blkid -s UUID -o value "$LEDGER_DRIVE")
    
    # Add to fstab
    echo "UUID=$UUID_ACCOUNTS /mnt/solana-accounts ext4 defaults,noatime 0 2" >> /etc/fstab
    echo "UUID=$UUID_LEDGER /mnt/solana-ledger ext4 defaults,noatime 0 2" >> /etc/fstab
    
    # Mount
    mount -a
    
    # Verify
    echo -e "\n${GREEN}✓ Drives mounted:${NC}"
    df -h | grep solana
else
    echo -e "${YELLOW}Using single drive setup (partitions)${NC}"
    # Create large directories on root for now
    echo -e "${BLUE}Creating storage directories...${NC}"
fi

##############################################################################
# STEP 4: INSTALL SOLANA
##############################################################################

echo -e "\n${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}STEP 4: Install Solana CLI${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}\n"

# Create solana user
echo -e "${BLUE}Creating solana user...${NC}"
id -u solana &>/dev/null || useradd -m -s /bin/bash solana
echo -e "${GREEN}✓ User 'solana' created${NC}"

# Install as solana user
echo -e "\n${BLUE}Installing Solana CLI (this may take a few minutes)...${NC}"
su - solana << 'SOLANAEOF'
# Install Solana
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Add to PATH
echo 'export PATH="/home/solana/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

echo ""
echo "Solana version:"
~/.local/share/solana/install/active_release/bin/solana --version
SOLANAEOF

# Set PATH for root too
export PATH="/home/solana/.local/share/solana/install/active_release/bin:$PATH"

echo -e "${GREEN}✓ Solana installed${NC}"

##############################################################################
# STEP 5: CREATE VALIDATOR KEYS
##############################################################################

echo -e "\n${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}STEP 5: Generate Validator Keys${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}\n"

su - solana << 'KEYSEOF'
cd ~
mkdir -p ~/validator-keypairs

# Generate keys
echo "Generating validator identity..."
~/.local/share/solana/install/active_release/bin/solana-keygen new --no-bip39-passphrase -o ~/validator-keypairs/validator-keypair.json

echo "Generating vote account..."
~/.local/share/solana/install/active_release/bin/solana-keygen new --no-bip39-passphrase -o ~/validator-keypairs/vote-account-keypair.json

echo "Generating authorized withdrawer..."
~/.local/share/solana/install/active_release/bin/solana-keygen new --no-bip39-passphrase -o ~/validator-keypairs/authorized-withdrawer-keypair.json

# Set permissions
chmod 600 ~/validator-keypairs/*.json

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 VALIDATOR KEYS GENERATED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Validator Identity:"
~/.local/share/solana/install/active_release/bin/solana-keygen pubkey ~/validator-keypairs/validator-keypair.json

echo ""
echo "Vote Account:"
~/.local/share/solana/install/active_release/bin/solana-keygen pubkey ~/validator-keypairs/vote-account-keypair.json

echo ""
echo "Authorized Withdrawer:"
~/.local/share/solana/install/active_release/bin/solana-keygen pubkey ~/validator-keypairs/authorized-withdrawer-keypair.json
echo ""

KEYSEOF

VALIDATOR_PUBKEY=$(su - solana -c "~/.local/share/solana/install/active_release/bin/solana-keygen pubkey ~/validator-keypairs/validator-keypair.json")

echo -e "\n${RED}⚠️  BACKUP THESE KEYS IMMEDIATELY!${NC}"
echo -e "${YELLOW}Keys location: /home/solana/validator-keypairs/${NC}"
echo -e "\n${YELLOW}From your local machine, run:${NC}"
echo -e "${BLUE}scp -r root@212.108.83.86:/home/solana/validator-keypairs ~/whistle-validator-backup/${NC}"
echo ""
read -p "Press Enter after backing up keys..."

##############################################################################
# STEP 6: CREATE VALIDATOR START SCRIPT
##############################################################################

echo -e "\n${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}STEP 6: Create Validator Start Script${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}\n"

cat > /home/solana/start-validator.sh << 'STARTEOF'
#!/bin/bash

exec solana-validator \
  --identity ~/validator-keypairs/validator-keypair.json \
  --vote-account ~/validator-keypairs/vote-account-keypair.json \
  --known-validator 7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2 \
  --known-validator GdnSyH3YtwcxFvQrVVJMm1JhTS4QVX7MFsX56uJLUfiZ \
  --known-validator DE1bawNcRJB9rVm3buyMVfr8mBEoyyu73NBovf2oXJsJ \
  --known-validator CakcnaRDHka2gXyfbEd2d3xsvkJkqsLw2akB3zsN1D2S \
  --only-known-rpc \
  --ledger /mnt/solana-ledger \
  --accounts /mnt/solana-accounts \
  --log /home/solana/solana-validator.log \
  --rpc-port 8899 \
  --dynamic-port-range 8000-8020 \
  --entrypoint entrypoint.mainnet-beta.solana.com:8001 \
  --entrypoint entrypoint2.mainnet-beta.solana.com:8001 \
  --entrypoint entrypoint3.mainnet-beta.solana.com:8001 \
  --entrypoint entrypoint4.mainnet-beta.solana.com:8001 \
  --entrypoint entrypoint5.mainnet-beta.solana.com:8001 \
  --expected-genesis-hash 5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d \
  --wal-recovery-mode skip_any_corrupted_record \
  --limit-ledger-size \
  --no-wait-for-vote-to-start-leader \
  --full-rpc-api
STARTEOF

chown solana:solana /home/solana/start-validator.sh
chmod +x /home/solana/start-validator.sh

echo -e "${GREEN}✓ Validator start script created${NC}"

##############################################################################
# STEP 7: CREATE SYSTEMD SERVICE
##############################################################################

echo -e "\n${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}STEP 7: Create Systemd Service${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}\n"

cat > /etc/systemd/system/solana-validator.service << 'SERVICEEOF'
[Unit]
Description=Solana Validator for WHISTLE
After=network.target
Wants=systuner.service
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=1
User=solana
LimitNOFILE=1000000
LogRateLimitIntervalSec=0
Environment="PATH=/home/solana/.local/share/solana/install/active_release/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
Environment="SOLANA_METRICS_CONFIG=host=https://metrics.solana.com:8086,db=mainnet-beta,u=mainnet-beta_write,p=password"
ExecStart=/home/solana/start-validator.sh

[Install]
WantedBy=multi-user.target
SERVICEEOF

systemctl daemon-reload

echo -e "${GREEN}✓ Systemd service created${NC}"

##############################################################################
# STEP 8: FIREWALL CONFIGURATION
##############################################################################

echo -e "\n${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}STEP 8: Configure Firewall${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}\n"

# Install UFW if not present
apt install -y ufw

# Configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 8000:8020/udp  # Solana dynamic ports
ufw allow 8000:8020/tcp  # Solana dynamic ports
ufw allow 8899/tcp  # RPC port
ufw allow 8900/tcp  # Websocket port

echo -e "${YELLOW}Enabling firewall...${NC}"
yes | ufw enable

echo -e "${GREEN}✓ Firewall configured${NC}"

##############################################################################
# STEP 9: FINAL SETUP INSTRUCTIONS
##############################################################################

echo -e "\n${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 SETUP COMPLETE - Next Steps${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}Your validator identity:${NC}"
echo -e "${BLUE}$VALIDATOR_PUBKEY${NC}"

echo -e "\n${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}⚠️  BEFORE STARTING THE VALIDATOR:${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}1. BACKUP YOUR KEYS (from local machine):${NC}"
echo -e "   ${BLUE}scp -r root@212.108.83.86:/home/solana/validator-keypairs ~/whistle-validator-backup/${NC}"
echo ""
echo -e "${YELLOW}2. FUND YOUR VALIDATOR:${NC}"
echo -e "   Send 5-10 SOL to: ${BLUE}$VALIDATOR_PUBKEY${NC}"
echo ""
echo -e "${YELLOW}3. CREATE VOTE ACCOUNT:${NC}"
echo -e "   ${BLUE}su - solana${NC}"
echo -e "   ${BLUE}solana config set --url https://api.mainnet-beta.solana.com${NC}"
echo -e "   ${BLUE}solana create-vote-account \\${NC}"
echo -e "   ${BLUE}  ~/validator-keypairs/vote-account-keypair.json \\${NC}"
echo -e "   ${BLUE}  ~/validator-keypairs/validator-keypair.json \\${NC}"
echo -e "   ${BLUE}  ~/validator-keypairs/authorized-withdrawer-keypair.json \\${NC}"
echo -e "   ${BLUE}  --commission 10${NC}"
echo ""
echo -e "${YELLOW}4. START THE VALIDATOR:${NC}"
echo -e "   ${BLUE}sudo systemctl start solana-validator${NC}"
echo -e "   ${BLUE}sudo systemctl enable solana-validator${NC}"
echo ""
echo -e "${YELLOW}5. MONITOR:${NC}"
echo -e "   ${BLUE}journalctl -u solana-validator -f${NC}"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ WHISTLENET VALIDATOR READY FOR DEPLOYMENT!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
SCRIPTEOF

# Make executable
chmod +x /root/solana-validator-setup.sh
```

### Step 2: Run the setup script

```bash
/root/solana-validator-setup.sh
```

### What to expect:
- Hardware checks (CPU, RAM, NVMe)
- System optimization (CPU performance mode)
- Drive formatting (⚠️ will erase data!)
- Solana installation (~5 minutes)
- Key generation
- Service creation

**Total time: ~20-30 minutes**

### After setup completes:
- Backup your keys
- Fund validator with SOL
- Create vote account
- Start the validator!

