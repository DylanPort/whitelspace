# SOLANA VALIDATOR - QUICK COMMAND REFERENCE

## 🚀 ONE-TIME SETUP

```bash
# 1. Upload and run setup script
scp whistlenet/solana-validator-setup.sh root@212.108.83.86:/root/
ssh root@212.108.83.86
chmod +x /root/solana-validator-setup.sh
./solana-validator-setup.sh

# 2. Backup keys
scp -r root@212.108.83.86:/home/solana/validator-keypairs ~/whistle-validator-backup/

# 3. Get your public key
ssh root@212.108.83.86 "su - solana -c 'solana-keygen pubkey ~/validator-keypairs/validator-keypair.json'"

# 4. Fund validator (send 5-10 SOL to pubkey above)

# 5. Create vote account
ssh root@212.108.83.86
su - solana
solana config set --url https://api.mainnet-beta.solana.com
solana create-vote-account \
  ~/validator-keypairs/vote-account-keypair.json \
  ~/validator-keypairs/validator-keypair.json \
  ~/validator-keypairs/authorized-withdrawer-keypair.json \
  --commission 10

# 6. Start validator
exit  # back to root
sudo systemctl start solana-validator
sudo systemctl enable solana-validator
```

---

## 📊 DAILY MONITORING COMMANDS

```bash
# Quick status check
ssh root@212.108.83.86 "sudo systemctl status solana-validator"

# Check if catching up
ssh root@212.108.83.86 "su - solana -c 'solana catchup ~/validator-keypairs/validator-keypair.json'"

# Watch live logs
ssh root@212.108.83.86 "journalctl -u solana-validator -f"

# Check vote account
ssh root@212.108.83.86 "su - solana -c 'solana vote-account <VOTE_PUBKEY>'"

# Check balance
ssh root@212.108.83.86 "su - solana -c 'solana balance ~/validator-keypairs/validator-keypair.json'"

# Check disk usage
ssh root@212.108.83.86 "df -h | grep solana"

# Check CPU governor
ssh root@212.108.83.86 "cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor"
```

---

## 🔧 MAINTENANCE COMMANDS

```bash
# Restart validator
ssh root@212.108.83.86 "sudo systemctl restart solana-validator"

# Stop validator
ssh root@212.108.83.86 "sudo systemctl stop solana-validator"

# View error logs only
ssh root@212.108.83.86 "journalctl -u solana-validator -p err"

# Update Solana version
ssh root@212.108.83.86
su - solana
solana-install update
exit
sudo systemctl restart solana-validator

# Check Solana version
ssh root@212.108.83.86 "su - solana -c 'solana --version'"
```

---

## 🚨 TROUBLESHOOTING COMMANDS

```bash
# Check if service failed
ssh root@212.108.83.86 "sudo systemctl status solana-validator --no-pager"

# See why validator stopped
ssh root@212.108.83.86 "journalctl -u solana-validator --since '10 minutes ago'"

# Check network connectivity
ssh root@212.108.83.86 "su - solana -c 'solana gossip'"

# Verify hardware
ssh root@212.108.83.86 "lscpu | grep -E '(Model name|MHz)'"
ssh root@212.83.86 "lsblk | grep nvme"
ssh root@212.108.83.86 "free -h"

# Check disk I/O
ssh root@212.108.83.86 "iostat -x 5 3"

# Test RPC endpoint
curl -X POST http://212.108.83.86:8899 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

---

## 📈 PERFORMANCE CHECKS

```bash
# Get validator performance
ssh root@212.108.83.86 "su - solana -c 'solana validators | head -20'"

# Check skip rate (lower is better, <10% is good)
ssh root@212.108.83.86 "su - solana -c 'solana validators' | grep <YOUR_PUBKEY>"

# Check slot height vs network
ssh root@212.108.83.86 "su - solana -c 'solana slot'"

# Block production stats
ssh root@212.108.83.86 "su - solana -c 'solana block-production | grep <YOUR_PUBKEY>'"
```

---

## 🔥 EMERGENCY COMMANDS

```bash
# Validator won't start - check logs
ssh root@212.108.83.86 "journalctl -u solana-validator -n 100 --no-pager"

# Out of disk space - check what's using space
ssh root@212.108.83.86 "du -sh /mnt/solana-*/* | sort -h"

# Force re-sync from snapshot
ssh root@212.108.83.86
su - solana
# STOP validator first!
sudo systemctl stop solana-validator
# Remove old ledger
rm -rf /mnt/solana-ledger/*
# Restart - will download fresh snapshot
sudo systemctl start solana-validator

# Reset CPU governor if not working
ssh root@212.108.83.86 "echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor"
```

---

## 💡 USEFUL ONE-LINERS

```bash
# Full status report
ssh root@212.108.83.86 "echo '=== SERVICE ===' && sudo systemctl status solana-validator --no-pager && echo && echo '=== CATCHUP ===' && su - solana -c 'solana catchup ~/validator-keypairs/validator-keypair.json' && echo && echo '=== DISK ===' && df -h | grep solana"

# Monitor CPU temperature (if available)
ssh root@212.108.83.86 "sensors"

# Network stats
ssh root@212.108.83.86 "ss -s"

# Watch slot progression
ssh root@212.108.83.86 "journalctl -u solana-validator -f | grep 'Processed Slot'"

# Get current epoch info
ssh root@212.108.83.86 "su - solana -c 'solana epoch-info'"
```

---

## 🔗 URLS TO CHECK

```bash
# Your validator's RPC health
http://212.108.83.86:8899

# Public validators dashboards (search for your pubkey):
- https://validators.app
- https://staking.kiwi
- https://www.validators.app/validators/<YOUR_PUBKEY>
```

---

## 📝 CONFIGURATION FILES LOCATIONS

```bash
# Validator start script
/home/solana/start-validator.sh

# Systemd service
/etc/systemd/system/solana-validator.service

# Validator keys
/home/solana/validator-keypairs/

# Ledger data
/mnt/solana-ledger/

# Accounts data
/mnt/solana-accounts/

# Logs
journalctl -u solana-validator
/home/solana/solana-validator.log
```

---

**Save this file for quick reference!**

