# 🏗️ Ghost Whistle - Hybrid Deployment Architecture

## 💡 Smart Hybrid Setup: Local + Cloud

**Best of both worlds:** Bootstrap nodes secure on your machine, public services on Render.

---

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    HYBRID ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────┘

🏠 LOCAL (Your Computer)
  ├─ Bootstrap Node 1-10  [💰 HANDLE SOL RELAY]
  └─ Cost: FREE

☁️  RENDER (Cloud)
  ├─ Signaling Server     [Connect all nodes]
  ├─ Backend API          [Public API]
  ├─ Frontend             [Public website]
  └─ User Nodes (optional) [Users run nodes, NO SOL]
  └─ Cost: $7-21/month

🔒 SECURITY: Only LOCAL bootstrap nodes handle money!
```

---

## ✅ Why This Architecture?

### **Advantages:**
✅ **Secure** - Your 10 bootstrap nodes (with wallets) stay on YOUR machine  
✅ **Cost-effective** - Only $7-21/month for public services  
✅ **Private** - Node wallets never leave your computer  
✅ **Scalable** - Users can run nodes without handling SOL  
✅ **Simple** - No VPS management, no SSH keys to deploy  
✅ **Flexible** - Turn off local nodes anytime (for testing)  

### **How It Works:**
1. **Bootstrap Nodes (Local)** = Trusted nodes that handle SOL relay transactions
2. **User Nodes (Cloud/Anyone)** = Participate in network but DON'T handle SOL
3. **Money ONLY flows through your 10 local bootstrap nodes**
4. **Public services on Render** = Professional hosting

---

## 🔒 Security Model

### **Bootstrap Nodes (Your 10 Local Nodes):**
- ✅ Have wallet keypairs
- ✅ Handle SOL relay transactions
- ✅ Execute transfers
- ✅ Claim relay fees
- ✅ ID: `bootstrap-node-1` through `bootstrap-node-10`

### **User Nodes (Anyone Can Run):**
- ❌ NO wallet keypairs
- ❌ NO SOL handling
- ✅ Participate in network
- ✅ Help with relay routing
- ✅ Earn reputation (future feature)
- ✅ ID: `user-node-*` or frontend nodes

**Critical:** Only nodes with ID `bootstrap-node-*` can handle SOL!

---

## 📋 Deployment Steps

### **STEP 1: Setup Local Bootstrap Nodes (5 minutes)**

```bash
# 1. Generate keypairs
cd node-keys
for ($i=1; $i -le 10; $i++) {
  solana-keygen new --outfile "bootstrap-node-$i-keypair.json" --no-bip39-passphrase --force
}
cd ..

# 2. Create local ecosystem config (already done - ecosystem.config.js)
# This runs: signaling-server (temporary), backend-api (temporary), and 10 nodes

# 3. Start local nodes
pm2 start ecosystem.config.js

# 4. Check status
pm2 status

# 5. Get wallet addresses
for ($i=1; $i -le 10; $i++) {
    $addr = solana-keygen pubkey "node-keys/bootstrap-node-$i-keypair.json"
    Write-Host "Node $i: $addr"
}

# 6. Fund each wallet with 0.02 SOL
solana transfer NODE_ADDRESS 0.02 --allow-unfunded-recipient
```

---

### **STEP 2: Deploy Signaling Server to Render (5 minutes)**

Create `render-signaling.yaml`:

```yaml
services:
  - type: web
    name: ghost-whistle-signaling
    env: node
    region: oregon
    plan: starter  # $7/month
    buildCommand: npm install
    startCommand: node signaling-server.js
    envVars:
      - key: PORT
        value: 8080
      - key: NODE_ENV
        value: production
      - key: ALLOWED_ORIGINS
        value: "*"
    healthCheckPath: /health
```

**Deploy:**
1. Go to https://render.com/
2. New → Web Service
3. Connect your GitHub repo
4. Use settings above
5. Deploy!

**Get your Render URL:** `https://ghost-whistle-signaling.onrender.com`

---

### **STEP 3: Deploy Backend API to Render (5 minutes)**

Create `render-backend.yaml`:

```yaml
services:
  - type: web
    name: ghost-whistle-backend
    env: node
    region: oregon
    plan: starter  # $7/month
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: PORT
        value: 3001
      - key: NODE_ENV
        value: production
      - key: SUPABASE_URL
        sync: false  # Add manually
      - key: SUPABASE_KEY
        sync: false  # Add manually
      - key: RPC_URL
        value: https://api.mainnet-beta.solana.com
    healthCheckPath: /health
```

**Deploy:** Same as signaling server

**Get your Render URL:** `https://ghost-whistle-backend.onrender.com`

---

### **STEP 4: Update Local Nodes to Connect to Render Signaling**

Edit `ecosystem.config.js` - change the SIGNALING_SERVER for all nodes:

```javascript
// Find all nodes and update:
SIGNALING_SERVER: 'wss://ghost-whistle-signaling.onrender.com'
// Instead of: 'ws://localhost:8080'
```

Then restart:
```bash
pm2 restart all
```

Now your local nodes connect to the public Render signaling server!

---

### **STEP 5: Deploy Frontend to Netlify/Render**

**Option A: Netlify (Recommended - FREE)**

1. Push code to GitHub (make sure node-keys/ is in .gitignore!)
2. Go to https://netlify.com/
3. New Site from Git → Select your repo
4. Build settings:
   - Build command: (leave empty)
   - Publish directory: `.`
5. Environment variables:
   ```
   SIGNALING_SERVER=wss://ghost-whistle-signaling.onrender.com
   BACKEND_API=https://ghost-whistle-backend.onrender.com
   ```
6. Deploy!

**Option B: Render**

Create `render-frontend.yaml`:
```yaml
services:
  - type: static
    name: ghost-whistle-frontend
    buildCommand: echo "Static site"
    staticPublishPath: .
    envVars:
      - key: SIGNALING_SERVER
        value: wss://ghost-whistle-signaling.onrender.com
      - key: BACKEND_API
        value: https://ghost-whistle-backend.onrender.com
```

---

### **STEP 6: Update Frontend Configuration**

In `index.html`, find the signaling server configuration and update:

```javascript
// Around line 20500
const SIGNALING_SERVER_URL = 'wss://ghost-whistle-signaling.onrender.com';
const BACKEND_API_URL = 'https://ghost-whistle-backend.onrender.com';
```

---

## 🔐 Critical: Bootstrap-Only SOL Handling

Update `node-client.js` to ensure ONLY bootstrap nodes handle SOL:

```javascript
// At the top of node-client.js
const IS_BOOTSTRAP_NODE = NODE_ID && NODE_ID.startsWith('bootstrap-node-');

// In handleRelayRequest function
async function handleRelayRequest(message) {
  console.log(`\n📩 Relay request received...`);
  
  // CRITICAL: Only bootstrap nodes can handle SOL
  if (!IS_BOOTSTRAP_NODE) {
    console.log(`⚠️  Not a bootstrap node - cannot handle SOL relay`);
    return;
  }
  
  // ... rest of relay logic
}
```

This ensures user nodes can't handle transactions even if someone tries to route SOL through them.

---

## 🧑‍💻 Optional: Let Users Run Nodes

Users can run their own nodes (without wallets) to participate:

### **User Node on Render:**

```yaml
services:
  - type: web
    name: ghost-whistle-user-node
    env: node
    region: oregon
    plan: starter
    buildCommand: npm install
    startCommand: node user-node-client.js
    envVars:
      - key: NODE_ID
        generateValue: true  # Random ID
      - key: NODE_REGION
        value: Cloud-User
      - key: SIGNALING_SERVER
        value: wss://ghost-whistle-signaling.onrender.com
      - key: RPC_URL
        value: https://api.mainnet-beta.solana.com
```

### **Create `user-node-client.js`:**

```javascript
// Same as node-client.js but WITHOUT wallet features
const IS_USER_NODE = true;
const HAS_WALLET = false;

// Skip all wallet/SOL handling
// Only participate in network routing
// Can earn reputation points
```

---

## 💰 Cost Breakdown

```
LOCAL (Your Computer):
  └─ 10 Bootstrap Nodes         FREE
  └─ Keep computer running       FREE

RENDER:
  ├─ Signaling Server            $7/month
  ├─ Backend API                 $7/month
  └─ (Optional) User Node        $7/month
                                 ──────────
SUBTOTAL:                        $14-21/month

NETLIFY:
  └─ Frontend                    FREE

TOTAL:                           $14-21/month
```

**vs. Full VPS deployment:** $30/month  
**Savings:** ~$10/month + More secure!

---

## 🔄 Daily Workflow

### **Start Your Day:**
```bash
# Check local nodes are running
pm2 status

# If not running:
pm2 start ecosystem.config.js

# View logs
pm2 logs --lines 50
```

### **Keep Nodes Running:**
```bash
# Auto-start on boot (optional)
pm2 save
pm2 startup
```

### **Maintenance:**
```bash
# Check node balances
for ($i=1; $i -le 10; $i++) {
    $addr = solana-keygen pubkey "node-keys/bootstrap-node-$i-keypair.json"
    $bal = solana balance $addr
    Write-Host "Node $i: $bal"
}

# Refill if needed
solana transfer NODE_ADDRESS 0.02 --allow-unfunded-recipient
```

---

## 🌐 Network Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   PUBLIC INTERNET                         │
└──────────────────────────────────────────────────────────┘
                           │
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
    [Frontend]                          [Backend API]
   Netlify (Free)                     Render ($7/mo)
        │                                     │
        └──────────────┬──────────────────────┘
                       │
                 [Signaling Server]
                 Render ($7/mo)
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   [User Nodes]   [Your Local]   [More Users]
   (optional)      Computer       (optional)
                       │
            ┌──────────┴──────────┐
            │   Bootstrap Nodes   │
            │   1-10 (💰 SOL)    │
            │   Local PM2         │
            └─────────────────────┘
```

**Key Points:**
- ☁️  Public services on Render (signaling, backend)
- 🏠 Bootstrap nodes on your local machine
- 💰 SOL only flows through local bootstrap nodes
- 🌍 Users connect from anywhere
- 🔒 Wallets never leave your computer

---

## 🚀 Deployment Commands Summary

```bash
# 1. LOCAL: Start bootstrap nodes
pm2 start ecosystem.config.js

# 2. RENDER: Deploy signaling server
# (via Render dashboard + GitHub)

# 3. RENDER: Deploy backend API
# (via Render dashboard + GitHub)

# 4. NETLIFY: Deploy frontend
# (via Netlify dashboard + GitHub)

# 5. LOCAL: Update ecosystem.config.js with Render signaling URL
# Change: SIGNALING_SERVER: 'wss://your-signaling.onrender.com'

# 6. LOCAL: Restart nodes
pm2 restart all

# DONE! ✅
```

---

## 🧪 Testing the Setup

### **1. Test Signaling Server:**
```bash
curl https://ghost-whistle-signaling.onrender.com/health
# Should return: {"status":"ok","connections":10}
```

### **2. Test Backend API:**
```bash
curl https://ghost-whistle-backend.onrender.com/health
# Should return: {"status":"ok"}
```

### **3. Test Local Nodes:**
```bash
pm2 status
# Should show all 10 nodes "online"

pm2 logs --lines 50
# Should see "Connected to signaling server"
```

### **4. Test Frontend:**
- Open your Netlify URL
- Connect wallet
- Try sending 0.01 SOL anonymously
- Check PM2 logs locally to see relay happening!

---

## 🔒 Security Checklist

- [ ] node-keys/ is in .gitignore
- [ ] Never committed keypairs to Git
- [ ] Only bootstrap nodes have KEYPAIR_PATH in config
- [ ] User nodes (if any) have NO keypair access
- [ ] Local computer has firewall enabled
- [ ] Render services use HTTPS/WSS only
- [ ] Environment variables used for secrets
- [ ] Bootstrap nodes only accessible from your computer

---

## 📈 Scaling Options

### **Option 1: Add More Local Bootstrap Nodes**
- Generate more keypairs
- Add to ecosystem.config.js
- More relay capacity

### **Option 2: Add User Nodes on Render**
- Let community run nodes
- They earn reputation
- Network grows
- You still control SOL flow

### **Option 3: Hybrid VPS + Local**
- Critical bootstrap nodes: Local
- Extra bootstrap nodes: VPS (if you want 24/7)
- User nodes: Render
- Public services: Render

---

## 🎯 Best Practices

1. **Keep local computer running during business hours**
2. **Monitor node balances weekly**
3. **Backup node-keys/ (encrypted) regularly**
4. **Check Render logs for issues**
5. **Update frontend with new features**
6. **Let users know when nodes are offline**

---

## 💡 Future Enhancements

- Auto-refill node wallets when low
- Desktop app to run bootstrap nodes (Electron)
- Mobile notifications for node status
- Dashboard to monitor all nodes
- User node marketplace
- Reputation system for user nodes

---

## 🎉 Summary

**Your Hybrid Architecture:**

✅ **10 Bootstrap Nodes** - Local (handle SOL)  
✅ **Signaling Server** - Render ($7/mo)  
✅ **Backend API** - Render ($7/mo)  
✅ **Frontend** - Netlify (FREE)  
✅ **User Nodes** - Optional (Render $7/mo each)  

**Total Cost: $14-21/month**  
**Security: Maximum** (wallets on your machine)  
**Scalability: High** (users can run nodes)  
**Flexibility: Perfect** (turn off anytime)  

---

**Ready to deploy? Let's start!** 🚀

