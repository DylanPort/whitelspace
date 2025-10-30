# 🚀 Ghost Whistle - Production Deployment Guide

This guide covers deploying your 10 bootstrap relay nodes to production.

---

## 📋 **Table of Contents**

1. [Infrastructure Options](#infrastructure-options)
2. [Recommended Setup](#recommended-setup)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Security Hardening](#security-hardening)
5. [Monitoring & Maintenance](#monitoring--maintenance)
6. [Cost Estimates](#cost-estimates)

---

## 🏗️ **Infrastructure Options**

### **Option 1: Single VPS (Budget Option)**
- **Cost**: $10-40/month
- **Pros**: Simple, cheap, easy management
- **Cons**: Single point of failure, all nodes go down together
- **Best for**: Testing, small-scale deployment

### **Option 2: Multiple VPS (Recommended)**
- **Cost**: $50-150/month (3-5 servers)
- **Pros**: Geographic distribution, fault tolerance, better privacy
- **Cons**: More complex management
- **Best for**: Production, real privacy network

### **Option 3: Cloud Kubernetes (Advanced)**
- **Cost**: $100-300/month
- **Pros**: Auto-scaling, high availability, professional setup
- **Cons**: Complex, requires DevOps knowledge
- **Best for**: Large-scale enterprise deployment

### **Option 4: Hybrid (Smart Choice)**
- **Cost**: $60-100/month
- **Setup**: 
  - 3-4 VPS servers (different providers + locations)
  - Run 2-3 nodes per server
- **Pros**: Good balance of cost, reliability, and privacy
- **Best for**: Most production deployments

---

## ✅ **Recommended Setup (Hybrid Approach)**

### **Server Distribution:**

```
Server 1 (DigitalOcean - New York)
├─ ghost-node-1 (US-East)
├─ ghost-node-2 (US-West)
└─ ghost-node-3 (US-Central)

Server 2 (Hetzner - Germany)
├─ ghost-node-4 (EU-West)
├─ ghost-node-5 (EU-East)
└─ ghost-node-6 (Asia-Pacific)

Server 3 (Vultr - Singapore)
├─ ghost-node-7 (South-America)
├─ ghost-node-8 (Australia)

Server 4 (Linode - Canada)
├─ ghost-node-9 (Canada)
└─ ghost-node-10 (Middle-East)
```

### **Server Specifications (Per Server):**
- **CPU**: 2 vCPUs minimum
- **RAM**: 2-4 GB
- **Storage**: 25-50 GB SSD
- **Bandwidth**: 2-4 TB/month
- **OS**: Ubuntu 22.04 LTS

---

## 📝 **Step-by-Step Deployment**

### **Phase 1: Server Setup (Do this for each server)**

#### 1. **Create Server & Initial Setup**

```bash
# SSH into your new server
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Create non-root user
adduser ghostwhistle
usermod -aG sudo ghostwhistle

# Switch to new user
su - ghostwhistle
```

#### 2. **Install Required Software**

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Git
sudo apt-get install -y git

# Verify installations
node --version
npm --version
pm2 --version
```

#### 3. **Clone Your Project**

```bash
# Clone repository (use your actual repo)
git clone https://github.com/yourusername/ghost-whistle.git
cd ghost-whistle

# Install dependencies
npm install
```

#### 4. **Configure Environment Variables**

```bash
# Create .env file
nano .env
```

Add the following:

```env
# Signaling Server
SIGNALING_SERVER=wss://your-signaling-server.com

# Solana RPC (Use your own RPC endpoint for production!)
RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY

# Node Configuration
NODE_ENV=production
PORT=8080

# Supabase (for stats tracking)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-key
```

#### 5. **Transfer Node Keypairs Securely**

**⚠️ CRITICAL SECURITY STEP**

```bash
# On your local machine, create encrypted backup
cd Encrypto/node-keys
tar -czf node-keys.tar.gz *.json
openssl enc -aes-256-cbc -salt -in node-keys.tar.gz -out node-keys.tar.gz.enc

# Transfer to server (use SCP)
scp node-keys.tar.gz.enc ghostwhistle@YOUR_SERVER_IP:~/

# On the server, decrypt
cd ~/ghost-whistle
openssl enc -aes-256-cbc -d -in ~/node-keys.tar.gz.enc -out node-keys.tar.gz
tar -xzf node-keys.tar.gz
rm node-keys.tar.gz node-keys.tar.gz.enc

# Set proper permissions
chmod 600 node-keys/*.json
chmod 700 node-keys
```

---

### **Phase 2: Configure PM2 for Production**

#### 1. **Create Production Ecosystem File**

Create `ecosystem.production.js`:

```javascript
// PM2 Production Configuration
module.exports = {
  apps: [
    // Nodes for this server (example: Server 1 with 3 nodes)
    {
      name: 'ghost-node-1',
      script: './node-client.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ID: 'bootstrap-node-1',
        NODE_REGION: 'US-East',
        SIGNALING_SERVER: process.env.SIGNALING_SERVER,
        RPC_URL: process.env.RPC_URL,
        STORAGE_DIR: './node-storage/node-1'
      },
      max_memory_restart: '200M',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      error_file: './logs/node-1-error.log',
      out_file: './logs/node-1-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true
    },
    {
      name: 'ghost-node-2',
      script: './node-client.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ID: 'bootstrap-node-2',
        NODE_REGION: 'US-West',
        SIGNALING_SERVER: process.env.SIGNALING_SERVER,
        RPC_URL: process.env.RPC_URL,
        STORAGE_DIR: './node-storage/node-2'
      },
      max_memory_restart: '200M',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      error_file: './logs/node-2-error.log',
      out_file: './logs/node-2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true
    },
    {
      name: 'ghost-node-3',
      script: './node-client.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ID: 'bootstrap-node-3',
        NODE_REGION: 'US-Central',
        SIGNALING_SERVER: process.env.SIGNALING_SERVER,
        RPC_URL: process.env.RPC_URL,
        STORAGE_DIR: './node-storage/node-3'
      },
      max_memory_restart: '200M',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      error_file: './logs/node-3-error.log',
      out_file: './logs/node-3-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true
    }
  ]
};
```

#### 2. **Start Nodes**

```bash
# Create required directories
mkdir -p logs node-storage

# Start all nodes
pm2 start ecosystem.production.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it gives you (run with sudo)

# Check status
pm2 status
pm2 logs
```

---

### **Phase 3: Signaling Server Deployment**

**Option A: Deploy to Same Server as Nodes (Simple)**

```bash
# Add to ecosystem.production.js
{
  name: 'signaling-server',
  script: './signaling-server.js',
  instances: 1,
  exec_mode: 'fork',
  env: {
    PORT: 8080,
    NODE_ENV: 'production'
  },
  max_memory_restart: '500M'
}

# Restart PM2
pm2 restart all
```

**Option B: Deploy to Separate Server (Recommended)**

Use a Platform-as-a-Service:
- **Render.com** (Free tier available)
- **Railway.app** ($5-10/month)
- **Fly.io** (Free tier available)
- **Heroku** ($7/month)

Deploy steps for Render.com:
1. Push code to GitHub
2. Connect Render to your repo
3. Create new Web Service
4. Select `signaling-server.js` as entry point
5. Set environment variables
6. Deploy!

---

## 🔒 **Security Hardening**

### **1. Firewall Configuration**

```bash
# Install UFW
sudo apt-get install ufw

# Allow SSH
sudo ufw allow 22/tcp

# Allow node communication (if running signaling server)
sudo ufw allow 8080/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### **2. SSH Hardening**

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config
```

Change these settings:

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
Port 2222  # Change from default 22
```

```bash
# Restart SSH
sudo systemctl restart sshd
```

### **3. Install Fail2Ban (Brute Force Protection)**

```bash
sudo apt-get install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### **4. Secure Node Keypairs**

```bash
# Encrypt keypairs at rest
cd ~/ghost-whistle/node-keys
for file in *.json; do
  gpg --symmetric --cipher-algo AES256 "$file"
  rm "$file"  # Remove unencrypted version
done

# Update node-client.js to decrypt on load (add decryption logic)
```

### **5. Setup HTTPS for Signaling Server**

If running your own signaling server:

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## 📊 **Monitoring & Maintenance**

### **1. PM2 Monitoring Dashboard**

```bash
# Enable PM2 Plus (optional, free tier available)
pm2 link YOUR_SECRET_KEY YOUR_PUBLIC_KEY

# Or use built-in monitoring
pm2 monit
```

### **2. Setup Log Rotation**

```bash
# Install PM2 log rotate
pm2 install pm2-logrotate

# Configure rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### **3. Health Monitoring Script**

Create `health-check.sh`:

```bash
#!/bin/bash

# Check if all nodes are running
pm2 jlist | jq -r '.[] | select(.pm2_env.status != "online") | .name'

# Check disk space
df -h | grep -vE '^Filesystem|tmpfs|cdrom' | awk '{ print $5 " " $1 }' | while read output;
do
  usep=$(echo $output | awk '{ print $1}' | cut -d'%' -f1)
  partition=$(echo $output | awk '{ print $2 }')
  if [ $usep -ge 90 ]; then
    echo "WARNING: $partition is $usep% full"
  fi
done

# Check memory
free -m | awk 'NR==2{printf "Memory Usage: %.2f%%\n", $3*100/$2 }'
```

```bash
chmod +x health-check.sh

# Add to crontab (run every 5 minutes)
crontab -e
# Add: */5 * * * * /home/ghostwhistle/ghost-whistle/health-check.sh
```

### **4. Automated Backups**

Create `backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/home/ghostwhistle/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup node keys
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/node-keys-$DATE.tar.gz node-keys/
gpg --symmetric --cipher-algo AES256 $BACKUP_DIR/node-keys-$DATE.tar.gz
rm $BACKUP_DIR/node-keys-$DATE.tar.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.gpg" -mtime +7 -delete

# Optional: Upload to cloud storage (S3, Backblaze, etc)
# aws s3 cp $BACKUP_DIR/node-keys-$DATE.tar.gz.gpg s3://your-bucket/
```

```bash
chmod +x backup.sh

# Run daily at 2 AM
crontab -e
# Add: 0 2 * * * /home/ghostwhistle/ghost-whistle/backup.sh
```

### **5. Setup Alerts (Optional)**

Using **UptimeRobot** (Free):
1. Create account at uptimerobot.com
2. Add HTTP(s) monitor for signaling server
3. Add Port monitor for each server
4. Configure email/SMS alerts

---

## 💰 **Cost Estimates**

### **Budget Setup (Single VPS)**
- **DigitalOcean Droplet** (2 vCPU, 4GB RAM): $24/month
- **Domain name** (optional): $12/year
- **Total**: ~$25/month

### **Recommended Setup (4 Servers)**
- **4x VPS** ($6-12 each): $24-48/month
- **Signaling server** (Render/Railway): $5-10/month
- **Domain name**: $12/year
- **Total**: ~$35-60/month

### **Enterprise Setup**
- **10x VPS** (1 per node): $50-100/month
- **Load balancer**: $10-20/month
- **Monitoring service**: $20-50/month
- **Total**: ~$80-170/month

---

## 🚀 **Quick Deployment Commands**

### **Server 1 Setup (Copy-Paste)**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js & PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo npm install -g pm2

# Clone and setup
git clone YOUR_REPO_URL ghost-whistle
cd ghost-whistle
npm install

# Transfer keys (from local machine)
# scp -r node-keys ghostwhistle@SERVER_IP:~/ghost-whistle/

# Start nodes
mkdir -p logs node-storage
pm2 start ecosystem.production.js
pm2 save
pm2 startup

# Check status
pm2 status
pm2 logs --lines 50
```

---

## 🛠️ **Maintenance Commands**

```bash
# View logs
pm2 logs
pm2 logs ghost-node-1 --lines 100

# Restart specific node
pm2 restart ghost-node-1

# Restart all nodes
pm2 restart all

# Stop all nodes
pm2 stop all

# Update code
git pull origin main
npm install
pm2 restart all

# Check resource usage
pm2 monit

# View detailed info
pm2 describe ghost-node-1
```

---

## 🔍 **Troubleshooting**

### **Nodes won't start:**
```bash
# Check logs
pm2 logs --err

# Check if port is in use
sudo lsof -i :8080

# Check file permissions
ls -la node-keys/
```

### **Out of memory:**
```bash
# Check memory
free -m

# Increase swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### **Nodes disconnecting:**
```bash
# Check network
ping 8.8.8.8

# Check signaling server
curl YOUR_SIGNALING_SERVER

# Restart networking
sudo systemctl restart networking
```

---

## 📞 **Support & Resources**

- **PM2 Docs**: https://pm2.keymetrics.io/docs/
- **Ubuntu Server Guide**: https://ubuntu.com/server/docs
- **DigitalOcean Tutorials**: https://www.digitalocean.com/community/tutorials
- **Node.js Best Practices**: https://github.com/goldbergyoni/nodebestpractices

---

## ✅ **Production Checklist**

- [ ] Servers provisioned (3-10 servers)
- [ ] Node.js & PM2 installed on all servers
- [ ] Code deployed to all servers
- [ ] Node keypairs securely transferred
- [ ] Environment variables configured
- [ ] PM2 configured for auto-restart
- [ ] Firewall configured
- [ ] SSH hardened (no root, key-only)
- [ ] SSL certificates obtained
- [ ] Monitoring setup
- [ ] Log rotation enabled
- [ ] Automated backups configured
- [ ] Health checks running
- [ ] Signaling server deployed
- [ ] All nodes connected and running
- [ ] Test relay transaction successful
- [ ] Documentation updated

---

**🎉 Your Ghost Whistle relay network is now production-ready!**

