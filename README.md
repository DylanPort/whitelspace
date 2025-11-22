# 🛰️ Whistle Network — Community-Owned Private RPC Stack

> **"Build the private infrastructure first, then everything else becomes possible."**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Solana](https://img.shields.io/badge/Solana-Mainnet-green)](https://solana.com)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.16-brightgreen)](https://nodejs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)

---

## 📌 TL;DR

- **Custom RPC endpoint** (`https://rpc.whistle.ninja`) with Cloudflare Worker + provider proxy
- **x402 → SOL 90/10 split** (stakers 90%, treasury 10%) enforced on-chain
- **Provider + staker smart contract** running on Solana Mainnet (`contracts/encrypted-network-access-token`)
- **Dashboard** (`whistle-dashboard/`) to monitor pool stats, providers, treasury
- **40+ privacy tools** (x402 gated) migrating to NLx402 routing
- **Community-first economics**: every paid query flows back to the people who fund/run the network

---

## 🔭 Current Focus

| Track | Status | Details |
|-------|--------|---------|
| RPC branding layer | ✅ | Cloudflare Worker + `whistle-rpc-proxy` forward to Helius while shielding metadata |
| RPC ownership | 🚧 | Preparing multi-provider backend + integration nodes |
| x402 distributor | ✅ | `x402-distributor-cron.js` automates payouts (90/10) |
| Staker UX | ✅ | `claim-my-rewards.js` + dashboard cards |
| NLx402 integration | 🧪 | Spec drafted, waiting for NLx402 public API |
| Provider onboarding | 📋 | Contract-ready (register, heartbeat, slash) — UI/backend WIP |

---

## 🧱 Architecture Snapshot

```
┌──────────────────────────────────────────────┐
│  Apps / Dashboards                           │
│  • whistle-dashboard/                        │
│  • main.html demos (x402 gated tools)        │
└────────────────┬─────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────┐
│  RPC Edge                                     │
│  • cloudflare-worker/                         │
│       - CORS policy, domain whitelist         │
│       - Branding + rate limits                │
│  • whistle-rpc-proxy/                         │
│       - Request inspection, logging           │
└────────────────┬─────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────┐
│  Upstream Providers                           │
│  • Distributed provider network                │
│  • Dynamic routing based on provider health   │
│  • Future: community nodes via staking pool   │
└────────────────┬─────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────┐
│  On-Chain Loyalty Layer                       │
│  • contracts/encrypted-network-access-token   │
│       - StakingPool / ProviderAccount         │
│       - PaymentVault (70/20/5/5 split)        │
│       - X402 wallet + ProcessX402Payment      │
└────────────────┬─────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────┐
│  Automation + Tooling                         │
│  • x402-distributor-cron.js                   │
│  • claim-my-rewards.js                        │
│  • NLx402 spec (docs)                         │
└──────────────────────────────────────────────┘
```

---

## 🧠 Key Components

### 1. Whistle RPC Edge
- `cloudflare-worker/`: Auth, rate limits, domain allow-list, abuse guard
- `whistle-rpc-proxy/`: Node.js proxy for environments outside Workers
- `wrangler.toml`: provider network configuration

### 2. Solana Smart Contract (ENAT)
- Location: `contracts/encrypted-network-access-token/src/lib.rs`
- **Core accounts:** `StakingPool`, `StakerAccount`, `ProviderAccount`, `PaymentVault`
- **Instructions:** staking, provider lifecycle, slashing, x402 payments, NLx402 hooks
- **Payment math:** Query flow = 70% providers / 20% bonus / 5% treasury / 5% stakers; X402 flow = 90% stakers / 10% treasury

### 3. x402 Economic Layer
- `x402-helpers.ts`: PDA helpers + instruction builders
- `x402-distributor-cron.js`: daemon that sweeps X402 wallet → vault
- `claim-my-rewards.js`: CLI tool to withdraw staker rewards
- `X402-SETUP-GUIDE.md` & `STAKER-CLAIM-GUIDE.md`: operational docs

### 4. Dashboards + Clients
- `whistle-dashboard/`: Next.js dashboard for pools, treasury, providers
- `apps/web/` & `public/` HTML demos: x402-gated privacy tools
- All client RPC calls now point to `https://rpc.whistle.ninja`

---

## 🚀 Quick Start

### Prerequisites
```bash
node >= 18.16
npm >= 9
rust + cargo (for Solana program)
solana-cli (configured for mainnet or localnet)
```

### Clone & Install
```bash
git clone https://github.com/DylanPort/whitelspace.git
cd whitelspace
npm install
```

### Run the Dashboard (dev)
```bash
cd whistle-dashboard
npm install
npm run dev
# http://localhost:3000
```

### Deploy / Test the Cloudflare Worker
```bash
cd cloudflare-worker
npm install
wrangler dev
wrangler publish
```

Set `PRIMARY_RPC_ENDPOINT` and other provider URLs when publishing (or use Secrets UI).

### X402 Distributor
```bash
cd contracts/encrypted-network-access-token
npm install

# One-time PDA init
node initialize-x402-wallet.js

# Start cron (docker-compose example)
docker-compose up -d x402-distributor
```

### Claim Staker Rewards
```bash
cd contracts/encrypted-network-access-token
export STAKER_KEYPAIR=./staker.json
node claim-my-rewards.js
```

---

## ⚙️ Repository Guide

| Path | Description |
|------|-------------|
| `whistle-dashboard/` | Next.js dashboard (pool stats, providers, treasury) |
| `cloudflare-worker/` | Edge worker that fronts the branded RPC |
| `whistle-rpc-proxy/` | Node proxy fallback for non-Worker deployments |
| `contracts/encrypted-network-access-token/` | Solana program + tooling |
| `apps/web/`, `public/` | Legacy/front-of-house privacy tools (x402 gated) |
| `docs/` | Architecture notes, diagrams, Ghost Whistle docs |

---

## 🪙 Economics & Distribution

| Source | Flow | Notes |
|--------|------|-------|
| RPC queries | 70% provider pool, 20% bonus pool, 5% treasury, 5% stakers | Managed via `PaymentVault` |
| x402 payments | 90% stakers, 10% treasury | `ProcessX402Payment` instruction |
| NLx402 routing | Pending | Stakers opt-in once API stable |

### Highlighted Files
- `contracts/encrypted-network-access-token/src/lib.rs` — On-chain math
- `contracts/.../x402-distributor-cron.js` — Off-chain automation
- `contracts/.../claim-my-rewards.js` — Staker UX

---

## 📡 Provider & Integration Nodes (WIP)

What’s live in code:
- `RegisterProvider`, `UpdateEndpoint`, `RecordHeartbeat`, `SlashProvider`
- Reputation metrics: uptime, response time, accuracy, heartbeats
- Payment vault accounting to reward providers & stakers

What’s missing (help wanted):
- Provider onboarding UI/API
- Health-check scheduler + NL routing
- Automatic failover + geo balancing

---

## 🧭 Roadmap (public items)

- [x] Replace every client-side Helius reference with `rpc.whistle.ninja`
- [x] Remove Cloudflare “powered by Helius” copy
- [x] Fix CORS + rate limits for own domains
- [x] Automate x402 payouts + staker claims
- [ ] Ship provider control panel (registration, uptime graph)
- [ ] Integrate NLx402 + trustless 5% fee routing to @PerkinsFund
- [ ] Launch multi-provider load balancer + Falco-style healthchecks
- [ ] Add zk-proof-of-privacy for RPC queries (R&D)

---

## 🛠️ Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feat/my-idea`
3. Make changes + add tests
4. Run lint/tests where applicable
5. Open a PR with context (which subsystem, which env vars, etc.)

Areas needing help:
- Provider onboarding backend
- NLx402 client integration
- Dashboard graphs + analytics
- Documentation / tutorials

---

## 🔐 Security & Privacy Notes

- No telemetry, no analytics, no hidden requests
- Worker + proxy strip identifying headers before reaching upstream
- Secret keys (Helius, authority keypairs) are never committed — use `.env` or Cloudflare KV
- Staker/provider PDAs verified on-chain to prevent spoofing
- Rate limiting exempt for `*.whistle.ninja` to avoid self-DDoS

---

## 📡 Links

- **Website:** [whistle.ninja](https://whistle.ninja)
- **RPC Endpoint:** `https://rpc.whistle.ninja`
- **Twitter / X:** [@Whistle_Ninja](https://x.com/Whistle_Ninja)
- **Telegram:** [@whistleninja](https://t.me/whistleninja)
- **Smart Contract:** [`5cmaPy5i8efSWSwRVVuWr9VUx8sAMv6qMVSE1o82TRgc`](https://solscan.io/account/5cmaPy5i8efSWSwRVVuWr9VUx8sAMv6qMVSE1o82TRgc)

---

**Built for Solana builders tired of centralized chokepoints.**  
If you want to run a provider, integrate NLx402, or help harden the infra — DM us. Privacy infrastructure only exists if we build it ourselves. 🛡️

## 🌟 Key Features

### 🛡️ Privacy Tools Lab
- **Breach Monitor** - Check if your email has been compromised (powered by HaveIBeenPwned)
- **Exploit Scanner** - Security vulnerability detection for code and applications
- **Steganography** - Hide encrypted messages within images
- **Location Spoofer** - Privacy-preserving GPS manipulation
- **Ghost Identity Generator** - Create anonymous digital identities
- **VPN Integration** - Seamless VPN connectivity for enhanced privacy

### 💬 Ghost Whistle (Offline P2P Network)
- **End-to-End Encrypted Messaging** - Military-grade encryption for all communications
- **Decentralized Node Network** - Community-run infrastructure with 10+ bootstrap nodes
- **Voice & Video Calls** - Private WebRTC-based real-time communication
- **Offline Capability** - Mesh networking for communication without internet
- **File Sharing** - Secure peer-to-peer file transfers
- **Group Chats** - Encrypted multi-party conversations

### 🤖 CryptWhistle AI
- **Privacy-Preserving AI** - Client-side AI processing (data never leaves your device)
- **Sentiment Analysis** - Understand tone and context in communications
- **Zero-Shot Classification** - Intelligent message categorization
- **Question Answering** - AI-powered information retrieval
- **WebGPU/WebAssembly** - Hardware-accelerated browser-based AI
- **No Cloud Processing** - 100% local AI inference using Transformers.js

### 💰 Whistle Token ($WHISTLE)
- **Privacy Swap** - Anonymous token exchanges
- **Solana Integration** - Fast, low-cost transactions on Solana blockchain
- **Staking Rewards** - Earn rewards by running nodes
- **Node Operator Rewards** - Get paid for supporting the network
- **x402 Micropayments** - Pay-per-use privacy services

### 🆔 Whistle IDs
- **Self-Sovereign Identity** - Control your own digital identity
- **Anonymous Reputation System** - Build trust without revealing personal info
- **Cross-Platform** - Use one identity across all Whistle services
- **Decentralized** - No central authority controls your identity

### 📱 Mobile Wallet
- **Non-Custodial** - You control your private keys
- **Multi-Chain Support** - Solana native with cross-chain compatibility
- **QR Code Payments** - Easy peer-to-peer transactions
- **Built-in Swap** - Trade tokens without leaving the wallet
- **DApp Browser** - Access Web3 applications securely

## 🏗️ Architecture

### Monorepo Structure
```
whistle/
├── apps/
│   ├── web/                    # Main web application
│   ├── mobile/                 # Android/iOS applications
│   └── cryptwhistle/           # AI platform
│
├── backend/
│   ├── signaling-server.js     # WebRTC signaling
│   ├── signaling-server-calls.js   # Voice/video calls
│   └── user-node-client.js     # Node runner
│
├── docs/                        # Documentation
│   ├── guides/                 # User guides
│   ├── technical/              # Technical specs
│   └── ghost-calls/            # WebRTC documentation
│
├── contracts/                   # Smart contracts
│   └── ghost-whisper-contract/ # Solana program
│
└── infrastructure/
    ├── node-keys/              # Bootstrap node keys
    ├── node-storage/           # Decentralized storage
    └── dist/                   # Built binaries
```

### Tech Stack

**Frontend:**
- React (JSX with Babel)
- TailwindCSS (Utility-first CSS)
- Lucide Icons
- WebRTC for P2P communication
- Service Workers for offline functionality

**Backend:**
- Node.js / Express
- WebSocket (ws) for real-time communication
- Solana Web3.js
- PM2 for process management

**Blockchain:**
- Solana Mainnet
- Anchor Framework for smart contracts
- SPL Tokens ($WHISTLE)

**AI/ML:**
- Transformers.js (client-side AI)
- WebGPU / WebAssembly
- DistilBERT models for NLP tasks

**Infrastructure:**
- Docker & Docker Compose
- Netlify (frontend hosting)
- Render.com (backend services)
- Self-hosted bootstrap nodes

## 🚀 Quick Start

### Prerequisites
```bash
node >= 18.0.0
npm >= 8.0.0
```

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/whistle.git
cd whistle
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment (optional)**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start development server**
```bash
npm start
```

The application will be available at `http://localhost:3001`

### Running Services

**Main Application:**
```bash
npm start
```

**WebRTC Signaling Server:**
```bash
npm run signaling
```

**Voice/Video Call Server:**
```bash
npm run signaling-calls
```

**CryptWhistle AI:**
```bash
cd apps/cryptwhistle
npm start
```

## 🔧 Configuration

### x402 Micropayments
The platform uses x402 protocol for micro-transactions. Configure in `server.js`:
- Fee collector wallet
- Token mint address
- Payment validation

### Bootstrap Nodes
Configure decentralized node infrastructure:
- Node keys in `infrastructure/node-keys/` (gitignored for security)
- Node storage in `infrastructure/node-storage/`
- Bootstrap addresses in configuration files

## 🌐 Deployment

### Frontend (Netlify)
```bash
npm install
# Builds happen automatically on Netlify
```

### Backend (Render / VPS)
```bash
npm start                    # Main server
npm run signaling           # WebRTC server
npm run signaling-calls     # Call server
```

### Docker Deployment
```bash
docker-compose up -d
```

See `docs/guides/` for detailed deployment instructions.

## 🔐 Security

### Privacy Features
- **No data collection** - We don't track, store, or sell your data
- **End-to-end encryption** - All communications are encrypted
- **Client-side processing** - AI runs in your browser
- **Decentralized infrastructure** - No single point of failure
- **Open source** - Fully auditable code

### Security Best Practices
- Private keys are never committed (`.gitignore`)
- API keys should be stored in environment variables
- Bootstrap node keys are for public node network only
- Use strong encryption for all sensitive operations

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Website:** [whistle.ninja](https://whistle.ninja)
- **Twitter:** [@Whistle_Ninja](https://x.com/Whistle_Ninja)
- **Telegram:** [@whistleninja](https://t.me/whistleninja)
- **Smart Contract:** [Solana Explorer](https://solscan.io/token/6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump)

## 🙏 Acknowledgments

- Built on Solana blockchain
- Powered by Transformers.js for privacy-preserving AI
- HaveIBeenPwned API for breach monitoring
- Open-source community for continuous support

## 📊 Project Status

**Current Phase:** Public Beta  
**Token:** $WHISTLE (Launched on Solana Mainnet)  
**Network:** 10+ active bootstrap nodes  
**Platform:** Web + Mobile (Android)

### Roadmap
- Q4 2025: Public beta, client-side AI, mobile apps
- Q1 2026: TEE backend (AWS Nitro Enclaves), Smart routing, Model marketplace
- Q2 2026: Cross-chain integration, Advanced AI features
- Q3 2026: Mainnet v2, Enhanced scalability

---

**Built with ❤️ for privacy advocates, by privacy advocates**

*Remember: Your privacy is your power*
