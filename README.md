# 🛰️ WHISTLE — Decentralized RPC Infrastructure for Solana

> **"The world's first community-owned RPC network. Run a node, earn rewards, own the infrastructure."**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Solana](https://img.shields.io/badge/Solana-Mainnet-green)](https://solana.com)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.16-brightgreen)](https://nodejs.org/)
[![Live RPC](https://img.shields.io/badge/RPC-Live-success)](https://rpc.whistle.ninja)

---

## 🎯 What is WHISTLE?

**WHISTLE is a decentralized RPC provider network** that lets anyone earn SOL by serving Solana blockchain data. We're solving the RPC centralization problem by creating a community-owned alternative to Helius, QuickNode, and Alchemy.

### The Problem We're Solving
- 🔴 **Centralized control**: 3 companies control 80%+ of Solana RPC access
- 🔴 **High costs**: $50-$5000/month for decent RPC performance  
- 🔴 **Vendor lock-in**: Projects become dependent on single providers
- 🔴 **No ownership**: Community has zero say in infrastructure decisions

### The WHISTLE Solution
- ✅ **Anyone can provide**: Run a cache node and earn 70% of query fees
- ✅ **Stake to earn**: Hold $WHISTLE, earn 5% of all network fees
- ✅ **Community owned**: Stakers govern network parameters
- ✅ **Economically sustainable**: Profitable for operators at $6/month VPS cost

---

## 📊 Current Status: PHASE 1 BETA

| Component | Status | Description |
|-----------|--------|-------------|
| 🟢 Smart Contract | **LIVE** | Payment distribution, staking, provider registration |
| 🟢 RPC Endpoint | **LIVE** | `https://rpc.whistle.ninja` serving mainnet |
| 🟢 Cache Node | **READY** | Windows/Mac/Linux installers available |
| 🟢 Provider Dashboard | **LIVE** | Track earnings, monitor nodes |
| 🟡 Coordinator | **IN PROGRESS** | Load balancer & health monitoring |
| 🟡 Community Nodes | **LAUNCHING** | Seeking first 10-20 operators |

**We're ready for beta node operators!** Join [Telegram](https://t.me/whistleninja) to get early access.

---

## 💰 Economics: How Everyone Earns

### For Cache Node Operators
**What you do**: Run a small server that caches popular RPC requests  
**Investment**: $6/month VPS or use your own computer  
**Requirements**: 10,000 $WHISTLE staked (can borrow/pool)  
**Earnings**: **70% of query fees** from your node  

**Real Numbers**:
- Query cost: 0.0001 SOL per query
- 1,000 queries/day = **0.07 SOL/day** (after 70% split)
- 10,000 queries/day = **0.7 SOL/day** (after 70% split)
- 50,000 queries/day = **3.5 SOL/day** (after 70% split)

*Earnings depend on network usage, query volume, and SOL price.*

### For Full Node Operators
**What you do**: Run a complete Solana validator + indexer  
**Investment**: $200+/month dedicated server (256GB RAM)  
**Requirements**: 100,000 $WHISTLE staked  
**Earnings**: **70% of ALL queries** routed to your node (cache + non-cache)

**Real Numbers**:
- Serve 100,000+ queries/day
- Earnings: **70 SOL/day** (7M queries at 0.0001 SOL each)
- Suitable for professional operations

### For Stakers (Passive Income)
**What you do**: Hold $WHISTLE, stake it, earn automatically  
**Investment**: Any amount of $WHISTLE  
**Earnings**: 
- **5% of all RPC query fees** (distributed by stake weight)
- **90% of x402 premium payments**
- **Share of bonus pool** based on your stake

**Real Numbers** (example: 1M $WHISTLE staked, 1M queries/day):
- Network earns: 100 SOL/day total from queries
- Stakers get: 5 SOL/day distributed by weight
- Your 1M stake (if 1% of pool) = **0.05 SOL/day passive income**

*Actual earnings vary based on network usage, your stake percentage, and query volume.*

---

## 🚀 Quick Start: Become a Provider

### Step 1: Get $WHISTLE
```
Buy on Jupiter/Raydium
Token: 6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump
Min: 10,000 $WHISTLE for cache node
```

### Step 2: Stake Your Tokens
```
1. Visit https://whistle.ninja
2. Connect wallet
3. Stake 10,000+ $WHISTLE
4. You're now eligible to run a node
```

### Step 3: Run Your Cache Node

**Windows**:
```powershell
# Run this in PowerShell
iwr -useb https://whistle.ninja/install-windows.ps1 | iex
```

**Mac/Linux**:
```bash
# Run this in terminal
curl -sSL https://whistle.ninja/install.sh | bash
```

**Docker (Manual)**:
```bash
docker run -d \
  --name whistle-cache \
  -e WALLET_ADDRESS=YourSolanaWallet \
  -e LOCATION="City, Country" \
  -p 8545:8545 \
  --restart unless-stopped \
  whistlenet/cache-node:latest
```

### Step 4: Monitor & Earn
```
1. Dashboard: https://whistle.ninja/providers
2. Watch your cache hits increase
3. See earnings accumulate in real-time
4. Claim rewards anytime (no lock-up)
```

---

## 🏗️ Full Architecture

```
┌─────────────────────────────────────────────────────┐
│                  USERS & DAPPS                       │
│  (Wallets, Trading Bots, Analytics Tools, etc.)     │
└────────────────────┬────────────────────────────────┘
                     │ RPC Requests
                     │
┌────────────────────▼────────────────────────────────┐
│          RPC ROUTER & LOAD BALANCER                 │
│  • Health monitoring (30s heartbeats)                │
│  • Geographic routing (lowest latency)               │
│  • Automatic failover                                │
│  • DDoS protection                                   │
│  • Rate limiting (except *.whistle.ninja)            │
└───┬─────────────┬──────────────┬────────────────────┘
    │             │              │
    │             │              │
┌───▼──────┐ ┌───▼──────┐ ┌────▼──────┐ ┌──────────┐
│  CACHE   │ │  CACHE   │ │   FULL    │ │  CACHE   │
│  NODE #1 │ │  NODE #2 │ │  NODE #1  │ │  NODE #3 │
│          │ │          │ │           │ │          │
│ $6 VPS   │ │ Home PC  │ │ $200 Srv  │ │ $6 VPS   │
│ NYC, US  │ │ London   │ │ Tokyo     │ │ Berlin   │
└────┬─────┘ └────┬─────┘ └─────┬─────┘ └────┬─────┘
     │            │              │            │
     │            │ Cache Miss   │            │
     └────────────┴──────┬───────┴────────────┘
                         │
                ┌────────▼─────────┐
                │  RPC AGGREGATOR  │
                │  • Helius        │
                │  • QuickNode     │
                │  • Alchemy       │
                │  • Self-hosted   │
                └────────┬─────────┘
                         │
                ┌────────▼─────────┐
                │  SOLANA MAINNET  │
                └──────────────────┘

┌─────────────────────────────────────────────────────┐
│         SMART CONTRACT (On-Chain Logic)              │
│  • Provider registration & deregistration            │
│  • Cache hit tracking & metrics                      │
│  • Payment distribution (70/20/5/5)                  │
│  • Reputation & slashing                             │
│  • Staking pool & rewards                            │
└─────────────────────────────────────────────────────┘
```

---

## 🧠 Key Components

### 1. Smart Contract (`whistlenet/contract/src/lib.rs`)
**Program ID**: `whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr`

**Core Instructions**:
```rust
// Provider Lifecycle
register_provider(bond, endpoint, location)
register_cache_node(wallet, endpoint, location) 
deregister_provider()
update_endpoint(new_url)
record_heartbeat()

// Metrics & Payments
record_cache_hit()
submit_metrics_batch(cache_hits, uptime)
process_query_payment(amount) // 70/20/5/5 split
claim_provider_earnings()
distribute_bonus_pool() // Top 20% performers

// Staking
stake(amount)
unstake(amount)
claim_staker_rewards()

// Reputation & Slashing
update_reputation_metrics(uptime, response_time)
slash_provider(violation_type, amount)
```

### 2. Cache Node (`whistlenet/cache-node/src/`)
**Purpose**: Lightweight RPC proxy with caching

**Architecture**:
```typescript
Express HTTP Server (port 8545)
├─ POST / → Main RPC endpoint
├─ POST /batch → Batch requests
├─ GET /health → Health check
├─ GET /metrics → Prometheus metrics
└─ GET /cache/stats → Cache statistics

In-Memory Cache (node-cache)
├─ TTL-based expiration
├─ Method-specific cache times
├─ LRU eviction policy
└─ 256MB default size

WebSocket to Coordinator
├─ Node registration
├─ Heartbeat (every 30s)
├─ Metrics reporting
└─ Task assignment

Contract Integration
├─ Initialize on startup
├─ Report cache hits every 100 queries
├─ Calculate earnings per hit
└─ Submit batched metrics
```

**Cache Strategy**:
```
Static data (15min):      Block data, program accounts
Semi-static (5min):       Token metadata, account info
Dynamic (30s):            Balances, latest blockhash
Real-time (no cache):     Transaction status, signatures
```

### 3. Coordinator (`whistlenet/coordinator/src/`)
**Purpose**: Central load balancer and health monitor

**Responsibilities**:
- Track all active nodes (cache + full)
- Monitor health (ping every 30s, timeout after 60s)
- Route requests based on:
  - Cache availability (check cache nodes first)
  - Geographic proximity (lowest latency)
  - Node reputation (favor high-performing nodes)
  - Load balancing (distribute evenly)
- Handle failover (retry on failed nodes)
- Aggregate network metrics

### 4. Provider Dashboard (`whistle-dashboard/`)
**Purpose**: Real-time monitoring for node operators

**Features**:
- Node status (online/offline/syncing)
- Earnings tracker (today/week/month/total)
- Cache hit rate & performance graphs
- Network statistics
- Setup wizard (OS detection, Docker install)
- Claim earnings button
- Historical earnings chart

---

## 📈 Technical Specifications

### Cache Node Requirements
| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| RAM | 1GB | 2GB+ |
| Storage | 5GB | 10GB+ |
| CPU | 1 core | 2+ cores |
| Bandwidth | 100 Mbps | 500+ Mbps |
| Uptime | 95% | 99%+ |
| $WHISTLE Stake | 10,000 | 50,000+ |

### Full Node Requirements
| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| RAM | 256GB | 512GB+ |
| Storage | 2TB NVMe | 4TB+ NVMe |
| CPU | 16 cores | 32+ cores |
| Bandwidth | 1 Gbps | 10+ Gbps |
| Uptime | 99% | 99.9%+ |
| $WHISTLE Stake | 100,000 | 500,000+ |

### Performance Targets
- **Cache hit rate**: 80-90%
- **Cache response time**: <10ms average
- **Cache miss response time**: <100ms average
- **Uptime**: 99.9% (43 minutes downtime/month max)
- **Error rate**: <0.1%

---

## 🛠️ Development Setup

### Prerequisites
```bash
node >= 18.16
npm >= 9
docker (for cache node)
rust + solana-cli (for contract development)
```

### Clone & Install
```bash
git clone https://github.com/DylanPort/whitelspace.git
cd whitelspace
npm install
```

### Run Dashboard (Development)
```bash
cd whistle-dashboard
npm install
npm run dev
# Open http://localhost:3000
```

### Run Cache Node (Local Testing)
```bash
cd whistlenet/cache-node
npm install
npm run build
npm start

# Or use Docker
docker build -t whistle-cache .
docker run -p 8545:8545 -e WALLET_ADDRESS=YourWallet whistle-cache
```

### Run Coordinator (Local)
```bash
cd whistlenet/coordinator
npm install
npm run build
npm start
# Runs on port 3002
```

---

## 📁 Repository Structure

```
whitelspace/
├── whistlenet/                    # Core RPC network
│   ├── cache-node/                # Cache node implementation
│   │   ├── src/
│   │   │   ├── index.ts           # Main server
│   │   │   └── contract-integration.ts  # On-chain integration
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── coordinator/               # Load balancer & health monitor
│   │   ├── src/index.ts
│   │   └── package.json
│   │
│   ├── contract/                  # Solana smart contract
│   │   ├── src/lib.rs             # Rust program
│   │   ├── Cargo.toml
│   │   └── docs/
│   │
│   └── setup-scripts/             # Platform installers
│       ├── install-windows.ps1
│       ├── install-mac.sh
│       └── install-linux.sh
│
├── whistle-dashboard/             # Next.js provider dashboard
│   ├── components/
│   │   ├── ProviderDashboardDark.tsx    # Main dashboard
│   │   └── BecomeProviderSection.tsx    # Onboarding flow
│   ├── lib/
│   │   └── cache-node-api.ts      # API integration
│   └── public/
│       └── main.html              # Legacy privacy tools
│
├── docs/                          # Documentation
│   ├── PROVIDER-EXPLAINED.md      # Provider guide
│   ├── WHISTLE-EXPLAINED.md       # Architecture overview
│   ├── WHISTLE-ARCHITECTURE-DIAGRAM-PROMPT.md
│   └── CURRENT-PRIORITY-RPC-NETWORK.md
│
├── trigger-x402-distribution.js   # X402 payment automation
├── START_WHISTLE.bat              # Windows unified launcher
└── README.md                      # This file
```

---

## 💡 Why This Works

### 1. Economically Sustainable
- **Operators profit**: Even with 1,000 queries/day ($50/mo vs $6 VPS)
- **Network profits**: Coordinator + aggregator earn 20% bonus pool
- **Stakers profit**: 5% of all fees = passive income
- **Users benefit**: Cheaper + more reliable than centralized alternatives

### 2. Technically Feasible  
- **Caching works**: 80-90% of RPC queries are cacheable
- **Low hardware needs**: Cache nodes run on $6/month VPS
- **Fast**: Cache hits return in 5-10ms (10x faster than upstream)
- **Reliable**: Multi-provider aggregation prevents single point of failure

### 3. Community Aligned
- **Open source**: All code is auditable
- **Fair launch**: No VC allocation, no team lock-up
- **Low barrier**: Anyone can run a node with minimal investment
- **Governed by stakers**: Community controls network parameters

### 4. Proven Business Model
- **We're already serving requests** on `rpc.whistle.ninja`
- **Smart contract is live** and distributing payments
- **Operators are profitable** at current query volumes
- **Scalable**: More users = more queries = more earnings for everyone

---

## 📚 Documentation

### Getting Started
- [Provider Setup Guide](docs/PROVIDER-EXPLAINED.md) - How to run a node
- [Network Architecture](docs/WHISTLE-EXPLAINED.md) - Technical overview
- [Current Priority](docs/CURRENT-PRIORITY-RPC-NETWORK.md) - What we're building now

### Technical Docs
- [Smart Contract Documentation](whistlenet/contract/docs/)
- [Cache Node API Reference](whistlenet/cache-node/README.md)
- [Coordinator Architecture](whistlenet/coordinator/README.md)

### For Stakers
- How to stake $WHISTLE
- How to claim rewards
- Understanding earnings

---

## 🎯 Roadmap

### ✅ Phase 1: Foundation (COMPLETED - Nov 2024)
- [x] Deploy smart contract with payment logic
- [x] Launch RPC endpoint (`rpc.whistle.ninja`)
- [x] Build cache node software
- [x] Create provider dashboard
- [x] Platform-specific installers
- [x] Contract integration for earnings tracking

### 🚧 Phase 2: Decentralization (IN PROGRESS - Dec 2024)
- [ ] Launch coordinator with health monitoring
- [ ] Onboard first 10-20 cache node operators
- [ ] Multi-provider load balancing
- [ ] Geographic distribution (3+ regions)
- [ ] Automated provider payouts
- [ ] Performance leaderboard

### 📋 Phase 3: Scale (Q1 2025)
- [ ] 100+ community nodes
- [ ] Full node support for power users
- [ ] Advanced analytics dashboard
- [ ] Mobile monitoring app
- [ ] Developer rebate program
- [ ] 1M+ queries per day

### 🔮 Phase 4: Ecosystem (Q2 2025+)
- [ ] 1000+ nodes worldwide
- [ ] 10M+ queries per day
- [ ] Cross-chain RPC (Ethereum, Polygon, etc.)
- [ ] Decentralized governance launch
- [ ] Industry partnerships
- [ ] RPC-as-a-Service for other projects

---

## 🤝 Contributing

We need help with:

**High Priority**:
- Multi-provider load balancing algorithm
- Health monitoring & automatic failover
- Provider onboarding UX improvements
- Documentation & tutorials

**Medium Priority**:
- Analytics dashboard enhancements
- Mobile app development
- Automated testing for cache node
- Community growth initiatives

**How to Contribute**:
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-idea`
3. Make your changes
4. Write tests (if applicable)
5. Submit a pull request

**Get Rewarded**: Active contributors earn from the developer rebate pool (contract feature in progress)

---

## 🔐 Security

### For Users
- ✅ No tracking or data collection
- ✅ Encrypted connections (HTTPS/WSS)
- ✅ DDoS protection at edge layer
- ✅ Rate limiting to prevent abuse

### For Providers
- ✅ Private keys never leave your machine
- ✅ On-chain reputation system
- ✅ Slashing for malicious behavior
- ✅ Health checks validate responses

### Audits
- **Smart Contract**: Internal review completed, public audit Q1 2025
- **Cache Node**: Security review in progress
- **Infrastructure**: Ongoing monitoring and improvements

---

## 📱 Links & Community

- **Website**: [whistle.ninja](https://whistle.ninja)
- **RPC Endpoint**: `https://rpc.whistle.ninja`
- **Provider Dashboard**: [whistle.ninja/providers](https://whistle.ninja)
- **Twitter**: [@Whistle_Ninja](https://x.com/Whistle_Ninja)
- **Telegram**: [@whistleninja](https://t.me/whistleninja) — **Join for beta access**
- **GitHub**: [DylanPort/whitelspace](https://github.com/DylanPort/whitelspace)
- **Contract**: [`whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr`](https://solscan.io/account/whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr)
- **Token**: [`6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump`](https://solscan.io/token/6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump)

---

## 🌟 The Bigger Picture

WHISTLE isn't just an RPC network. We're an **infrastructure adaptation engine**.

**Our Philosophy**:
- The world is centralized
- Every centralized service can be disrupted
- Community-owned infrastructure is the future
- We adapt to where decentralization is needed most

**Current Focus**: Solana RPC (because it's centralized and expensive)  
**Future Potential**: AI inference, CDN, cloud storage, VPN, any centralized service

**We're not playing one game. We're playing the infinite game.**

---

## 🏆 Success Metrics

### Short Term (90 Days)
- 10+ nodes online
- 100K queries/day
- $500+/month distributed
- 50+ stakers

### Medium Term (6 Months)
- 100+ nodes
- 1M queries/day  
- $10K+/month distributed
- 500+ stakers

### Long Term (12 Months)
- 500+ nodes worldwide
- 10M queries/day
- $100K+/month distributed
- 2000+ stakers
- Industry partnerships

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built for Solana builders tired of centralized chokepoints.**

**Run a node. Earn rewards. Own the infrastructure.**

🛡️ *Privacy infrastructure only exists if we build it ourselves.*

---

## 🎺 Sound the Whistle

The revolution isn't coming. It's here.

Join us in building the decentralized future of Web3 infrastructure.

**[Get Started →](https://whistle.ninja)**

- Health monitoring & automatic failover
- Provider onboarding UX improvements
- Documentation & tutorials

**Medium Priority**:
- Analytics dashboard enhancements
- Mobile app development
- Automated testing for cache node
- Community growth initiatives

**How to Contribute**:
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-idea`
3. Make your changes
4. Write tests (if applicable)
5. Submit a pull request

**Get Rewarded**: Active contributors earn from the developer rebate pool (contract feature in progress)

---

## 🔐 Security

### For Users
- ✅ No tracking or data collection
- ✅ Encrypted connections (HTTPS/WSS)
- ✅ DDoS protection at edge layer
- ✅ Rate limiting to prevent abuse

### For Providers
- ✅ Private keys never leave your machine
- ✅ On-chain reputation system
- ✅ Slashing for malicious behavior
- ✅ Health checks validate responses

### Audits
- **Smart Contract**: Internal review completed, public audit Q1 2025
- **Cache Node**: Security review in progress
- **Infrastructure**: Ongoing monitoring and improvements

---

## 📱 Links & Community

- **Website**: [whistle.ninja](https://whistle.ninja)
- **RPC Endpoint**: `https://rpc.whistle.ninja`
- **Provider Dashboard**: [whistle.ninja/providers](https://whistle.ninja)
- **Twitter**: [@Whistle_Ninja](https://x.com/Whistle_Ninja)
- **Telegram**: [@whistleninja](https://t.me/whistleninja) — **Join for beta access**
- **GitHub**: [DylanPort/whitelspace](https://github.com/DylanPort/whitelspace)
- **Contract**: [`whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr`](https://solscan.io/account/whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr)
- **Token**: [`6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump`](https://solscan.io/token/6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump)

---

## 🌟 The Bigger Picture

WHISTLE isn't just an RPC network. We're an **infrastructure adaptation engine**.

**Our Philosophy**:
- The world is centralized
- Every centralized service can be disrupted
- Community-owned infrastructure is the future
- We adapt to where decentralization is needed most

**Current Focus**: Solana RPC (because it's centralized and expensive)  
**Future Potential**: AI inference, CDN, cloud storage, VPN, any centralized service

**We're not playing one game. We're playing the infinite game.**

---

## 🏆 Success Metrics

### Short Term (90 Days)
- 10+ nodes online
- 100K queries/day
- $500+/month distributed
- 50+ stakers

### Medium Term (6 Months)
- 100+ nodes
- 1M queries/day  
- $10K+/month distributed
- 500+ stakers

### Long Term (12 Months)
- 500+ nodes worldwide
- 10M queries/day
- $100K+/month distributed
- 2000+ stakers
- Industry partnerships

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built for Solana builders tired of centralized chokepoints.**

**Run a node. Earn rewards. Own the infrastructure.**

🛡️ *Privacy infrastructure only exists if we build it ourselves.*

---

## 🎺 Sound the Whistle

The revolution isn't coming. It's here.

Join us in building the decentralized future of Web3 infrastructure.

**[Get Started →](https://whistle.ninja)**
