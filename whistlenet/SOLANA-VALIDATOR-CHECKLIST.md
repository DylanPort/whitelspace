# 🔊 WHISTLE SOLANA VALIDATOR SETUP CHECKLIST

**Hardware:** AMD EPYC 9354 | 768GB RAM | 2×3.84TB NVMe | 10Gbps  
**Location:** UK (212.108.83.86)  
**Based on:** [Solana HCL Repository](https://github.com/solanahcl/solanahcl)

---

## 📋 PRE-SETUP CHECKLIST

- [ ] SSH access to server: `ssh root@212.108.83.86`
- [ ] Server is running Ubuntu 24.04
- [ ] Have 5-10 SOL ready for validator funding
- [ ] Backup storage ready for validator keys
- [ ] Understand this will take 1-2 days to fully sync

---

## 🚀 SETUP STEPS

### Step 1: Upload Setup Script

```bash
# From your local machine
scp whistlenet/solana-validator-setup.sh root@212.108.83.86:/root/
```

### Step 2: Run the Setup Script

```bash
# SSH into server
ssh root@212.108.83.86

# Make script executable
chmod +x /root/solana-validator-setup.sh

# Run the setup (takes ~15-30 minutes)
./solana-validator-setup.sh
```

**What the script does:**
1. ✅ Checks hardware compatibility (CPU, RAM, NVMe, AVX2/AVX-512)
2. ✅ Enables CPU performance mode (CORE optimization)
3. ✅ Disables swap (HCL recommendation)
4. ✅ Optimizes system limits and network settings
5. ✅ Formats and mounts 2 NVMe drives (ledger + accounts separation)
6. ✅ Installs Solana CLI
7. ✅ Generates validator keys (identity, vote, withdrawer)
8. ✅ Creates validator start script
9. ✅ Sets up systemd service
10. ✅ Configures firewall

---

## 🔑 Step 3: BACKUP YOUR KEYS IMMEDIATELY!

After the script completes, backup these critical files:

```bash
# Copy keys to your local machine
scp -r root@212.108.83.86:/home/solana/validator-keypairs ~/whistle-validator-backup/

# Or display them to save manually
ssh root@212.108.83.86
su - solana
cat ~/validator-keypairs/validator-keypair.json
cat ~/validator-keypairs/vote-account-keypair.json
cat ~/validator-keypairs/authorized-withdrawer-keypair.json
```

**⚠️ CRITICAL:** Store these in multiple secure locations:
- [ ] Local encrypted backup
- [ ] Cloud encrypted storage
- [ ] Hardware wallet (if possible)
- [ ] Password manager

**Validator Identity Public Key:**
```
<WILL BE SHOWN AFTER SETUP>
```

---

## 💰 Step 4: Fund Your Validator

```bash
# Get your validator identity
ssh root@212.108.83.86
su - solana
solana-keygen pubkey ~/validator-keypairs/validator-keypair.json
```

**Send 5-10 SOL to this address** from your wallet.

Verify balance:
```bash
solana config set --url https://api.mainnet-beta.solana.com
solana balance ~/validator-keypairs/validator-keypair.json
```

---

## 🗳️ Step 5: Create Vote Account

```bash
ssh root@212.108.83.86
su - solana

# Set to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# Create vote account (costs ~0.03 SOL)
solana create-vote-account \
  ~/validator-keypairs/vote-account-keypair.json \
  ~/validator-keypairs/validator-keypair.json \
  ~/validator-keypairs/authorized-withdrawer-keypair.json \
  --commission 10

# Verify vote account
solana vote-account ~/validator-keypairs/vote-account-keypair.json
```

**Vote Account Public Key:**
```
<WILL BE SHOWN AFTER CREATION>
```

---

## 🏃 Step 6: Start the Validator

```bash
# Start the validator service
sudo systemctl start solana-validator

# Enable auto-start on reboot
sudo systemctl enable solana-validator

# Check status
sudo systemctl status solana-validator
```

---

## 📊 Step 7: Monitor the Validator

### Watch Live Logs
```bash
journalctl -u solana-validator -f
```

**Look for:**
- ✅ "Shred version: XXXXX" (connected to network)
- ✅ "Processed Slot: XXXXX" (syncing ledger)
- ❌ Any errors about keys or configuration

### Check Sync Status
```bash
su - solana
solana catchup ~/validator-keypairs/validator-keypair.json
```

### Check Gossip (Network Discovery)
```bash
solana gossip | grep <YOUR_PUBKEY>
```

### Check Validators List
```bash
solana validators | grep <YOUR_PUBKEY>
```

---

## ⏱️ EXPECTED TIMELINE

| Phase | Duration | What's Happening |
|-------|----------|------------------|
| **Initial Boot** | 5-10 min | Connecting to network, downloading snapshot |
| **Ledger Sync** | 12-24 hours | Downloading and verifying historical ledger |
| **Account Sync** | 4-8 hours | Syncing account state |
| **Catch Up** | 1-2 hours | Catching up to current slot |
| **Voting** | Ongoing | Participating in consensus |

**Total: ~24-48 hours to fully operational**

---

## 🔍 HEALTH CHECKS

### Every Hour (First 24 Hours)
```bash
# Check if service is running
sudo systemctl status solana-validator

# Check catchup progress
su - solana -c "solana catchup ~/validator-keypairs/validator-keypair.json"
```

### Daily Checks
```bash
# Check vote credits
solana vote-account <VOTE_ACCOUNT_PUBKEY>

# Check skip rate
solana validators | grep <YOUR_PUBKEY>

# Check disk usage
df -h | grep solana
```

---

## 🚨 TROUBLESHOOTING

### Validator Won't Catch Up

**CORE Checklist (from HCL):**
- **C: Check CPU performance**
  ```bash
  cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
  # Should all say "performance"
  ```

- **O: Optimize NVMe** (already done in setup)
  ```bash
  df -h | grep solana
  # Should see 2 separate mounts
  ```

- **R: Remove unnecessary CLI arguments**
  - Script uses minimal recommended args

- **E: Enable performance mode** (already done)
  ```bash
  sudo systemctl status cpu-performance
  ```

### High Skip Rate
- Check network latency: `ping entrypoint.mainnet-beta.solana.com`
- Check disk IOPS: `iostat -x 5`
- Review logs for errors: `journalctl -u solana-validator -p err`

### Out of Disk Space
```bash
# Ledger auto-prunes, but check:
du -sh /mnt/solana-ledger/*
du -sh /mnt/solana-accounts/*
```

---

## 🔗 INTEGRATE WITH WHISTLENET

### Add Validator Info to Provider Portal

Once your validator is catching up, add it to your provider portal:

```javascript
// providers/provider-portal.js
const validatorInfo = {
  publicKey: "<YOUR_VALIDATOR_PUBKEY>",
  voteAccount: "<YOUR_VOTE_ACCOUNT_PUBKEY>",
  region: "UK",
  datacenter: "Latitude (or your provider)",
  hardware: {
    cpu: "AMD EPYC 9354 (32 cores / 3.25 GHz)",
    ram: "768 GB",
    storage: "2×3.84 TB NVMe",
    network: "10 Gbps"
  },
  status: "syncing", // or "active" when caught up
  rpcEndpoint: "http://212.108.83.86:8899"
};
```

### Expose RPC for WHISTLE Network

The validator runs an RPC endpoint on port 8899. To make it available:

```bash
# Already open in firewall by setup script
# Test locally first:
curl -X POST http://212.108.83.86:8899 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

---

## 📚 RESOURCES

### Official Docs
- [Solana Validator Setup](https://docs.anza.xyz/operations/setup-a-validator)
- [Solana HCL](https://solanahcl.org)
- [Anza Requirements](https://docs.anza.xyz/operations/requirements)

### Monitoring Dashboards
- [validators.app](https://validators.app) - Track your validator
- [staking.kiwi](https://staking.kiwi) - Performance metrics
- [Marinade Network](https://marinade.finance/network/) - Validator health

### Community
- Solana Discord: `#validator-support`
- Solana Forum: `forum.solana.com`

---

## ✅ FINAL CHECKLIST

- [ ] Validator keys backed up in 3+ locations
- [ ] Validator funded with 5+ SOL
- [ ] Vote account created successfully
- [ ] Validator service running (`systemctl status solana-validator`)
- [ ] Logs showing slot progression (`journalctl -u solana-validator -f`)
- [ ] Catchup command shows progress
- [ ] Validator appears in gossip network
- [ ] RPC endpoint responding
- [ ] Monitoring setup (alerts for downtime)
- [ ] Auto-start enabled (`systemctl enable solana-validator`)

---

## 🎯 SUCCESS CRITERIA

Your validator is **fully operational** when:

1. ✅ `solana catchup` shows: "has caught up"
2. ✅ `solana validators` shows your validator with vote credits
3. ✅ Skip rate < 10%
4. ✅ RPC endpoint responding to queries
5. ✅ Visible on validators.app

---

## 🔥 WHISTLENET INTEGRATION READY!

Once operational, your validator provides:
- ✅ Direct mainnet data for WHISTLE
- ✅ Low-latency RPC for provider portal
- ✅ Decentralized infrastructure
- ✅ Stake delegation opportunities

**Your validator will be a core part of WHISTLE's decentralized network!** 🔊

