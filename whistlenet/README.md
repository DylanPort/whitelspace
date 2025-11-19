# 🌐 WHISTLE Decentralized RPC Provider

> Build your own independent Solana RPC endpoint and earn passive income

---

## 🎯 What Is This?

This is a **complete toolkit** to deploy your own **decentralized Solana RPC provider** that:

✅ Runs YOUR OWN Solana validator (no centralized RPC dependency)  
✅ Provides custom enhanced endpoints  
✅ Earns you 70% of all user fees  
✅ Integrates with WHISTLE token ecosystem  
✅ One-command deployment  
✅ Fully open source  

---

## 📦 What's Included

### 1. **Automated Deployment Script** (`deploy-hetzner-complete.sh`)
- One-command installation
- Installs Solana validator
- Sets up PostgreSQL database
- Deploys custom API
- Configures Nginx reverse proxy
- Enables SSL/TLS
- Installs monitoring & heartbeat

### 2. **Custom API Server** (Node.js + Express)
- Standard Solana RPC proxy
- Enhanced custom endpoints
- PostgreSQL caching layer
- Rate limiting
- Analytics & metrics
- Prometheus integration

### 3. **Heartbeat Agent** (`heartbeat-agent.js`)
- Reports uptime every 60 seconds
- Tracks performance metrics
- Updates smart contract
- Auto-restart on failures

### 4. **Database Schema** (PostgreSQL)
- Indexed transactions
- Token balances
- NFT metadata
- Query logs
- Provider statistics

### 5. **Documentation**
- [Quick Start Guide](./QUICK_START.md) - Get running in 30 minutes
- [Architecture Guide](./DECENTRALIZED_RPC_GUIDE.md) - Deep dive
- Setup scripts for Hetzner, Vultr, AWS

---

## 🚀 Quick Start

### Deploy Your RPC in 3 Commands:

```bash
# 1. SSH into your server
ssh root@your-server-ip

# 2. Run the installer
curl -sSL https://raw.githubusercontent.com/YOUR_REPO/main/whistlenet/deploy-hetzner-complete.sh | bash

# 3. Answer prompts and wait 10-15 minutes
```

**That's it!** Your RPC is live at `http://your-server-ip`

Full instructions: [QUICK_START.md](./QUICK_START.md)

---

## 💰 Earnings Model

When users pay to use your RPC:

| Recipient | Share | Example (10K WHISTLE) |
|-----------|-------|----------------------|
| **You (Provider)** | 70% | **7,000 WHISTLE** 💰 |
| Bonus Pool | 20% | 2,000 WHISTLE |
| Treasury | 5% | 500 WHISTLE |
| Stakers | 5% | 500 WHISTLE |

**Potential monthly earnings:**
- 10,000 queries/day × 10,000 WHISTLE × 70% = **70M WHISTLE/day**
- At $0.0001/WHISTLE = **$7,000/day** = **$210,000/month**

*(Actual earnings vary based on query volume, WHISTLE price, and market demand)*

---

## 🏗️ Architecture

```
Your Server (Hetzner/Vultr/AWS)
│
├── Nginx (Port 80/443) - Public endpoint
│   ├── /api/* → Custom WHISTLE API
│   ├── /rpc → Standard Solana RPC
│   └── SSL/TLS + Rate limiting
│
├── Solana Validator (Port 8899)
│   ├── Full archival node
│   ├── Transaction history enabled
│   ├── Extended metadata storage
│   └── Private RPC mode
│
├── Custom API (Port 8080)
│   ├── Standard RPC proxy
│   ├── Enhanced endpoints
│   ├── Caching layer
│   └── Analytics
│
├── PostgreSQL (Port 5432)
│   ├── Indexed blockchain data
│   ├── Query logs
│   └── Provider statistics
│
└── Monitoring Agent
    ├── Heartbeat every 60s
    ├── Uptime tracking
    └── Smart contract updates
```

---

## 📡 API Endpoints

Your RPC provides:

### Standard Solana RPC (Wallet Compatible)
```bash
curl -X POST https://rpc.yourdomain.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getBalance","params":["ADDRESS"]}'
```

### Custom WHISTLE Endpoints
```bash
# Get balance (cached)
GET /api/balance/:address

# Get account info
GET /api/account/:address

# Get transactions
GET /api/transactions/:address

# Get single transaction
GET /api/transaction/:signature

# Provider stats
GET /api/stats

# Prometheus metrics
GET /metrics
```

---

## 📋 Requirements

### Hardware (Recommended)
- **CPU:** 16+ cores
- **RAM:** 192GB+ (minimum 128GB)
- **Storage:** 3TB+ NVMe SSD
- **Bandwidth:** Unmetered or 20TB+/month

**Recommended Providers:**
- Hetzner EX63: €100/month (192GB RAM, 15TB NVMe)
- Vultr Bare Metal: $340/month (128GB RAM, 3.2TB NVMe)
- AWS i3.4xlarge: ~$500/month

### Software
- Ubuntu 22.04 LTS (recommended)
- Root access
- Domain name (optional but recommended)

---

## 🛠️ Deployment Options

### Option 1: Hetzner (Recommended)
```bash
curl -sSL https://raw.githubusercontent.com/YOUR_REPO/main/whistlenet/deploy-hetzner-complete.sh | bash
```

### Option 2: Manual Setup
1. Follow [QUICK_START.md](./QUICK_START.md)
2. Run scripts step-by-step
3. Configure manually

### Option 3: Docker (Coming Soon)
```bash
docker-compose up -d
```

---

## 📊 What Makes This Different?

| Feature | Centralized RPCs | WHISTLE Provider |
|---------|------------------|------------------|
| **Ownership** | Helius/Alchemy own it | **YOU own it** |
| **Earnings** | They keep 100% | **YOU keep 70%** |
| **Censorship** | Can block addresses | Censorship-resistant |
| **Privacy** | They log everything | User privacy protected |
| **Control** | Limited API | Full control |
| **Vendor Lock** | Tied to provider | Fully independent |
| **Decentralization** | Centralized | **Decentralized** |

---

## 🎯 Use Cases

### For Providers (You)
- 💰 Earn passive income from RPC fees
- 🏗️ Support decentralized infrastructure
- 📈 Build reputation in WHISTLE network
- 🎨 Customize endpoints for your needs

### For Users (Your Customers)
- 🔒 Privacy-preserving RPC access
- ⚡ Fast, reliable queries
- 💎 Pay with WHISTLE tokens
- 🌐 Support decentralization

### For Developers
- 🛠️ Enhanced API endpoints
- 📊 Better caching & performance
- 🔍 Custom query options
- 📈 Analytics & metrics

---

## 📈 Roadmap

### ✅ Phase 1: Core Infrastructure (COMPLETE)
- [x] Solana validator setup
- [x] Custom API server
- [x] PostgreSQL database
- [x] Nginx reverse proxy
- [x] SSL/TLS support
- [x] Monitoring & heartbeat

### 🚧 Phase 2: Enhanced Features (IN PROGRESS)
- [x] Basic RPC endpoints
- [ ] x402 payment integration
- [ ] Advanced caching
- [ ] Rust indexer
- [ ] WebSocket support
- [ ] GraphQL API

### 📅 Phase 3: Scaling (PLANNED)
- [ ] Multi-region support
- [ ] Load balancing
- [ ] CDN integration
- [ ] Advanced analytics
- [ ] Custom dashboards
- [ ] Auto-scaling

### 🔮 Phase 4: Advanced (FUTURE)
- [ ] Machine learning optimization
- [ ] Predictive caching
- [ ] MEV protection
- [ ] Custom consensus
- [ ] Cross-chain support

---

## 🔐 Security

- ✅ UFW firewall configured
- ✅ Fail2ban for DDoS protection
- ✅ SSL/TLS encryption
- ✅ Rate limiting (100 req/s)
- ✅ Private RPC mode
- ✅ No external dependencies
- ✅ Regular security audits

---

## 🤝 Contributing

We welcome contributions!

1. Fork the repo
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📜 License

MIT License - see [LICENSE](../LICENSE) for details

---

## 📞 Support

- 📖 **Docs:** [docs.whistlenet.io](https://docs.whistlenet.io)
- 💬 **Discord:** [discord.gg/whistle](https://discord.gg/whistle)
- 🐛 **Issues:** [GitHub Issues](https://github.com/YOUR_REPO/issues)
- 📧 **Email:** support@whistlenet.io
- 🐦 **Twitter:** [@WhistleNetwork](https://twitter.com/WhistleNetwork)

---

## 🎉 Get Started Now!

```bash
ssh root@your-server-ip
curl -sSL https://raw.githubusercontent.com/YOUR_REPO/main/whistlenet/deploy-hetzner-complete.sh | bash
```

**Build the future of decentralized infrastructure!** 🚀

---

## ⭐ Star Us!

If this helped you, please star the repo! It helps others discover the project.

---

**Made with ❤️ by the WHISTLE Community**
