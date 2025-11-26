# WHISTLE Provider Dashboard - Complete Setup Guide

This guide walks you through setting up the complete provider infrastructure:
1. **Backend API** on your validator server
2. **Cloudflare Tunnel** for secure HTTPS access
3. **Frontend Dashboard** deployed to Netlify

## Prerequisites

- Your Solana validator running on `212.108.83.86`
- Domain `whistle.ninja` on Cloudflare
- Netlify account (free tier works)

---

## Part 1: Install Backend API on Validator Server

### Step 1: Upload Files

From your local machine (in the Encrypto directory):

```bash
# Create a tarball of the API
cd providers/api
tar -czf whistle-api.tar.gz package.json server.js install.sh

# Upload to server
scp whistle-api.tar.gz root@212.108.83.86:/root/
```

### Step 2: Install on Server

SSH into your server and run:

```bash
ssh root@212.108.83.86

# Extract and install
cd /root
tar -xzf whistle-api.tar.gz
chmod +x install.sh
./install.sh
```

### Step 3: Verify Installation

```bash
# Check service status
systemctl status whistle-api

# Test endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/metrics
```

You should see JSON responses with real data from your validator.

---

## Part 2: Set Up Cloudflare Tunnel

### Step 1: Install cloudflared

On your validator server:

```bash
# Download and install
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
dpkg -i cloudflared.deb
```

### Step 2: Authenticate

```bash
cloudflared tunnel login
```

This opens a URL. Copy it, open in your browser, and authorize `whistle.ninja`.

### Step 3: Create Tunnel

```bash
# Create the tunnel
cloudflared tunnel create whistle-api

# Note the Tunnel ID shown (e.g., abc123-def456-...)
```

### Step 4: Configure Tunnel

```bash
# Create config directory
mkdir -p /etc/cloudflared

# Create config file
cat > /etc/cloudflared/config.yml << 'EOF'
tunnel: whistle-api
credentials-file: /root/.cloudflared/<YOUR-TUNNEL-ID>.json

ingress:
  - hostname: api.whistle.ninja
    service: http://localhost:3001
  - service: http_status:404
EOF
```

**Important**: Replace `<YOUR-TUNNEL-ID>` with the actual tunnel ID from step 3.

### Step 5: Create DNS Record

```bash
cloudflared tunnel route dns whistle-api api.whistle.ninja
```

### Step 6: Run as Service

```bash
# Install and start service
cloudflared service install
systemctl start cloudflared
systemctl enable cloudflared
```

### Step 7: Verify

```bash
# Test from the server
curl https://api.whistle.ninja/health

# Test from anywhere (your local machine)
curl https://api.whistle.ninja/api/metrics
```

---

## Part 3: Deploy Frontend to Netlify

### Step 1: Prepare Dashboard

From your local machine:

```bash
cd providers/dashboard

# Install dependencies
npm install

# Build for production
npm run build
```

### Step 2: Deploy to Netlify

**Option A: Netlify CLI**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=out
```

**Option B: Netlify Web UI**

1. Go to [netlify.com](https://netlify.com) and log in
2. Click "Add new site" → "Deploy manually"
3. Drag and drop the `providers/dashboard/out` folder
4. Set custom domain to `providers.whistle.ninja` (or your preferred subdomain)

### Step 3: Configure Environment

In Netlify dashboard → Site settings → Environment variables:

```
NEXT_PUBLIC_API_URL = https://api.whistle.ninja
NEXT_PUBLIC_RPC_URL = https://api.mainnet-beta.solana.com
```

### Step 4: Set Up Custom Domain

In Netlify:
1. Go to Domain settings
2. Add custom domain: `providers.whistle.ninja`
3. In Cloudflare, add CNAME record pointing to your Netlify site

---

## Part 4: Verify Everything Works

### 1. Check API

```bash
curl https://api.whistle.ninja/health
# Should return: {"status":"ok","service":"whistle-provider-api",...}

curl https://api.whistle.ninja/api/metrics
# Should return real validator metrics
```

### 2. Check Dashboard

Open `https://providers.whistle.ninja` in your browser.

You should see:
- Real-time slot and block height
- TPS and cluster nodes
- Health status from your validator
- Working wallet connect button

### 3. Test Provider Registration

1. Click "Connect Wallet" and connect Phantom
2. Fill in the registration form
3. Sign the message when prompted
4. You should see "Successfully registered as a provider!"

---

## Troubleshooting

### API Not Responding

```bash
# Check service status
systemctl status whistle-api

# Check logs
journalctl -u whistle-api -f

# Check if port is listening
netstat -tlnp | grep 3001
```

### Cloudflare Tunnel Issues

```bash
# Check tunnel status
cloudflared tunnel info whistle-api

# Check service logs
journalctl -u cloudflared -f

# Verify config
cat /etc/cloudflared/config.yml
```

### Dashboard Not Loading Data

1. Open browser developer tools (F12)
2. Check Network tab for failed requests
3. Verify `api.whistle.ninja` is accessible
4. Check for CORS errors in Console

### Validator Metrics Showing "Unknown"

```bash
# Check if validator RPC is responding
curl http://localhost:8899 -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# Check validator service
systemctl status solana-validator
```

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    providers.whistle.ninja                       │
│                         (Netlify)                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Next.js Provider Dashboard                  │    │
│  │  • Real-time metrics display                            │    │
│  │  • Wallet connect (Phantom/Solflare)                    │    │
│  │  • Provider registration                                 │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    api.whistle.ninja                             │
│                   (Cloudflare Tunnel)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Internal
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Your Validator Server                           │
│                    (212.108.83.86)                               │
│                                                                   │
│  ┌──────────────────┐         ┌──────────────────────────┐      │
│  │  WHISTLE API     │ ◄────── │   Solana Validator       │      │
│  │  :3001           │         │   :8899 (RPC)            │      │
│  │                  │         │                          │      │
│  │  • /api/metrics  │         │   solana-validator       │      │
│  │  • /api/providers│         │   1.18.22                │      │
│  │  • /rpc (proxy)  │         │                          │      │
│  └──────────────────┘         └──────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference

| Service | URL | Purpose |
|---------|-----|---------|
| Dashboard | https://providers.whistle.ninja | Provider management UI |
| API Health | https://api.whistle.ninja/health | API status check |
| Metrics | https://api.whistle.ninja/api/metrics | Real-time validator data |
| Providers | https://api.whistle.ninja/api/providers | List registered providers |

| Server Command | Purpose |
|----------------|---------|
| `systemctl status whistle-api` | Check API status |
| `systemctl restart whistle-api` | Restart API |
| `journalctl -u whistle-api -f` | View API logs |
| `systemctl status cloudflared` | Check tunnel status |
| `journalctl -u cloudflared -f` | View tunnel logs |

