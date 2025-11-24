# WHISTLE Network - Architecture Overview

## What is WHISTLE?
A decentralized RPC infrastructure for Solana that allows anyone to earn SOL by serving blockchain queries.

## How It Works

### 1. Staking System
- **Stake WHISTLE tokens** → Get access tokens (1:1 ratio)
- **Access tokens** = Query credits for using the network
- **Minimum stake**: 100 WHISTLE
- **Cooldown period** for unstaking to prevent abuse

### 2. Two Ways to Provide & Earn

#### Option A: Cache Node (Easy - Anyone Can Do This)
**Requirements:**
- 2GB RAM, 10GB storage
- Home PC or $6/month VPS
- Docker installed
- No staking required

**How it works:**
- Cache popular RPC responses (balances, token data)
- Serve cached data ultra-fast (5-10ms)
- Forward cache misses to full nodes
- Earn 0.00007 SOL per query served

**What you cache:**
- Account balances (5-10 sec cache)
- Token metadata (60 sec cache)
- Transaction history (30 sec cache)
- Static data (5 min cache)

#### Option B: Full Node (Advanced - Powerful Machines)
**Requirements:**
- 256GB+ RAM, 2TB+ NVMe SSD
- 1+ Gbps internet
- Dedicated server ($100-500/month)
- Run actual Solana validator

**How it works:**
- Run Solana validator (participate in gossip network)
- Index blockchain data to PostgreSQL
- Serve ALL RPC methods directly
- Provide authoritative, fresh data
- Earn 0.00007 SOL per query served

**Full node stack:**
- Solana Validator (sync via gossip)
- Rust Indexer (blockchain → database)
- PostgreSQL (indexed data)
- Node.js API (RPC endpoint)

### 3. Query Flow

**When User Makes RPC Request:**
1. Request hits Coordinator
2. Coordinator checks query type
3. Routes to best provider based on:
   - Query type (cacheable or not)
   - Provider location (lowest latency)
   - Provider health/reputation

**Three Scenarios:**

**Cache Hit (Fast):**
- User → Coordinator → Cache Node
- Cache node has data in memory
- Returns in 5-10ms
- Cache node earns 0.00007 SOL

**Cache Miss (Medium):**
- User → Coordinator → Cache Node
- Cache node doesn't have data
- Forwards to Full Node
- Caches response for next time
- Returns in 50-200ms
- Full node earns 0.00007 SOL

**Fresh Data Required (Direct):**
- User → Coordinator → Full Node
- Queries requiring latest state (transactions, confirmations)
- Bypasses cache entirely
- Full node earns 0.00007 SOL

### 4. Payment Distribution (Per Query)

**User pays: 0.0001 SOL per query**

**Smart contract splits it:**
- 70% (0.00007 SOL) → Provider who served the query
- 20% (0.00002 SOL) → Bonus pool for top performers
- 5% (0.000005 SOL) → Treasury (network development)
- 5% (0.000005 SOL) → Stakers (proportional distribution)

### 5. Provider Earnings

**Cache Node Reality:**
- Serves: 10,000-50,000 queries/day
- Revenue: 0.7-3.5 SOL/day
- Monthly: 21-105 SOL
- Depends on: uptime, location, cache hit rate

**Full Node Reality:**
- Serves: 100,000-500,000 queries/day
- Revenue: 7-35 SOL/day
- Monthly: 210-1,050 SOL
- Higher because handles all query types

### 6. Smart Contract Functions

**For Stakers:**
- `stake()` - Lock WHISTLE tokens
- `unstake()` - Withdraw after cooldown
- `claimStakerRewards()` - Claim 5% share

**For Providers:**
- `registerProvider()` - Register wallet + endpoint
- `recordHeartbeat()` - Prove you're online
- `claimProviderEarnings()` - Withdraw your 70% share

**Automatic:**
- `processQueryPayment()` - Splits fees on each query
- `distributeBonus()` - Monthly to top 20% performers

### 7. Decentralization Path

**Phase 1** (Current): Centralized coordinator for routing
**Phase 2**: Multi-region coordinators for redundancy
**Phase 3**: Coordinator network with consensus
**Phase 4**: Fully on-chain routing via Solana programs

### 8. Technical Stack

**Smart Contract:** Rust (Solana program)
**Cache Nodes:** Node.js + Docker + In-memory cache
**Full Nodes:** Solana validator + Rust indexer + PostgreSQL + Node.js API
**Coordinator:** Node.js + WebSocket + Redis

### 9. Why This Works

**For Users:**
- Faster queries (5ms cached vs 200ms direct)
- Lower cost (shared infrastructure)
- Better uptime (multiple providers)

**For Cache Node Operators:**
- Low barrier to entry (home PC works)
- Passive income while PC is on
- No blockchain expertise needed

**For Full Node Operators:**
- Higher revenue potential
- Direct participation in Solana network
- Serve all query types

**For The Network:**
- Decentralized (no single point of failure)
- Geographic distribution (lower latency)
- Economically sustainable (fees cover costs + profit)

### 10. Key Differences: Cache vs Full Node

| Feature | Cache Node | Full Node |
|---------|-----------|-----------|
| **Cost** | $0-20/month | $100-500/month |
| **RAM** | 2GB | 256GB+ |
| **Storage** | 10GB | 2TB+ NVMe |
| **Query Types** | Cacheable only | All types |
| **Latency** | 5-10ms | 50-200ms |
| **Setup** | 5 minutes | Hours/Days |
| **Technical Skill** | None (Docker) | Advanced |
| **Revenue** | 21-105 SOL/month | 210-1,050 SOL/month |
| **Blockchain Sync** | No | Yes (gossip network) |

## Summary

WHISTLE Network creates a decentralized RPC infrastructure where:
- **Anyone** can run a cache node and earn SOL with minimal resources
- **Advanced users** can run full nodes for higher earnings
- **Users** get faster, cheaper queries
- **Network** becomes more decentralized over time
- **Economics** are sustainable (70% to providers covers costs + profit)

All based on actual Solana query fees (0.0001 SOL), real infrastructure costs, and proven cache/RPC technology.


## What is WHISTLE?
A decentralized RPC infrastructure for Solana that allows anyone to earn SOL by serving blockchain queries.

## How It Works

### 1. Staking System
- **Stake WHISTLE tokens** → Get access tokens (1:1 ratio)
- **Access tokens** = Query credits for using the network
- **Minimum stake**: 100 WHISTLE
- **Cooldown period** for unstaking to prevent abuse

### 2. Two Ways to Provide & Earn

#### Option A: Cache Node (Easy - Anyone Can Do This)
**Requirements:**
- 2GB RAM, 10GB storage
- Home PC or $6/month VPS
- Docker installed
- No staking required

**How it works:**
- Cache popular RPC responses (balances, token data)
- Serve cached data ultra-fast (5-10ms)
- Forward cache misses to full nodes
- Earn 0.00007 SOL per query served

**What you cache:**
- Account balances (5-10 sec cache)
- Token metadata (60 sec cache)
- Transaction history (30 sec cache)
- Static data (5 min cache)

#### Option B: Full Node (Advanced - Powerful Machines)
**Requirements:**
- 256GB+ RAM, 2TB+ NVMe SSD
- 1+ Gbps internet
- Dedicated server ($100-500/month)
- Run actual Solana validator

**How it works:**
- Run Solana validator (participate in gossip network)
- Index blockchain data to PostgreSQL
- Serve ALL RPC methods directly
- Provide authoritative, fresh data
- Earn 0.00007 SOL per query served

**Full node stack:**
- Solana Validator (sync via gossip)
- Rust Indexer (blockchain → database)
- PostgreSQL (indexed data)
- Node.js API (RPC endpoint)

### 3. Query Flow

**When User Makes RPC Request:**
1. Request hits Coordinator
2. Coordinator checks query type
3. Routes to best provider based on:
   - Query type (cacheable or not)
   - Provider location (lowest latency)
   - Provider health/reputation

**Three Scenarios:**

**Cache Hit (Fast):**
- User → Coordinator → Cache Node
- Cache node has data in memory
- Returns in 5-10ms
- Cache node earns 0.00007 SOL

**Cache Miss (Medium):**
- User → Coordinator → Cache Node
- Cache node doesn't have data
- Forwards to Full Node
- Caches response for next time
- Returns in 50-200ms
- Full node earns 0.00007 SOL

**Fresh Data Required (Direct):**
- User → Coordinator → Full Node
- Queries requiring latest state (transactions, confirmations)
- Bypasses cache entirely
- Full node earns 0.00007 SOL

### 4. Payment Distribution (Per Query)

**User pays: 0.0001 SOL per query**

**Smart contract splits it:**
- 70% (0.00007 SOL) → Provider who served the query
- 20% (0.00002 SOL) → Bonus pool for top performers
- 5% (0.000005 SOL) → Treasury (network development)
- 5% (0.000005 SOL) → Stakers (proportional distribution)

### 5. Provider Earnings

**Cache Node Reality:**
- Serves: 10,000-50,000 queries/day
- Revenue: 0.7-3.5 SOL/day
- Monthly: 21-105 SOL
- Depends on: uptime, location, cache hit rate

**Full Node Reality:**
- Serves: 100,000-500,000 queries/day
- Revenue: 7-35 SOL/day
- Monthly: 210-1,050 SOL
- Higher because handles all query types

### 6. Smart Contract Functions

**For Stakers:**
- `stake()` - Lock WHISTLE tokens
- `unstake()` - Withdraw after cooldown
- `claimStakerRewards()` - Claim 5% share

**For Providers:**
- `registerProvider()` - Register wallet + endpoint
- `recordHeartbeat()` - Prove you're online
- `claimProviderEarnings()` - Withdraw your 70% share

**Automatic:**
- `processQueryPayment()` - Splits fees on each query
- `distributeBonus()` - Monthly to top 20% performers

### 7. Decentralization Path

**Phase 1** (Current): Centralized coordinator for routing
**Phase 2**: Multi-region coordinators for redundancy
**Phase 3**: Coordinator network with consensus
**Phase 4**: Fully on-chain routing via Solana programs

### 8. Technical Stack

**Smart Contract:** Rust (Solana program)
**Cache Nodes:** Node.js + Docker + In-memory cache
**Full Nodes:** Solana validator + Rust indexer + PostgreSQL + Node.js API
**Coordinator:** Node.js + WebSocket + Redis

### 9. Why This Works

**For Users:**
- Faster queries (5ms cached vs 200ms direct)
- Lower cost (shared infrastructure)
- Better uptime (multiple providers)

**For Cache Node Operators:**
- Low barrier to entry (home PC works)
- Passive income while PC is on
- No blockchain expertise needed

**For Full Node Operators:**
- Higher revenue potential
- Direct participation in Solana network
- Serve all query types

**For The Network:**
- Decentralized (no single point of failure)
- Geographic distribution (lower latency)
- Economically sustainable (fees cover costs + profit)

### 10. Key Differences: Cache vs Full Node

| Feature | Cache Node | Full Node |
|---------|-----------|-----------|
| **Cost** | $0-20/month | $100-500/month |
| **RAM** | 2GB | 256GB+ |
| **Storage** | 10GB | 2TB+ NVMe |
| **Query Types** | Cacheable only | All types |
| **Latency** | 5-10ms | 50-200ms |
| **Setup** | 5 minutes | Hours/Days |
| **Technical Skill** | None (Docker) | Advanced |
| **Revenue** | 21-105 SOL/month | 210-1,050 SOL/month |
| **Blockchain Sync** | No | Yes (gossip network) |

## Summary

WHISTLE Network creates a decentralized RPC infrastructure where:
- **Anyone** can run a cache node and earn SOL with minimal resources
- **Advanced users** can run full nodes for higher earnings
- **Users** get faster, cheaper queries
- **Network** becomes more decentralized over time
- **Economics** are sustainable (70% to providers covers costs + profit)

All based on actual Solana query fees (0.0001 SOL), real infrastructure costs, and proven cache/RPC technology.
