# 🚀 Ghost Whistle - Quick Start on Vultr

## Complete Terminal-Based Deployment in 3 Steps

---

## Prerequisites

- Vultr account (sign up at https://www.vultr.com/)
- SSH key added to Vultr
- Solana CLI installed locally (`sh -c "$(curl -sSfL https://release.solana.com/stable/install)"`)

---

## Step 1: Deploy 5 VPS on Vultr (5 minutes)

### Via Vultr Dashboard:

1. **Sign up/Login**: https://www.vultr.com/
2. **Deploy 5 servers** with these settings:

| Server | Location | Specs | Cost |
|--------|----------|-------|------|
| 1 | New York or Atlanta | 1 vCPU, 1GB RAM | $6/mo |
| 2 | Los Angeles or Seattle | 1 vCPU, 1GB RAM | $6/mo |
| 3 | London or Amsterdam | 1 vCPU, 1GB RAM | $6/mo |
| 4 | Singapore or Tokyo | 1 vCPU, 1GB RAM | $6/mo |
| 5 | Toronto or Sydney | 1 vCPU, 1GB RAM | $6/mo |

**For each server:**
- Server Type: **Cloud Compute - Shared CPU**
- Server Image: **Ubuntu 22.04 LTS**
- Server Size: **$6/month** (25GB SSD)
- **Enable Auto Backups**: Optional (+$1/mo)
- **Add your SSH key**: Required for automated deployment
- Server Hostname: `ghost-node-1`, `ghost-node-2`, etc.

3. **Wait 1-2 minutes** for all servers to be "Running"
4. **Copy all 5 IP addresses** from Vultr dashboard

---

## Step 2: Generate Fresh Keypairs (1 minute)

```bash
# Make scripts executable
chmod +x *.sh

# Generate 10 fresh keypairs
./generate-keypairs.sh

# This creates:
# - node-keys/bootstrap-node-1-keypair.json
# - node-keys/bootstrap-node-2-keypair.json
# - ... through 10

# It will display all wallet addresses
```

**Save the wallet addresses!** You'll need to fund them later.

---

## Step 3: Deploy All Nodes (5 minutes)

```bash
# Deploy to all 5 servers at once
./deploy-all-vultr.sh <SERVER1_IP> <SERVER2_IP> <SERVER3_IP> <SERVER4_IP> <SERVER5_IP>

# Example:
./deploy-all-vultr.sh 45.76.1.1 108.61.2.2 149.28.3.3 207.148.4.4 95.179.5.5
```

**What this script does:**
1. ✅ Installs Node.js, PM2, Solana CLI on each server
2. ✅ Configures firewall
3. ✅ Uploads your code
4. ✅ Transfers keypairs securely
5. ✅ Creates PM2 configs
6. ✅ Starts all services
7. ✅ Sets up auto-restart on reboot

**Total time: ~5 minutes** for all 5 servers

---

## Step 4: Verify Deployment (1 minute)

```bash
# Check all nodes are running
./check-all-nodes.sh <SERVER1_IP> <SERVER2_IP> <SERVER3_IP> <SERVER4_IP> <SERVER5_IP>

# Should show all processes as "online"
```

---

## Step 5: Get Node Addresses & Fund Wallets (5 minutes)

```bash
# Get all wallet addresses with current balances
./get-node-addresses.sh <SERVER1_IP> <SERVER2_IP> <SERVER3_IP> <SERVER4_IP> <SERVER5_IP>

# This will display all 10 node wallet addresses
```

**Fund each wallet** with 0.01-0.05 SOL from your main wallet:

```bash
# Example: Send 0.02 SOL to each node
solana transfer <NODE_1_ADDRESS> 0.02 --allow-unfunded-recipient
solana transfer <NODE_2_ADDRESS> 0.02 --allow-unfunded-recipient
# ... repeat for all 10 nodes
```

---

## Step 6: Update Frontend (2 minutes)

Update your `index.html` with Server 1's IP address:

```javascript
// Find this line in index.html (around line 20500)
const SIGNALING_SERVER_URL = 'ws://localhost:8080';

// Change to Server 1's IP:
const SIGNALING_SERVER_URL = 'ws://YOUR_SERVER_1_IP:8080';
```

Or create a `.env` file:

```bash
echo "SIGNALING_SERVER=ws://YOUR_SERVER_1_IP:8080" > .env
```

---

## Step 7: Test Your Relay Network! 🎉

1. Open your frontend (deploy to Netlify or run locally)
2. Connect your wallet
3. Try sending 0.01 SOL anonymously with 3 hops
4. Watch the logs:

```bash
# View logs from Server 1 (signaling + nodes 1-2)
ssh root@SERVER_1_IP 'cd /root/ghost-whistle && pm2 logs --lines 50'

# View logs from any server
ssh root@SERVER_IP 'cd /root/ghost-whistle && pm2 logs'
```

You should see relay messages hopping through your nodes! 🎊

---

## 📋 All Commands Summary

```bash
# 1. Generate keypairs
./generate-keypairs.sh

# 2. Deploy all servers
./deploy-all-vultr.sh IP1 IP2 IP3 IP4 IP5

# 3. Check status
./check-all-nodes.sh IP1 IP2 IP3 IP4 IP5

# 4. Get wallet addresses
./get-node-addresses.sh IP1 IP2 IP3 IP4 IP5

# 5. View logs (any server)
ssh root@SERVER_IP 'cd /root/ghost-whistle && pm2 logs --lines 50'

# 6. Restart all nodes (if needed)
ssh root@SERVER_IP 'cd /root/ghost-whistle && pm2 restart all'

# 7. Check node balances again
./get-node-addresses.sh IP1 IP2 IP3 IP4 IP5
```

---

## 🔧 Troubleshooting

### "Cannot connect via SSH"
```bash
# Test SSH connection
ssh root@SERVER_IP

# If it asks for password, your SSH key isn't configured
# Re-deploy the server on Vultr and select your SSH key
```

### "Keypair not found"
```bash
# Make sure you're in the project directory
ls node-keys/

# Regenerate if needed
./generate-keypairs.sh
```

### "Node not responding"
```bash
# Check PM2 status
ssh root@SERVER_IP 'cd /root/ghost-whistle && pm2 status'

# Restart specific node
ssh root@SERVER_IP 'cd /root/ghost-whistle && pm2 restart bootstrap-node-1'

# View errors
ssh root@SERVER_IP 'cd /root/ghost-whistle && pm2 logs bootstrap-node-1 --err'
```

### "Nodes have no SOL"
```bash
# Check balances
./get-node-addresses.sh IP1 IP2 IP3 IP4 IP5

# Fund each node (minimum 0.01 SOL)
solana transfer NODE_ADDRESS 0.02 --allow-unfunded-recipient
```

---

## 💰 Monthly Costs

```
5 Vultr VPS @ $6/month each = $30/month
Netlify (frontend)          = FREE
Total:                      = $30/month
```

**For just the relay network!** Add your backend/API hosting separately if needed.

---

## 🎯 What You Get

✅ **10 bootstrap relay nodes** across 5 geographic locations  
✅ **True privacy** - Different IPs, providers, regions  
✅ **Automatic restart** - PM2 keeps nodes running  
✅ **Auto-start on reboot** - Servers restart, nodes restart  
✅ **Secure** - Keypairs never in Git, firewall configured  
✅ **Monitored** - PM2 logs and status  
✅ **Production-ready** - Real decentralized relay network  

---

## 📚 Next Steps

1. **Deploy frontend** to Netlify (free): https://www.netlify.com/
2. **Get a domain** and setup SSL for signaling server
3. **Monitor node balances** regularly and refill as needed
4. **Scale up** - Add more nodes by deploying to more VPS
5. **Setup monitoring** - Use PM2 Plus or custom monitoring

---

## 🔐 Security Reminders

- ✅ Keypairs are NOT in Git (protected by .gitignore)
- ✅ Only fund nodes with minimal SOL (0.01-0.05 each)
- ✅ Create encrypted backup of node-keys/
- ✅ SSH keys only (no password login)
- ✅ Firewall enabled on all servers

---

**That's it! Your distributed Ghost Whistle relay network is live!** 🎉

Total setup time: **~20 minutes**  
Monthly cost: **~$30**  
Privacy level: **Maximum** ⭐⭐⭐⭐⭐

Have fun with your anonymous relay network! 🚀

