# 🚀 Quick Start - Deploy Your Own Decentralized RPC

## What You're Building

A **completely independent** Solana RPC endpoint that:
- Runs YOUR own validator
- NO reliance on Helius/Alchemy/centralized RPCs
- YOU earn 70% of all fees
- Users pay in WHISTLE tokens

---

## 📋 Prerequisites

- Hetzner server (or similar): 192GB RAM, 3TB+ storage
- Domain name (optional): `rpc.yourdomain.com`
- Email for SSL
- 30 minutes of your time

---

## 🏁 One-Command Installation

### Step 1: SSH into your server

```bash
ssh root@152.53.130.177
```

### Step 2: Run the installer

```bash
curl -sSL https://raw.githubusercontent.com/YOUR_REPO/main/whistlenet/deploy-hetzner-complete.sh | bash
```

**OR** copy the script manually:

```bash
# Download from your repo
wget https://raw.githubusercontent.com/YOUR_REPO/main/whistlenet/deploy-hetzner-complete.sh

# Make executable
chmod +x deploy-hetzner-complete.sh

# Run it
./deploy-hetzner-complete.sh
```

### Step 3: Answer the prompts

```
Enter your domain: rpc.yourdomain.com
Enter email for SSL: you@email.com
Continue with full node? yes
```

### Step 4: Wait for installation (10-15 minutes)

The script will:
- ✅ Install Solana validator
- ✅ Setup PostgreSQL database
- ✅ Deploy custom API
- ✅ Configure Nginx
- ✅ Install monitoring
- ✅ Setup heartbeat agent
- ✅ Get SSL certificate

---

## ⏳ Blockchain Sync (1-3 Days)

Your Solana node needs to sync the entire blockchain. This takes 1-3 days.

**Monitor sync progress:**

```bash
# Watch logs
journalctl -u solana-validator -f

# Check catchup status
su - solana -c 'solana catchup /home/solana/validator-keypair.json --our-localhost'
```

**While syncing, your custom API is already LIVE!** It just forwards to public RPC temporarily.

---

## ✅ Test Your Endpoints

Once installed (even before full sync):

```bash
# Health check
curl http://152.53.130.177/api/health

# Get balance
curl http://152.53.130.177/api/balance/YOUR_WALLET_ADDRESS

# RPC call
curl -X POST http://152.53.130.177/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

With domain:

```bash
curl https://rpc.yourdomain.com/api/health
curl https://rpc.yourdomain.com/api/stats
```

---

## 📊 Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/balance/:address` | GET | Get SOL balance |
| `/api/account/:address` | GET | Get account info |
| `/api/transactions/:address` | GET | Get recent transactions |
| `/api/transaction/:sig` | GET | Get single transaction |
| `/api/stats` | GET | Provider statistics |
| `/metrics` | GET | Prometheus metrics |
| `/rpc` | POST | Standard Solana RPC proxy |
| `/` | POST | Standard RPC (root path) |

---

## 🔧 Manage Your Server

### Check Services

```bash
# All services
systemctl status whistle-api
systemctl status solana-validator
systemctl status postgresql
systemctl status nginx
systemctl status whistle-heartbeat

# Quick check all
systemctl | grep -E 'whistle|solana|postgresql|nginx'
```

### View Logs

```bash
# API logs
journalctl -u whistle-api -f

# Solana logs
journalctl -u solana-validator -f

# Heartbeat logs
journalctl -u whistle-heartbeat -f

# Nginx access logs
tail -f /var/log/nginx/access.log
```

### Restart Services

```bash
systemctl restart whistle-api
systemctl restart solana-validator
systemctl restart whistle-heartbeat
```

---

## 💰 Register as Provider & Start Earning

Once your node is synced and tested:

1. **Go to WHISTLE dashboard**: `https://dashboard.whistlenet.io`
2. **Navigate to Providers page**
3. **Click "REGISTER AS PROVIDER"**
4. **Enter your RPC endpoint**: `https://rpc.yourdomain.com`
5. **Bond WHISTLE tokens**: 1,000+ WHISTLE required
6. **Start earning 70% of all fees!** 💰

---

## 🎯 What Happens After Registration

1. ✅ Your endpoint appears in the provider list
2. ✅ Users can select your RPC
3. ✅ They pay WHISTLE tokens to use it
4. ✅ You earn 70% automatically
5. ✅ Heartbeat reports your uptime
6. ✅ Your reputation increases
7. ✅ More users = more earnings

---

## 📈 Performance Monitoring

View your stats:

```bash
# Provider stats
curl http://localhost:8080/api/stats

# Prometheus metrics
curl http://localhost:8080/metrics

# Database stats
sudo -u postgres psql -d whistle_rpc -c "SELECT * FROM provider_stats;"
```

**Grafana dashboard** (if installed):
- URL: `http://152.53.130.177:3000`
- Login: `admin` / `admin`

---

## 🔥 Advanced Configuration

### Change Database Password

```bash
# Edit API config
nano /opt/whistle-api/server.js

# Change this line:
password: 'whistle_secure_password_change_me',

# Restart API
systemctl restart whistle-api
```

### Add Custom Endpoints

```bash
# Edit API server
nano /opt/whistle-api/server.js

# Add new routes:
app.get('/api/custom-feature', async (req, res) => {
  // Your custom logic
  res.json({ data: 'custom response' });
});

# Restart
systemctl restart whistle-api
```

### Scale Up Storage

If you run out of space:

```bash
# Add new disk (via Hetzner control panel)
# Mount it
mkdir -p /mnt/solana-data2
mount /dev/sdb1 /mnt/solana-data2

# Move accounts to new disk
systemctl stop solana-validator
mv /mnt/solana-data/accounts /mnt/solana-data2/
ln -s /mnt/solana-data2/accounts /mnt/solana-data/accounts
systemctl start solana-validator
```

---

## 🛠️ Troubleshooting

### API Won't Start

```bash
# Check logs
journalctl -u whistle-api -n 50

# Test manually
cd /opt/whistle-api
node server.js

# Check PostgreSQL
systemctl status postgresql
```

### Solana Won't Sync

```bash
# Check logs
journalctl -u solana-validator -n 100

# Check disk space
df -h

# Check if catching up
su - solana -c 'solana catchup /home/solana/validator-keypair.json --our-localhost'
```

### Nginx 502 Error

```bash
# Check if API is running
systemctl status whistle-api

# Check Nginx config
nginx -t

# Restart Nginx
systemctl restart nginx
```

### Database Connection Failed

```bash
# Check PostgreSQL
systemctl status postgresql

# Test connection
psql -U whistle -d whistle_rpc -h localhost

# Check password in API config
grep password /opt/whistle-api/server.js
```

---

## 🎉 You're Done!

Your decentralized RPC provider is running!

**Next steps:**
1. ⏳ Wait for blockchain sync (1-3 days)
2. ✅ Test all endpoints
3. 💰 Register as provider
4. 📢 Market your RPC to developers
5. 💸 Earn passive income!

---

## 📚 Additional Resources

- [Full Architecture Guide](./DECENTRALIZED_RPC_GUIDE.md)
- [WHISTLE Docs](https://docs.whistlenet.io)
- [Discord Support](https://discord.gg/whistle)
- [GitHub Issues](https://github.com/YOUR_REPO/issues)

---

## 🔐 Security Notes

- ✅ UFW firewall configured
- ✅ SSL/TLS enabled
- ✅ Rate limiting active
- ✅ Private RPC mode enabled
- ✅ Fail2ban installed

**Backup your keypairs:**
```bash
scp root@152.53.130.177:/home/solana/*.json ./backups/
```

---

**Need help?** Open an issue or join our Discord! 🚀



