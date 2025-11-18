# WHISTLE Provider Software

**Complete provider node software for serving decentralized Solana data**

Run this to become a WHISTLE Network provider and earn SOL from queries.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PROVIDER NODE                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────┐      ┌──────────────────┐          │
│  │ Solana Validator│──────│  Rust Indexer    │          │
│  │  (archival)    │      │  (watches blocks)│          │
│  └────────────────┘      └─────────┬────────┘          │
│                                    │                     │
│                                    ▼                     │
│                          ┌──────────────────┐           │
│                          │   PostgreSQL     │           │
│                          │  (indexed data)  │           │
│                          └─────────┬────────┘           │
│                                    │                     │
│                                    ▼                     │
│  ┌────────────────┐      ┌──────────────────┐          │
│  │ Monitoring     │      │  Node.js API     │          │
│  │ Agent          │◄─────│  (RPC server)    │          │
│  │ (heartbeat)    │      │  Port: 8080      │          │
│  └────────────────┘      └──────────────────┘          │
│         │                          │                     │
│         └──────────┬───────────────┘                     │
│                    ▼                                     │
│           WHISTLE Smart Contract                        │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### One-Command Setup

```bash
docker-compose up
```

That's it! Provider node will:
1. Download Solana snapshot
2. Start validator
3. Initialize PostgreSQL
4. Start indexer
5. Start API server
6. Register with smart contract
7. Begin serving queries

---

## 📦 Components

### 1. **Indexer** (Rust)
- **Location:** `indexer/`
- **Purpose:** Watch blockchain, parse transactions, index to PostgreSQL
- **Tech:** Rust + Tokio + Solana SDK
- **Performance:** ~1000 tx/sec indexing speed

### 2. **API Server** (Node.js)
- **Location:** `api/`
- **Purpose:** Serve queries via REST API
- **Tech:** Node.js + Express + PostgreSQL
- **Endpoints:** `/api/transactions`, `/api/balances`, `/api/nfts`

### 3. **Monitoring Agent** (Rust)
- **Location:** `monitoring/`
- **Purpose:** Report heartbeat, track uptime
- **Tech:** Rust
- **Frequency:** Ping every 60 seconds

### 4. **Docker Setup**
- **Location:** `docker/`
- **Purpose:** Single-command deployment
- **Services:** Validator, PostgreSQL, Indexer, API, Monitor

---

## 💰 Provider Economics

### Earnings
- **Per Query:** 0.0007 SOL (70% of 0.001 SOL)
- **Bonus Pool:** Top 20% providers share 20% pool
- **Break-even:** ~200-500 queries/month

### Costs
- **Server:** $100-300/month (VPS with 15TB storage)
- **Bond:** 1000 WHISTLE tokens (refundable)
- **Bandwidth:** Included with most hosting

### ROI Example
```
Monthly queries: 1,000
Revenue: 1,000 × 0.0007 SOL = 0.7 SOL (~$140)
Costs: ~$200/month
Net: -$60/month (early stage)

Monthly queries: 5,000
Revenue: 5,000 × 0.0007 SOL = 3.5 SOL (~$700)
Costs: ~$200/month
Net: +$500/month profit ✅
```

---

## 🔧 Configuration

### Environment Variables

```bash
# config/.env

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta

# PostgreSQL
DATABASE_URL=postgresql://whistle:password@localhost:5432/whistle_indexer

# Provider
PROVIDER_ENDPOINT=https://your-domain.com:8080
PROVIDER_KEYPAIR_PATH=/keys/provider-keypair.json
PROVIDER_BOND=1000

# API
API_PORT=8080
API_HOST=0.0.0.0

# Monitoring
HEARTBEAT_INTERVAL=60
SMART_CONTRACT_ADDRESS=ENATkxyz123456789ABCDEFGHJKLMNPQRSTUVWXYZabc
```

---

## 📊 Database Schema

```sql
-- Transactions table (main data)
CREATE TABLE transactions (
    signature TEXT PRIMARY KEY,
    slot BIGINT NOT NULL,
    block_time BIGINT NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    amount BIGINT NOT NULL,
    fee BIGINT NOT NULL,
    program_id TEXT NOT NULL,
    status TEXT NOT NULL,
    logs TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_from ON transactions(from_address);
CREATE INDEX idx_to ON transactions(to_address);
CREATE INDEX idx_time ON transactions(block_time);
CREATE INDEX idx_program ON transactions(program_id);
```

---

## 🌐 API Endpoints

### GET `/api/transactions`
Get transactions for a wallet

```bash
curl http://localhost:8080/api/transactions?wallet=ABC...&limit=100
```

### GET `/api/balances`
Get token balances

```bash
curl http://localhost:8080/api/balances?wallet=ABC...
```

### GET `/api/nfts`
Get NFTs for a wallet

```bash
curl http://localhost:8080/api/nfts?wallet=ABC...
```

### GET `/api/health`
Check provider health

```bash
curl http://localhost:8080/api/health
```

---

## 🛠️ Development

### Build Indexer
```bash
cd indexer
cargo build --release
```

### Build API
```bash
cd api
npm install
npm run build
```

### Run Locally
```bash
# Start PostgreSQL
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:15

# Run indexer
cd indexer && cargo run

# Run API
cd api && npm start

# Run monitoring
cd monitoring && cargo run
```

---

## 📈 Monitoring

### Metrics Tracked
- Uptime percentage
- Response time (ms)
- Queries served
- Errors count
- Reputation score

### Dashboard
Access at: `http://localhost:8080/metrics`

---

## 🔐 Security

### Best Practices
- Keep provider keypair secure
- Use firewall (only expose port 8080)
- Regular updates
- Monitor logs
- Backup database weekly

### Slashing Protection
- Maintain >95% uptime
- Keep response times <500ms
- Serve accurate data
- Regular heartbeats

---

## 🚦 Status Checks

### Health Check
```bash
curl http://localhost:8080/api/health

# Response:
{
  "status": "healthy",
  "uptime": 99.8,
  "queries_served": 12458,
  "reputation": 9850,
  "last_heartbeat": "2024-01-15T10:30:00Z"
}
```

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/DylanPort/whitelspace/issues)
- **Telegram:** [t.me/whistleninja](https://t.me/whistleninja)
- **Docs:** [docs.whistle.network/provider](https://docs.whistle.network/provider)

---

## 📄 License

MIT License

---

**Earn SOL by serving decentralized data** ⚡



