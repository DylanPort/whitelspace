# 🚀 Run 10 Whistle Privacy Nodes

You have **3 methods** to run 10 privacy nodes. Choose the one that works best for you!

---

## 🎯 METHOD 1: PM2 (Recommended - Easiest)

**Best for:** Running on a single VPS or local machine

### Step 1: Install PM2
```bash
npm install -g pm2
```

### Step 2: Set Environment Variables
```bash
# Create .env file
cat > .env << EOF
SIGNALING_SERVER=wss://ghost-whistle-signaling.onrender.com
RPC_URL=https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba
NODE_ENV=production
EOF
```

### Step 3: Create Node Storage Directories
```bash
# Create directories for all 10 nodes
mkdir -p logs
mkdir -p node-storage
for i in {1..10}; do
  mkdir -p node-storage/node-$i
done
```

### Step 4: Start All 10 Nodes
```bash
# Start everything with PM2
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs
```

### What You'll See:
```
┌─────┬──────────────────────┬─────────┬──────┬───────┐
│ id  │ name                 │ status  │ cpu  │ mem   │
├─────┼──────────────────────┼─────────┼──────┼───────┤
│ 0   │ signaling-server     │ online  │ 2%   │ 45MB  │
│ 1   │ backend-api          │ online  │ 1%   │ 38MB  │
│ 2   │ ghost-node-1         │ online  │ 0%   │ 35MB  │
│ 3   │ ghost-node-2         │ online  │ 0%   │ 33MB  │
│ 4   │ ghost-node-3         │ online  │ 0%   │ 34MB  │
│ 5   │ ghost-node-4         │ online  │ 0%   │ 32MB  │
│ 6   │ ghost-node-5         │ online  │ 0%   │ 35MB  │
│ 7   │ ghost-node-6         │ online  │ 0%   │ 33MB  │
│ 8   │ ghost-node-7         │ online  │ 0%   │ 34MB  │
│ 9   │ ghost-node-8         │ online  │ 0%   │ 32MB  │
│ 10  │ ghost-node-9         │ online  │ 0%   │ 35MB  │
│ 11  │ ghost-node-10        │ online  │ 0%   │ 33MB  │
└─────┴──────────────────────┴─────────┴──────┴───────┘
```

### Useful PM2 Commands:
```bash
# Stop all nodes
pm2 stop all

# Restart all nodes
pm2 restart all

# Stop a specific node
pm2 stop ghost-node-5

# View specific node logs
pm2 logs ghost-node-1

# Monitor in real-time
pm2 monit

# Save process list (auto-restart on reboot)
pm2 save
pm2 startup
```

---

## 🐳 METHOD 2: Docker Compose

**Best for:** Containerized deployment with isolation

### Step 1: Build Docker Image
```bash
# Build the image
docker compose build
```

### Step 2: Start All Containers
```bash
# Start all 10 nodes + signaling server
docker compose up -d

# View logs
docker compose logs -f

# Check status
docker compose ps
```

### What You'll See:
```
NAME                 STATUS    PORTS
ghost-signaling      Up        0.0.0.0:8080->8080/tcp
ghost-backend        Up        0.0.0.0:3001->3001/tcp
ghost-node-1         Up        
ghost-node-2         Up        
ghost-node-3         Up        
ghost-node-4         Up        
ghost-node-5         Up        
ghost-node-6         Up        
ghost-node-7         Up        
ghost-node-8         Up        
ghost-node-9         Up        
ghost-node-10        Up        
```

### Useful Docker Commands:
```bash
# Stop all
docker compose down

# Restart all
docker compose restart

# View specific node logs
docker compose logs -f node-1

# Scale nodes (add more!)
docker compose up -d --scale node-1=15

# Remove everything
docker compose down -v
```

---

## 🌍 METHOD 3: Cloud Deployment (Render/Heroku)

**Best for:** Distributed deployment across regions

### Deploy to Render (Free Tier - 10 instances)

#### 1. Fork the Repository
```bash
# Push your code to GitHub
git init
git add .
git commit -m "Whistle nodes"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/whistle.git
git push -u origin main
```

#### 2. Deploy Each Node on Render

Go to https://dashboard.render.com and create 10 web services:

**Node 1:**
- Name: `whistle-node-1`
- Environment: `Node`
- Build Command: `npm install`
- Start Command: `node user-node-client.js`
- Environment Variables:
  ```
  NODE_ID=render-node-1
  NODE_REGION=US-East
  SIGNALING_SERVER=wss://ghost-whistle-signaling.onrender.com
  ```

**Node 2:**
- Name: `whistle-node-2`
- Environment: `Node`
- Build Command: `npm install`
- Start Command: `node user-node-client.js`
- Environment Variables:
  ```
  NODE_ID=render-node-2
  NODE_REGION=US-West
  SIGNALING_SERVER=wss://ghost-whistle-signaling.onrender.com
  ```

**Repeat for all 10 nodes** with different NODE_ID and NODE_REGION values.

#### Regions to Use:
1. US-East
2. US-West
3. US-Central
4. EU-West
5. EU-East
6. Asia-Pacific
7. South-America
8. Australia
9. Canada
10. Middle-East

---

## 📊 Monitor Your Nodes

### Check Node Status
Once running, your nodes will appear on your Whistle dashboard:

1. Open https://whistle.ninja (or your local app)
2. Connect your wallet
3. Go to **Node Dashboard**
4. You'll see all 10 nodes online!

### Expected Stats:
```
Total Nodes: 10
Online Nodes: 10
Avg Uptime: 99.5%
Total Relays: 1,247
Regions: 10
```

---

## 💰 Earning with Nodes

### How Rewards Work:
1. **Uptime** - Nodes earn for being online
2. **Relays** - Additional rewards for handling transactions
3. **Reputation** - Better nodes get priority

### Payout Schedule:
- Rewards distributed every 24 hours
- Automatic on-chain distribution
- Check your wallet for WHISTLE tokens

### Maximize Earnings:
```bash
# Keep high uptime
pm2 save
pm2 startup

# Monitor logs for errors
pm2 logs --lines 100

# Auto-restart on crashes
# (Already configured in ecosystem.config.js)
```

---

## 🔧 Troubleshooting

### Node Not Connecting?
```bash
# Check if signaling server is accessible
curl https://ghost-whistle-signaling.onrender.com/health

# Check node logs
pm2 logs ghost-node-1

# Restart specific node
pm2 restart ghost-node-1
```

### Out of Memory?
```bash
# Check memory usage
pm2 status

# Increase memory limit in ecosystem.config.js
max_memory_restart: '300M'  # Increase from 200M

# Restart
pm2 reload all
```

### Nodes Offline?
```bash
# Check all processes
pm2 list

# Restart dead nodes
pm2 restart all

# Check system resources
htop
```

---

## 💾 System Requirements

### For 10 Nodes:

**Minimum:**
- CPU: 2 cores
- RAM: 2GB
- Storage: 5GB
- Network: 10 Mbps

**Recommended:**
- CPU: 4 cores
- RAM: 4GB
- Storage: 20GB
- Network: 50 Mbps

**Optimal:**
- CPU: 8 cores
- RAM: 8GB
- Storage: 50GB
- Network: 100 Mbps

---

## 📈 Scaling Beyond 10 Nodes

Want to run more than 10 nodes?

### Update ecosystem.config.js:
```javascript
// Change from 10 to 20
...Array.from({ length: 20 }, (_, i) => ({
  name: `ghost-node-${i + 1}`,
  // ... rest of config
}))
```

### Then restart:
```bash
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

---

## 🎯 Quick Start Commands

### Start Everything:
```bash
# Install dependencies
npm install

# Create directories
mkdir -p logs node-storage

# Start with PM2
pm2 start ecosystem.config.js

# Save process list
pm2 save

# Setup auto-restart on reboot
pm2 startup
```

### Stop Everything:
```bash
pm2 stop all
pm2 delete all
```

### Monitor:
```bash
pm2 monit
```

---

## ✅ Verification

Once running, verify your nodes are active:

1. **On Dashboard:**
   - Visit https://whistle.ninja
   - Connect wallet
   - See all 10 nodes online

2. **In Logs:**
```bash
pm2 logs ghost-node-1 --lines 50
```

Expected output:
```
✅ Connected to signaling server!
📡 Registered with signaling server
🟢 Node online and ready for relays
```

3. **Check Blockchain:**
   - Your nodes will be registered on-chain
   - Visible in the app's node list
   - Earning rewards automatically

---

## 🆘 Need Help?

**Common Issues:**

1. **"Cannot connect to signaling server"**
   - Check internet connection
   - Verify signaling server is up
   - Try different SIGNALING_SERVER URL

2. **"Node already registered"**
   - Change NODE_ID to something unique
   - Or restart the signaling server

3. **"Low memory"**
   - Reduce number of nodes
   - Increase VPS memory
   - Adjust max_memory_restart

**Get Support:**
- Email: whistleninja@virgilio.it
- Discord: Join Solana Mobile Discord
- Check logs: `pm2 logs`

---

## 🎉 You're All Set!

Your 10 Whistle privacy nodes are now running and earning rewards!

**Next Steps:**
1. Monitor your dashboard
2. Check your rewards daily
3. Keep nodes online for maximum earnings
4. Consider scaling to more nodes

**Happy node running!** 🚀


