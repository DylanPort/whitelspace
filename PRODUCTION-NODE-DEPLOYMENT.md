# 🚀 Ghost Whistle - Production Node Deployment Guide

## 🎯 Overview: Deploying 10 Bootstrap Nodes

For a **privacy relay network**, you want **geographic distribution** for true anonymity. Here are your options:

---

## 🏆 RECOMMENDED: Geographic Distribution (Best Privacy)

### **Option 1: Multiple VPS Instances (5-10 Servers)**

Deploy 1-2 nodes per VPS across different regions for maximum privacy.

#### **Why This is Best for Privacy:**
- ✅ True geographic diversity (different IPs, regions, providers)
- ✅ Harder to track relay paths across providers
- ✅ Resilient to single-provider outages
- ✅ Authentic relay network behavior
- ✅ Each node can have different characteristics

#### **Recommended Setup:**

| Server | Location | Provider | Nodes | Cost/Month |
|--------|----------|----------|-------|------------|
| VPS-1 | US-East | DigitalOcean | 2 nodes | $6 |
| VPS-2 | US-West | Vultr | 2 nodes | $6 |
| VPS-3 | EU-West | Linode | 2 nodes | $5 |
| VPS-4 | Asia-Pacific | Hetzner | 2 nodes | $5 |
| VPS-5 | Canada | OVH | 2 nodes | $5 |
| **TOTAL** | | | **10 nodes** | **~$27/mo** |

#### **Cost-Effective Providers:**
1. **Vultr** - $5-6/month VPS, many locations
2. **DigitalOcean** - $6/month droplets, reliable
3. **Linode** - $5/month, good performance
4. **Hetzner** - $4-5/month, EU-focused
5. **OVH** - $5-8/month, global presence
6. **Contabo** - $4-5/month, budget option

---

## 💰 BUDGET: Single VPS (Cheapest, Less Privacy)

### **Option 2: All 10 Nodes on One VPS**

If budget is limited, run all nodes on a single powerful VPS.

#### **Recommended Specs:**
- **CPU**: 4 cores minimum
- **RAM**: 8GB minimum
- **Storage**: 40GB SSD
- **Bandwidth**: Unlimited or high limit
- **Cost**: $10-20/month

#### **Providers for Single VPS:**
- **Hetzner CX31** - 2 vCPU, 8GB RAM - €5.83/month (~$6)
- **Contabo VPS M** - 4 cores, 8GB RAM - $6.99/month
- **Vultr High Frequency** - 2 CPU, 4GB RAM - $12/month
- **DigitalOcean Droplet** - 4GB RAM - $24/month

#### **⚠️ Limitations:**
- ❌ All nodes share same IP (less privacy)
- ❌ Single point of failure
- ❌ No geographic diversity
- ⚠️ Good for testing, not ideal for production privacy

---

## 🚫 NOT RECOMMENDED: Render.com (Too Expensive)

### **Option 3: Render Services (10 Separate Services)**

**Cost Analysis:**
- Each Render service: $7/month
- 10 nodes × $7 = **$70/month** 💸
- Plus 1 signaling server: $7/month
- Plus 1 backend API: $7/month
- **TOTAL: $84/month** ❌

**Why NOT Recommend Render for Nodes:**
- ❌ 3x more expensive than distributed VPS
- ❌ Limited control over geographic placement
- ❌ Overkill for simple relay nodes
- ❌ Better suited for web apps, not relay network

**✅ Render IS Good For:**
- Frontend hosting (static site)
- Backend API (single service)
- NOT for 10+ relay nodes

---

## 🎯 RECOMMENDED PRODUCTION ARCHITECTURE

### **Hybrid Approach (Best Balance)**

```
┌─────────────────────────────────────────────────────────┐
│                    DEPLOYMENT LAYOUT                     │
└─────────────────────────────────────────────────────────┘

🌐 FRONTEND (Netlify or Render)
   ├─ Free tier on Netlify
   └─ $7/mo on Render

🔧 BACKEND API (Render or VPS)
   ├─ $7/mo on Render (easy)
   └─ Or include on VPS-1 (free)

📡 SIGNALING SERVER (VPS-1 or Render)
   ├─ Deploy on VPS-1 with nodes
   └─ Or $7/mo separate on Render

🔀 RELAY NODES (Distributed VPS)
   ├─ VPS-1 (US-East): bootstrap-node-1, bootstrap-node-2
   ├─ VPS-2 (US-West): bootstrap-node-3, bootstrap-node-4
   ├─ VPS-3 (EU-West): bootstrap-node-5, bootstrap-node-6
   ├─ VPS-4 (APAC):    bootstrap-node-7, bootstrap-node-8
   └─ VPS-5 (Canada):  bootstrap-node-9, bootstrap-node-10

💰 TOTAL COST: $27-35/month (nodes) + $0-14/month (frontend/backend)
   = $27-49/month total
```

---

## 📋 Step-by-Step: Deploying Distributed Nodes

### **Step 1: Choose VPS Providers**

Sign up for 5 VPS instances in different regions:

```bash
# Example locations for maximum diversity
VPS-1: New York (DigitalOcean)
VPS-2: San Francisco (Vultr)
VPS-3: London (Linode)
VPS-4: Singapore (Vultr)
VPS-5: Toronto (DigitalOcean)
```

### **Step 2: Prepare Each VPS**

SSH into each VPS and install dependencies:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="/root/.local/share/solana/install/active_release/bin:$PATH"

# Clone your repo (make sure node-keys are NOT in Git!)
git clone https://github.com/yourusername/encrypto.git
cd encrypto
npm install
```

### **Step 3: Deploy Nodes on Each VPS**

**VPS-1 (US-East) - Deploy Node 1 & 2:**

Create `ecosystem-vps1.config.js`:

```javascript
module.exports = {
  apps: [
    // Signaling Server (only on VPS-1)
    {
      name: 'signaling-server',
      script: './signaling-server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        PORT: 8080
      }
    },
    // Backend API (only on VPS-1)
    {
      name: 'backend-api',
      script: './server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        PORT: 3001,
        NODE_ENV: 'production'
      }
    },
    // Bootstrap Node 1
    {
      name: 'bootstrap-node-1',
      script: './node-client.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ID: 'bootstrap-node-1',
        NODE_REGION: 'US-East',
        KEYPAIR_PATH: './node-keys/bootstrap-node-1-keypair.json',
        SIGNALING_SERVER: 'ws://localhost:8080', // Local signaling
        RPC_URL: 'https://api.mainnet-beta.solana.com',
        STORAGE_DIR: './node-storage/node-1'
      }
    },
    // Bootstrap Node 2
    {
      name: 'bootstrap-node-2',
      script: './node-client.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ID: 'bootstrap-node-2',
        NODE_REGION: 'US-East',
        KEYPAIR_PATH: './node-keys/bootstrap-node-2-keypair.json',
        SIGNALING_SERVER: 'ws://localhost:8080',
        RPC_URL: 'https://api.mainnet-beta.solana.com',
        STORAGE_DIR: './node-storage/node-2'
      }
    }
  ]
};
```

**VPS-2 through VPS-5:**

Create similar configs with:
- No signaling server (only on VPS-1)
- No backend API (only on VPS-1)
- SIGNALING_SERVER points to VPS-1's public IP: `ws://VPS1_PUBLIC_IP:8080`
- Deploy 2 nodes per VPS

**Example for VPS-2 (US-West):**

```javascript
module.exports = {
  apps: [
    {
      name: 'bootstrap-node-3',
      script: './node-client.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ID: 'bootstrap-node-3',
        NODE_REGION: 'US-West',
        KEYPAIR_PATH: './node-keys/bootstrap-node-3-keypair.json',
        SIGNALING_SERVER: 'ws://VPS1_PUBLIC_IP:8080', // Remote signaling
        RPC_URL: 'https://api.mainnet-beta.solana.com',
        STORAGE_DIR: './node-storage/node-3'
      }
    },
    {
      name: 'bootstrap-node-4',
      script: './node-client.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ID: 'bootstrap-node-4',
        NODE_REGION: 'US-West',
        KEYPAIR_PATH: './node-keys/bootstrap-node-4-keypair.json',
        SIGNALING_SERVER: 'ws://VPS1_PUBLIC_IP:8080',
        RPC_URL: 'https://api.mainnet-beta.solana.com',
        STORAGE_DIR: './node-storage/node-4'
      }
    }
  ]
};
```

### **Step 4: Copy Keypairs Securely**

**NEVER commit keypairs to Git!** Instead, transfer them securely:

```bash
# From your local machine, copy keypairs to each VPS
# For VPS-1 (nodes 1-2):
scp node-keys/bootstrap-node-1-keypair.json root@VPS1_IP:/root/encrypto/node-keys/
scp node-keys/bootstrap-node-2-keypair.json root@VPS1_IP:/root/encrypto/node-keys/

# For VPS-2 (nodes 3-4):
scp node-keys/bootstrap-node-3-keypair.json root@VPS2_IP:/root/encrypto/node-keys/
scp node-keys/bootstrap-node-4-keypair.json root@VPS2_IP:/root/encrypto/node-keys/

# Repeat for all VPS instances...

# Set secure permissions on each VPS
ssh root@VPS1_IP "chmod 600 /root/encrypto/node-keys/*.json"
ssh root@VPS2_IP "chmod 600 /root/encrypto/node-keys/*.json"
# ...repeat for all
```

### **Step 5: Configure Firewall on VPS-1**

VPS-1 hosts the signaling server, so open port 8080:

```bash
# On VPS-1
sudo ufw allow 8080/tcp
sudo ufw allow 3001/tcp  # Backend API
sudo ufw allow 22/tcp    # SSH
sudo ufw enable
```

**Other VPS instances** only need SSH (nodes connect out to signaling server):

```bash
# On VPS-2, VPS-3, VPS-4, VPS-5
sudo ufw allow 22/tcp
sudo ufw enable
```

### **Step 6: Start Nodes on Each VPS**

```bash
# On each VPS
cd encrypto
pm2 start ecosystem-vps1.config.js  # (use appropriate config file)
pm2 save
pm2 startup

# Check status
pm2 status
pm2 logs --lines 50
```

### **Step 7: Update Frontend Configuration**

In your `index.html` or config file, point to VPS-1's signaling server:

```javascript
const SIGNALING_SERVER = 'ws://VPS1_PUBLIC_IP:8080';
const BACKEND_API = 'https://VPS1_PUBLIC_IP:3001';
```

Or use a domain name with reverse proxy (better):

```javascript
const SIGNALING_SERVER = 'wss://signal.yourproject.com';
const BACKEND_API = 'https://api.yourproject.com';
```

---

## 🔐 Security Checklist for Distributed Deployment

- [ ] Generated fresh keypairs for all 10 nodes
- [ ] Transferred keypairs securely via SCP (not Git)
- [ ] Set permissions to 600 on all keypair files
- [ ] Configured firewall on each VPS
- [ ] SSH hardening (disable root login, key-only auth)
- [ ] Minimal SOL in each node wallet (0.01-0.05 SOL)
- [ ] Separate funding wallet for topping up nodes
- [ ] Signaling server uses WSS (SSL) in production
- [ ] Backend API uses HTTPS in production
- [ ] Monitoring setup for all VPS instances

---

## 🌐 Optional: Use Domain Names (Recommended)

Instead of IP addresses, use domain names:

### **Setup:**

1. **Buy a domain** (e.g., `ghostwhistle.network`)

2. **Create DNS records:**
   - `signal.ghostwhistle.network` → VPS-1 IP
   - `api.ghostwhistle.network` → VPS-1 IP

3. **Install SSL certificates** (Let's Encrypt):

```bash
# On VPS-1, install Nginx
sudo apt install nginx certbot python3-certbot-nginx -y

# Configure reverse proxy for signaling server
sudo nano /etc/nginx/sites-available/signal

# Add:
server {
    listen 80;
    server_name signal.ghostwhistle.network;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}

# Enable and get SSL
sudo ln -s /etc/nginx/sites-available/signal /etc/nginx/sites-enabled/
sudo certbot --nginx -d signal.ghostwhistle.network
sudo systemctl restart nginx
```

4. **Update frontend** to use `wss://signal.ghostwhistle.network`

---

## 📊 Cost Comparison Summary

| Deployment Method | Monthly Cost | Privacy Level | Difficulty | Recommended |
|-------------------|--------------|---------------|------------|-------------|
| **5 VPS (Distributed)** | $25-35 | ⭐⭐⭐⭐⭐ Excellent | Medium | ✅ **YES** |
| **1 VPS (All nodes)** | $10-20 | ⭐⭐ Poor | Easy | ⚠️ Budget only |
| **Render (10 services)** | $70-84 | ⭐⭐⭐ Good | Easy | ❌ Too expensive |
| **Docker Compose (1 VPS)** | $10-20 | ⭐⭐ Poor | Easy | ⚠️ Budget only |

---

## 🚀 Quick Start Scripts

### **Deploy Script for Each VPS:**

Create `deploy-node.sh`:

```bash
#!/bin/bash

VPS_IP=$1
NODE_IDS=$2  # e.g., "1,2" for nodes 1 and 2

echo "Deploying to VPS: $VPS_IP"
echo "Node IDs: $NODE_IDS"

# Copy code
ssh root@$VPS_IP "mkdir -p /root/encrypto"
scp -r ./* root@$VPS_IP:/root/encrypto/

# Copy specific keypairs
IFS=',' read -ra NODES <<< "$NODE_IDS"
for node_id in "${NODES[@]}"; do
    echo "Copying keypair for node $node_id..."
    scp node-keys/bootstrap-node-$node_id-keypair.json root@$VPS_IP:/root/encrypto/node-keys/
done

# Setup and start
ssh root@$VPS_IP << 'EOF'
cd /root/encrypto
npm install
chmod 600 node-keys/*.json
pm2 start ecosystem-vps.config.js
pm2 save
pm2 startup
EOF

echo "✅ Deployed to $VPS_IP"
```

**Usage:**

```bash
# Deploy nodes 1,2 to VPS-1
./deploy-node.sh 1.2.3.4 "1,2"

# Deploy nodes 3,4 to VPS-2
./deploy-node.sh 5.6.7.8 "3,4"
```

---

## 🎯 Final Recommendation

**For Production Privacy Network:**

1. **Start with 5 VPS** ($25-35/month total)
   - 2 nodes per VPS
   - Different providers & regions
   - True geographic diversity

2. **Host signaling server & backend** on VPS-1 or Render
   - VPS-1 (free, included)
   - Or Render ($14/month for both)

3. **Host frontend** on Netlify (free) or Render ($7/month)

4. **Use domain names** with SSL for professional deployment

**Total Cost: $25-50/month for production-ready privacy relay network** ✨

---

## 📚 Additional Resources

- [SECURITY-GUIDE.md](./SECURITY-GUIDE.md) - Security best practices
- [PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md) - Single VPS setup
- [DOCKER-DEPLOYMENT.md](./DOCKER-DEPLOYMENT.md) - Docker setup

---

**Ready to deploy your distributed relay network!** 🚀

