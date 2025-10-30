# 🏠 Ghost Whistle - Run Locally

## ✅ Running All 10 Nodes on Your Computer

Perfect for **testing, development, or running a private relay network locally!**

---

## 🎯 Advantages of Running Locally

✅ **Free** - No VPS costs  
✅ **Instant** - No server setup needed  
✅ **Easy testing** - Perfect for development  
✅ **Full control** - Everything on your machine  

❌ **Not for production** - All nodes share same IP (no real anonymity)  
❌ **Requires your computer to stay on** - No 24/7 uptime  
❌ **No geographic distribution** - All nodes in one location  

---

## 🚀 Quick Start (2 Commands)

### **Step 1: Generate Keypairs (1 minute)**

```bash
# Windows (PowerShell)
cd node-keys
for ($i=1; $i -le 10; $i++) {
  solana-keygen new --outfile "bootstrap-node-$i-keypair.json" --no-bip39-passphrase --force
}
cd ..

# Linux/Mac (Git Bash)
bash generate-keypairs.sh
```

### **Step 2: Start Everything (10 seconds)**

```bash
pm2 start ecosystem.config.js
```

**That's it!** ✨ All 10 nodes + signaling server + backend are running!

---

## 📋 Step-by-Step Guide

### **1. Install Prerequisites (if not already installed)**

```bash
# Install Node.js 18+ (if not installed)
# Download from: https://nodejs.org/

# Install PM2 globally
npm install -g pm2

# Install Solana CLI (if not installed)
# Windows: Download from solana.com
# Mac/Linux: sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install project dependencies
npm install
```

### **2. Generate Keypairs**

**Option A: PowerShell (Windows)**
```powershell
# Create directory if it doesn't exist
New-Item -ItemType Directory -Force -Path node-keys

# Generate 10 keypairs
cd node-keys
for ($i=1; $i -le 10; $i++) {
    solana-keygen new --outfile "bootstrap-node-$i-keypair.json" --no-bip39-passphrase --force
    Write-Host "✓ Generated bootstrap-node-$i-keypair.json"
}
cd ..

# Show wallet addresses
for ($i=1; $i -le 10; $i++) {
    $addr = solana-keygen pubkey "node-keys/bootstrap-node-$i-keypair.json"
    Write-Host "Node $i: $addr"
}
```

**Option B: Bash (Git Bash/Mac/Linux)**
```bash
bash generate-keypairs.sh
```

### **3. Start All Services**

```bash
# Start everything with PM2
pm2 start ecosystem.config.js

# Check status
pm2 status

# You should see 13 processes running:
# ✓ signaling-server
# ✓ backend-api
# ✓ bootstrap-node-1 through bootstrap-node-10
```

### **4. View Logs**

```bash
# View all logs
pm2 logs

# View specific service logs
pm2 logs signaling-server
pm2 logs bootstrap-node-1

# View last 50 lines
pm2 logs --lines 50
```

### **5. Fund Node Wallets**

```bash
# Get node addresses
pm2 logs --lines 100 | grep "Node Address"

# Or manually check each:
solana-keygen pubkey node-keys/bootstrap-node-1-keypair.json
solana-keygen pubkey node-keys/bootstrap-node-2-keypair.json
# ... etc

# Fund each wallet with 0.02 SOL
solana transfer NODE_ADDRESS 0.02 --allow-unfunded-recipient
```

### **6. Open Your Frontend**

```bash
# The signaling server is running on:
ws://localhost:8080

# The backend API is running on:
http://localhost:3001

# Open index.html in your browser
# Or start a local server:
npx serve .
# Then open: http://localhost:3000
```

### **7. Test Your Relay Network!**

1. Connect your wallet in the frontend
2. Try sending 0.01 SOL anonymously with 3 hops
3. Watch the logs: `pm2 logs --lines 50`
4. You should see relay messages hopping through nodes! 🎉

---

## 🛠️ Management Commands

```bash
# VIEW STATUS
pm2 status                    # Show all processes
pm2 list                      # Same as status

# VIEW LOGS
pm2 logs                      # All logs (live)
pm2 logs --lines 100          # Last 100 lines
pm2 logs bootstrap-node-1     # Specific node logs
pm2 logs --err                # Only errors

# RESTART SERVICES
pm2 restart all               # Restart everything
pm2 restart bootstrap-node-1  # Restart specific node
pm2 restart signaling-server  # Restart signaling

# STOP SERVICES
pm2 stop all                  # Stop everything
pm2 stop bootstrap-node-1     # Stop specific node

# DELETE SERVICES
pm2 delete all                # Remove all from PM2
pm2 delete bootstrap-node-1   # Remove specific service

# MONITORING
pm2 monit                     # Real-time monitoring dashboard

# SAVE CONFIGURATION
pm2 save                      # Save current process list
pm2 startup                   # Auto-start on boot (optional)
```

---

## 🔍 Verify Everything is Working

### **Check 1: All Processes Running**
```bash
pm2 status

# Should show 13 processes, all "online"
```

### **Check 2: Signaling Server Responding**
```bash
# Windows (PowerShell)
Test-NetConnection localhost -Port 8080

# Linux/Mac
nc -zv localhost 8080
# Or
curl http://localhost:8080
```

### **Check 3: Backend API Responding**
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok"}
```

### **Check 4: Nodes Connected**
```bash
pm2 logs signaling-server --lines 50 | grep "connected"

# Should see 10 nodes connected
```

### **Check 5: Node Balances**
```powershell
# Windows PowerShell
for ($i=1; $i -le 10; $i++) {
    $addr = solana-keygen pubkey "node-keys/bootstrap-node-$i-keypair.json"
    $balance = solana balance $addr
    Write-Host "Node $i ($addr): $balance"
}
```

---

## 🐛 Troubleshooting

### **Problem: "Port already in use"**
```bash
# Stop all PM2 processes
pm2 stop all
pm2 delete all

# Or kill specific ports
# Windows:
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:8080 | xargs kill -9
```

### **Problem: "Node not connecting"**
```bash
# Check logs for errors
pm2 logs bootstrap-node-1 --err

# Common issues:
# - Keypair file not found → Check node-keys/ directory
# - Signaling server not running → pm2 restart signaling-server
# - Port conflict → Change port in ecosystem.config.js
```

### **Problem: "Keypair not found"**
```bash
# Make sure you're in the project directory
ls node-keys/

# Should show:
# bootstrap-node-1-keypair.json
# bootstrap-node-2-keypair.json
# ... through 10

# If missing, regenerate:
bash generate-keypairs.sh
```

### **Problem: "PM2 not found"**
```bash
# Install PM2 globally
npm install -g pm2

# Or use npx:
npx pm2 start ecosystem.config.js
```

### **Problem: "Solana not found"**
```bash
# Windows: Download installer from solana.com
# Mac: brew install solana

# Linux:
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Add to PATH:
export PATH="/root/.local/share/solana/install/active_release/bin:$PATH"
```

---

## 📊 Resource Usage

Running all 10 nodes + signaling + backend locally:

```
CPU:    ~10-15% (on modern CPU)
RAM:    ~1-2 GB total
Disk:   ~500 MB (including node_modules)
```

Your computer can easily handle this! 💪

---

## 🔄 Auto-Start on Boot (Optional)

If you want nodes to start automatically when your computer boots:

```bash
# Save current PM2 configuration
pm2 save

# Setup auto-start
pm2 startup

# Follow the instructions it provides
# (You may need to run a command with sudo/admin privileges)
```

**To disable auto-start:**
```bash
pm2 unstartup
```

---

## 🎯 Development Workflow

```bash
# 1. Start development
pm2 start ecosystem.config.js

# 2. Make code changes
# Edit node-client.js, signaling-server.js, etc.

# 3. Restart to apply changes
pm2 restart all

# 4. Watch logs
pm2 logs --lines 50

# 5. Stop when done
pm2 stop all
```

---

## 🌐 Access from Other Devices (Optional)

To access your local relay network from other devices on your network:

### **1. Find Your Local IP**
```bash
# Windows
ipconfig | findstr IPv4

# Mac/Linux
ifconfig | grep "inet "
# Or
ip addr show
```

### **2. Update Frontend**
In `index.html`, change:
```javascript
const SIGNALING_SERVER_URL = 'ws://YOUR_LOCAL_IP:8080';
```

### **3. Open Firewall (Windows)**
```bash
# Allow port 8080 and 3001
New-NetFirewallRule -DisplayName "Ghost Whistle" -Direction Inbound -LocalPort 8080,3001 -Protocol TCP -Action Allow
```

Now other devices on your network can connect!

---

## 📈 Scaling Locally

Want to run more than 10 nodes locally?

Edit `ecosystem.config.js` and add more nodes:

```javascript
{
  name: 'bootstrap-node-11',
  script: './node-client.js',
  instances: 1,
  autorestart: true,
  env: {
    NODE_ID: 'bootstrap-node-11',
    NODE_REGION: 'Local-11',
    KEYPAIR_PATH: './node-keys/bootstrap-node-11-keypair.json',
    SIGNALING_SERVER: 'ws://localhost:8080',
    RPC_URL: 'https://api.mainnet-beta.solana.com',
    STORAGE_DIR: './node-storage/node-11'
  }
}
```

Then generate the keypair and restart:
```bash
solana-keygen new --outfile node-keys/bootstrap-node-11-keypair.json --no-bip39-passphrase
pm2 restart ecosystem.config.js --update-env
```

---

## 🚀 Quick Commands Reference

```bash
# START
pm2 start ecosystem.config.js         # Start all services

# MONITOR
pm2 status                             # Check status
pm2 logs --lines 50                    # View logs
pm2 monit                              # Real-time dashboard

# MANAGE
pm2 restart all                        # Restart everything
pm2 stop all                           # Stop everything
pm2 delete all                         # Remove all

# DEBUG
pm2 logs bootstrap-node-1 --err        # View errors
pm2 describe bootstrap-node-1          # Process details
```

---

## 💡 When to Use Local vs VPS

### **Use Local When:**
✅ Testing and development  
✅ Learning how the relay network works  
✅ Running a private relay for yourself  
✅ Debugging issues  
✅ Prototyping new features  

### **Use VPS When:**
✅ Production deployment  
✅ Need 24/7 uptime  
✅ Need real geographic distribution  
✅ Need true privacy (different IPs)  
✅ Public relay network  

---

## 🎉 Summary

**To run everything locally:**

```bash
# 1. Generate keypairs
bash generate-keypairs.sh

# 2. Start everything
pm2 start ecosystem.config.js

# 3. Check status
pm2 status

# 4. View logs
pm2 logs --lines 50

# 5. Stop when done
pm2 stop all
```

**That's it!** Your complete relay network is running locally! 🚀

---

**Cost: FREE** 💰  
**Setup time: 2 minutes** ⚡  
**Perfect for: Testing and Development** 🧪

